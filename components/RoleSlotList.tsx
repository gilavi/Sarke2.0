import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from './primitives/A11yText';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useBottomSheet } from './BottomSheet';
import { RoleSlotSheet, type RoleSlotDetails } from './RoleSlotSheet';
import { SignatureCanvas } from './SignatureCanvas';
import { theme } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { a11y } from '../lib/accessibility';
import { useToast } from '../lib/toast';
import { friendlyError } from '../lib/errorMap';
import { uploadSignature } from '../lib/signatures';
import { getStorageImageDataUrl } from '../lib/imageUrl';
import { STORAGE_BUCKETS } from '../lib/supabase';
import { CREW_ROLE_KEYS, CREW_ROLE_LABEL } from '../types/models';
import type { CrewMember, CrewRoleKey } from '../types/models';

export interface InspectorRow {
  name: string;
  role: string;
  /** Storage path in the `signatures` bucket; renders as the row thumbnail. */
  signaturePath?: string | null;
}

interface Props {
  projectId: string;
  inspector: InspectorRow | null;
  crew: CrewMember[];
  onChange: (next: CrewMember[]) => void | Promise<void>;
}

interface PendingSignature {
  roleKey: CrewRoleKey;
  memberId: string;
  name: string;
  roleLabel: string;
}

/**
 * Fixed list of role slots (expert / xaracho_supervisor / xaracho_assembler /
 * other). Tapping a slot opens a 2-phase add/edit flow:
 *
 *   1. Bottom-sheet collects name (+ custom role for `other`).
 *   2. After submit, the sheet dismisses and the full-screen `SignatureCanvas`
 *      modal opens. Rendering the signature WebView inside the animated
 *      bottom-sheet Modal crashed on iOS, so the two phases use separate
 *      Modal stacks.
 *
 * Backing out of signature reopens the sheet with prior input preserved.
 */
