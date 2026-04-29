import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { CREW_ROLE_KEYS, CREW_ROLE_LABEL } from '../types/models';
import type { CrewMember, CrewRoleKey } from '../types/models';

export interface InspectorRow {
  name: string;
  role: string;
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
    const out = idx >= 0
      ? crew.map(m => (m.id === next.id ? next : m))
      : [...crew.filter(m => m.roleKey !== next.roleKey), next];
    void onChange(out);
  };

  const remove = (id: string) => {
    haptic.medium();
    void onChange(crew.filter(m => m.id !== id));
  };

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
          initialName={initialName}
          initialRoleLabel={initialRoleLabel}
          onSubmit={details => {
            lastDetails.current[roleKey] = details;
            dismiss();
            // Defer to next frame so the sheet's Modal fully tears down before
            // we mount the SignatureCanvas Modal — stacking two Modals in the
            // same frame is what triggered the iOS crash.
            requestAnimationFrame(() => {
              setPending({
                roleKey,
                memberId: existing?.id ?? cryptoUuid(),
                name: details.name,
                roleLabel: details.role,
              });
            });
          }}
          onCancel={dismiss}
        />
      ),
    });
  };

  const onSignatureCancel = () => {
    const p = pending;
    setPending(null);
    if (!p) return;
    // Reopen the details sheet with the just-typed values preserved.
    requestAnimationFrame(() => openDetailsSheet(p.roleKey));
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
          <View style={[styles.avatar, { backgroundColor: theme.colors.accentSoft }]}>
            <Ionicons name="shield-checkmark" size={18} color={theme.colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{inspector.name}</Text>
            <Text style={styles.role}>{inspector.role}</Text>
          </View>
          <View style={styles.lockedChip}>
            <Ionicons name="lock-closed" size={10} color={theme.colors.inkSoft} />
          </View>
        </View>
      ) : null}

      {CREW_ROLE_KEYS.map(roleKey => {
        const member = findInSlot(roleKey);
        const label = member?.role || CREW_ROLE_LABEL[roleKey];
        if (!member) {
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
        }
        return (
          <Swipeable
            key={roleKey}
            renderRightActions={() => (
              <Pressable
                onPress={() => remove(member.id)}
                style={styles.swipeDelete}
                {...a11y('წაშლა', 'მონაწილის წაშლა', 'button')}
              >
                <Ionicons name="trash" size={18} color={theme.colors.white} />
              </Pressable>
            )}
            overshootRight={false}
          >
            <Pressable
              onPress={() => openDetailsSheet(roleKey)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              {...a11y(`${member.name}, ${label}`, 'რედაქტირება', 'button')}
            >
              <View style={[styles.avatar, { backgroundColor: theme.colors.subtleSurface }]}>
                <Ionicons name="person" size={18} color={theme.colors.inkSoft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{member.name}</Text>
                <Text style={styles.role}>{label}</Text>
              </View>
              {member.signature ? (
                <View style={styles.signedChip}>
                  <Ionicons name="checkmark" size={11} color={theme.colors.white} />
                </View>
              ) : null}
            </Pressable>
          </Swipeable>
        );
      })}

      {!!pending && !busy && (
        <SignatureCanvas
          personName={pending?.name ?? ''}
          onCancel={onSignatureCancel}
          onConfirm={onSignatureConfirm}
        />
      )}
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