export function RoleSlotList({ projectId, inspector, crew, onChange }: Props) {
  const showSheet = useBottomSheet();
  const toast = useToast();
  const [pending, setPending] = useState<PendingSignature | null>(null);
  const [busy, setBusy] = useState(false);
  // Cache of resolved storage-path → data-URL for the signature thumb shown
  // in each row. Keyed by storage path so the same signature isn't fetched
  // twice if two members happen to point at the same blob.
  const [sigThumbs, setSigThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const inspectorPath = inspector?.signaturePath ?? null;
    const missing = [
      ...crew.map(m => m.signature),
      inspectorPath,
    ].filter((p): p is string => !!p && !(p in sigThumbs));
    if (missing.length === 0) return;
    void Promise.all(
      missing.map(async path => {
        try {
          const url = await getStorageImageDataUrl(STORAGE_BUCKETS.signatures, path);
          return [path, url] as const;
        } catch {
          return [path, ''] as const;
        }
      }),
    ).then(entries => {
      if (cancelled) return;
      setSigThumbs(prev => {
        const next = { ...prev };
        for (const [k, v] of entries) next[k] = v;
        return next;
      });
    });
    return () => { cancelled = true; };
    // sigThumbs intentionally omitted: the effect reads it via the closure to
    // skip already-fetched paths, but listing it as a dep would re-fire after
    // every successful fetch (setSigThumbs allocates a new object reference)
    // and re-run Promise.all in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crew, inspector?.signaturePath]);
  // Last-submitted details per slot, so cancel→reopen can prefill.
  const lastDetails = useRef<Record<CrewRoleKey, RoleSlotDetails | undefined>>({
    expert: undefined,
    xaracho_supervisor: undefined,
    xaracho_assembler: undefined,
    other: undefined,
  });

  const findInSlot = (key: CrewRoleKey): CrewMember | undefined =>
    crew.find(m => m.roleKey === key);

  const upsert = (next: CrewMember) => {
    const idx = crew.findIndex(m => m.id === next.id);
    // On edit, keep the existing position. On add, put the new member at the
    // top so the most recently added is always visible first.
    const out = idx >= 0
      ? crew.map(m => (m.id === next.id ? next : m))
      : [next, ...crew.filter(m => m.roleKey !== next.roleKey)];
    void onChange(out);
  };

  const removeWithConfirm = (member: CrewMember) => {
    Alert.alert(
      'წაშლა?',
      `მონაწილე "${member.name}" წაიშლება ამ პროექტიდან.`,
      [
        { text: 'გაუქმება', style: 'cancel' },
        {
          text: 'წაშლა',
          style: 'destructive',
          onPress: () => {
            haptic.medium();
            void onChange(crew.filter(m => m.id !== member.id));
          },
        },
      ],
    );
  };

  // Wait long enough for the bottom sheet's iOS slide-down animation to fully
  // tear down before mounting the SignatureCanvas Modal — stacking two Modals
  // in the same frame leaves the second one invisible on iOS.
  const SHEET_DISMISS_MS = 350;

  const openDetailsSheet = (roleKey: CrewRoleKey) => {
    haptic.light();
    const existing = findInSlot(roleKey);
    const cached = lastDetails.current[roleKey];
    const initialName = cached?.name ?? existing?.name ?? '';
    const initialRoleLabel = cached?.role
      ?? (existing && existing.roleKey === 'other' ? existing.role : undefined);

    showSheet({
      content: ({ dismiss }) => (
        <RoleSlotSheet
          roleKey={roleKey}
          mode="create"
          initialName={initialName}
          initialRoleLabel={initialRoleLabel}
          onSubmit={details => {
            lastDetails.current[roleKey] = details;
            dismiss();
            setTimeout(() => {
              setPending({
                roleKey,
                memberId: existing?.id ?? cryptoUuid(),
                name: details.name,
                roleLabel: details.role,
              });
            }, SHEET_DISMISS_MS);
          }}
          onCancel={dismiss}
        />
      ),
    });
  };

  /**
   * Edit-only path for an existing member. Saves new name / custom role
   * without forcing a re-sign. The inline "ხელმოწერა ხელახლა" link routes
   * back through the create-style signature flow when the user wants to
   * replace the signature too.
   */
  const openEditSheet = (member: CrewMember) => {
    haptic.light();
    showSheet({
      content: ({ dismiss }) => (
        <RoleSlotSheet
          roleKey={member.roleKey}
          mode="editDetails"
          initialName={member.name}
          initialRoleLabel={member.roleKey === 'other' ? member.role : undefined}
          onSubmit={details => {
            dismiss();
            upsert({ ...member, name: details.name, role: details.role });
            haptic.light();
            toast.success('შენახულია');
          }}
          onCancel={dismiss}
          onResign={() => {
            // Cache the in-flight edits so the create-flow sheet (re-opened
            // below if the user cancels signature) starts pre-filled.
            lastDetails.current[member.roleKey] = {
              name: member.name,
              role: member.role,
            };
            dismiss();
            setTimeout(() => {
              setPending({
                roleKey: member.roleKey,
                memberId: member.id,
                name: member.name,
                roleLabel: member.role,
              });
            }, SHEET_DISMISS_MS);
          }}
        />
      ),
    });
  };

  const onSignatureCancel = () => {
    const p = pending;
    setPending(null);
    if (!p) return;
    // Reopen the details sheet with the just-typed values preserved.
    setTimeout(() => openDetailsSheet(p.roleKey), SHEET_DISMISS_MS);
  };

  const onSignatureConfirm = async (base64: string) => {
    if (!pending) return;
    setBusy(true);
    try {
      const path = `project/${projectId}/crew-${pending.roleKey}-${pending.memberId}-${Date.now()}.png`;
      const { pending: queued } = await uploadSignature(path, base64);
      if (queued) throw new Error('ხელმოწერის ატვირთვა ვერ მოხერხდა');
      upsert({
        id: pending.memberId,
        roleKey: pending.roleKey,
        name: pending.name,
        role: pending.roleLabel,
        signature: path,
      });
      lastDetails.current[pending.roleKey] = undefined;
      haptic.medium();
      toast.success('დაემატა');
      setPending(null);
    } catch (e) {
      toast.error(friendlyError(e, 'ხელმოწერა ვერ შეინახა'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {inspector ? (
        <View style={styles.row}>
          {inspector.signaturePath && sigThumbs[inspector.signaturePath] ? (
            <View style={[styles.avatar, styles.sigAvatar]}>
              <Image
                source={{ uri: sigThumbs[inspector.signaturePath] }}
                style={styles.sigAvatarImg}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.colors.accentSoft }]}>
              <Ionicons name="shield-checkmark" size={18} color={theme.colors.accent} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{inspector.name}</Text>
            <Text style={styles.role}>{inspector.role}</Text>
          </View>
          <View style={styles.lockedChip}>
            <Ionicons name="lock-closed" size={10} color={theme.colors.inkSoft} />
          </View>
        </View>
      ) : null}

      {/* Filled members first, in the order they were added. */}
      {crew.map(member => {
        const label = member.role || CREW_ROLE_LABEL[member.roleKey];
        return (
          <Swipeable
            key={member.id}
            renderRightActions={() => (
              <Pressable
                onPress={() => removeWithConfirm(member)}
                style={styles.swipeDelete}
                {...a11y('წაშლა', 'მონაწილის წაშლა', 'button')}
              >
                <Ionicons name="trash" size={18} color={theme.colors.white} />
              </Pressable>
            )}
            overshootRight={false}
          >
            <View style={styles.row}>
              {member.signature && sigThumbs[member.signature] ? (
                <View style={[styles.avatar, styles.sigAvatar]}>
                  <Image
                    source={{ uri: sigThumbs[member.signature] }}
                    style={styles.sigAvatarImg}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.colors.subtleSurface }]}>
                  <Ionicons name="person" size={18} color={theme.colors.inkSoft} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{member.name}</Text>
                <Text style={styles.role}>{label}</Text>
              </View>
              <Pressable
                onPress={() => openEditSheet(member)}
                hitSlop={6}
                style={styles.actionBtn}
                {...a11y('რედაქტირება', 'მონაწილის რედაქტირება', 'button')}
              >
                <Ionicons name="pencil" size={16} color={theme.colors.inkSoft} />
              </Pressable>
              <Pressable
                onPress={() => removeWithConfirm(member)}
                hitSlop={6}
                style={styles.actionBtn}
                {...a11y('წაშლა', 'მონაწილის წაშლა', 'button')}
              >
                <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
              </Pressable>
            </View>
          </Swipeable>
        );
      })}

      {/* Empty role slots — only roles with no member yet, shown after filled rows. */}
      {CREW_ROLE_KEYS.filter(rk => !findInSlot(rk)).map(roleKey => {
        const label = CREW_ROLE_LABEL[roleKey];
        return (
          <Pressable
            key={roleKey}
            onPress={() => openDetailsSheet(roleKey)}
            style={({ pressed }) => [styles.emptySlot, pressed && { opacity: 0.7 }]}
            {...a11y(label, 'როლის შემვსების დამატება', 'button')}
          >
            <View style={[styles.avatar, { backgroundColor: theme.colors.subtleSurface }]}>
              <Ionicons name="person-add" size={18} color={theme.colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyLabel}>{label}</Text>
              <Text style={styles.emptyHint}>შეეხეთ დასამატებლად</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
        );
      })}

      <SignatureCanvas
        visible={!!pending && !busy}
        personName={pending?.name ?? ''}
        onCancel={onSignatureCancel}
        onConfirm={onSignatureConfirm}
      />
    </View>
  );
}

function cryptoUuid(): string {
  const g = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (g?.randomUUID) return g.randomUUID();
  return `crew_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 10,
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.hairline,
    backgroundColor: theme.colors.card,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigAvatar: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  sigAvatarImg: {
    width: 32,
    height: 32,
  },
  name: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
  role: { fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 },
  emptyLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
  emptyHint: { fontSize: 11, color: theme.colors.inkFaint, marginTop: 2 },
  lockedChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  signedChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDelete: {
    width: 64,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    marginLeft: 6,
  },
});
