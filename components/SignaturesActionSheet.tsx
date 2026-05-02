// SignaturesActionSheet — capture / edit signatures for an inspection.
//
// Two internal views:
//   - 'list':  rows of participants (one per signer_role + any "other" rows)
//              showing tiny signature preview when signed
//   - 'edit':  name + role picker + canvas (or existing sig + clear/redo)
//
// Saving upserts a signature row keyed by (inspection_id, signer_role).
// `+ ხელმოწერის დამატება` opens an edit view with no existing row — the
// user picks any role not yet taken and signs.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { A11yText as Text } from './primitives/A11yText';
import { Button } from './ui';
import { SheetLayout } from './SheetLayout';
import { signaturesApi } from '../lib/services';
import { uploadSignature } from '../lib/signatures';
import type { SignatureRecord, SignerRole } from '../types/models';
import { SIGNER_ROLE_LABEL } from '../types/models';
import { useTheme } from '../lib/theme';
import { useToast } from '../lib/toast';
import { FloatingLabelInput } from './inputs/FloatingLabelInput';
import { friendlyError } from '../lib/errorMap';
import { haptic } from '../lib/haptics';
import { getStorageImageDataUrlStrict, getStorageImageDisplayUrl } from '../lib/imageUrl';
import { STORAGE_BUCKETS } from '../lib/supabase';

const ALL_ROLES: SignerRole[] = ['expert', 'xaracho_supervisor', 'xaracho_assembler', 'other'];

interface Props {
  inspectionId: string;
  /** The roles configured on the template — those become default rows even when no sig exists yet. */
  requiredRoles: SignerRole[];
  onClose: () => void;
  onChanged: () => void;
}

type SheetView = { kind: 'list' } | { kind: 'edit'; existing?: SignatureRecord; defaultRole?: SignerRole };

export function SignaturesActionSheet({ inspectionId, requiredRoles, onClose, onChanged }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const toast = useToast();
  const [view, setView] = useState<SheetView>({ kind: 'list' });
  const [items, setItems] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await signaturesApi.list(inspectionId);
      setItems(rows);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [inspectionId, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (view.kind === 'edit') {
    return (
      <SignatureEditView
        inspectionId={inspectionId}
        existing={view.existing}
        defaultRole={view.defaultRole}
        takenRoles={items.map(i => i.signer_role)}
        onBack={() => setView({ kind: 'list' })}
        onSaved={async () => {
          await reload();
          onChanged();
          setView({ kind: 'list' });
        }}
        onDeleted={async () => {
          await reload();
          onChanged();
          setView({ kind: 'list' });
        }}
        styles={styles}
      />
    );
  }

  // Build the participants list: required roles first (with stub entries for
  // ones that haven't been signed yet), then any extra signed rows.
  const byRole = new Map(items.map(s => [s.signer_role, s]));
  const orderedRoles: SignerRole[] = [];
  for (const r of requiredRoles) if (!orderedRoles.includes(r)) orderedRoles.push(r);
  for (const s of items) if (!orderedRoles.includes(s.signer_role)) orderedRoles.push(s.signer_role);

  const signedCount = items.filter(s => s.status === 'signed' && !!s.signature_png_url).length;
  const totalSlots = orderedRoles.length;

  const header = {
    title: `ხელმოწერები (${signedCount}/${totalSlots})`,
    onClose,
  };

  return (
    <SheetLayout
      header={header}
      footer={
        <Button
          title="+ ხელმოწერის დამატება"
          variant="ghost"
          onPress={() => setView({ kind: 'edit' })}
        />
      }
      maxHeightRatio={0.85}
    >
      {loading ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {orderedRoles.map(role => {
            const sig = byRole.get(role);
            return (
              <ParticipantRow
                key={role}
                role={role}
                sig={sig}
                styles={styles}
                theme={theme}
                onPress={() =>
                  setView({ kind: 'edit', existing: sig, defaultRole: role })
                }
              />
            );
          })}
        </View>
      )}
    </SheetLayout>
  );
}

function ParticipantRow({
  role,
  sig,
  styles,
  theme,
  onPress,
}: {
  role: SignerRole;
  sig?: SignatureRecord;
  styles: ReturnType<typeof createStyles>;
  theme: any;
  onPress: () => void;
}) {
  const isSigned = !!sig && sig.status === 'signed' && !!sig.signature_png_url;
  const name = sig?.full_name || sig?.person_name || SIGNER_ROLE_LABEL[role];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toLocaleUpperCase('ka-GE');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.avatar, { backgroundColor: isSigned ? theme.colors.accentSoft : theme.colors.subtleSurface }]}>
        <Text style={[styles.avatarText, { color: isSigned ? theme.colors.accent : theme.colors.inkSoft }]}>
          {initials || '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>{SIGNER_ROLE_LABEL[role]}</Text>
      </View>
      {isSigned && sig?.signature_png_url ? (
        <SigThumbnail path={sig.signature_png_url} styles={styles} />
      ) : (
        <Text style={styles.notSigned}>ხელმოუწერელია</Text>
      )}
      <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
    </Pressable>
  );
}

function SignatureEditView({
  inspectionId,
  existing,
  defaultRole,
  takenRoles,
  onBack,
  onSaved,
  onDeleted,
  styles,
}: {
  inspectionId: string;
  existing?: SignatureRecord;
  defaultRole?: SignerRole;
  takenRoles: SignerRole[];
  onBack: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { theme } = useTheme();
  const toast = useToast();
  const sigRef = useRef<SignatureViewRef>(null);

  const [name, setName] = useState(existing?.full_name ?? existing?.person_name ?? '');
  const [role, setRole] = useState<SignerRole>(existing?.signer_role ?? defaultRole ?? pickFreeRole(takenRoles));
  const [hasStroke, setHasStroke] = useState(false);
  const [resetCanvas, setResetCanvas] = useState(0); // bump to force re-mount
  const [busy, setBusy] = useState(false);
  const [resolvedSigUrl, setResolvedSigUrl] = useState<string | null>(null);

  // Fetch existing sig as data URL for display.
  useEffect(() => {
    let cancelled = false;
    setResolvedSigUrl(null);
    const path = existing?.signature_png_url;
    if (!path || existing?.status !== 'signed') return;
    if (path.startsWith('data:')) {
      setResolvedSigUrl(path);
      return;
    }
    (async () => {
      try {
        const url = await getStorageImageDataUrlStrict(STORAGE_BUCKETS.signatures, path);
        if (!cancelled) setResolvedSigUrl(url);
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [existing]);

  const showCanvas = !resolvedSigUrl;

  const save = useCallback(
    async (base64Png: string | null) => {
      if (!name.trim()) {
        toast.error('შეიყვანე სახელი');
        return;
      }
      // Either we got a fresh signature this session, or we kept the existing one.
      const keepingExisting = !base64Png && resolvedSigUrl && existing?.signature_png_url;
      if (!base64Png && !keepingExisting) {
        toast.error('დახაზე ხელმოწერა');
        return;
      }
      setBusy(true);
      try {
        let sigPath: string | null = existing?.signature_png_url ?? null;
        if (base64Png) {
          const cleaned = base64Png.replace(/^data:image\/\w+;base64,/, '');
          const path = `${inspectionId}/${role}-${Date.now()}.png`;
          const result = await uploadSignature(path, cleaned);
          if (result.pending) {
            throw new Error('ხელმოწერა ვერ აიტვირთა — შეამოწმე ინტერნეტი');
          }
          sigPath = result.path;
        }
        await signaturesApi.upsert({
          inspection_id: inspectionId,
          signer_role: role,
          full_name: name.trim(),
          phone: existing?.phone ?? null,
          position: existing?.position ?? null,
          signature_png_url: sigPath,
          status: 'signed',
          person_name: existing?.person_name ?? null,
        });
        haptic.success();
        onSaved();
      } catch (e) {
        toast.error(friendlyError(e));
      } finally {
        setBusy(false);
      }
    },
    [name, role, inspectionId, existing, resolvedSigUrl, onSaved, toast],
  );

  const handleConfirm = useCallback(() => {
    if (resolvedSigUrl) {
      // Keep existing — just save name/role.
      void save(null);
      return;
    }
    if (!hasStroke) {
      toast.error('დახაზე ხელმოწერა');
      return;
    }
    sigRef.current?.readSignature();
  }, [resolvedSigUrl, hasStroke, save, toast]);

  const remove = useCallback(() => {
    if (!existing) return;
    Alert.alert('წაიშალოს?', 'ხელმოწერა და მისი მონაცემები წაიშლება', [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await signaturesApi.remove(inspectionId, existing.signer_role);
            haptic.warn();
            onDeleted();
          } catch (e) {
            toast.error(friendlyError(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [existing, inspectionId, onDeleted, toast]);

  const clearCurrent = useCallback(() => {
    setResolvedSigUrl(null);
    setResetCanvas(n => n + 1);
    setHasStroke(false);
  }, []);

  const header = (
    <View style={styles.editHeader}>
      <Pressable onPress={onBack} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="chevron-back" size={20} color={theme.colors.accent} />
        <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 15 }}>ხელმოწერები</Text>
      </Pressable>
      {existing ? (
        <Pressable onPress={remove} hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <SheetLayout
      header={header}
      footer={
        <Button
          title="შენახვა"
          onPress={handleConfirm}
          loading={busy}
          disabled={busy || !name.trim()}
        />
      }
      maxHeightRatio={0.95}
    >
      <FloatingLabelInput
        label="სახელი"
        value={name}
        onChangeText={setName}
      />

      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>როლი</Text>
      <View style={styles.chipsWrap}>
        {ALL_ROLES.map(r => {
          const taken = takenRoles.includes(r) && r !== existing?.signer_role;
          const selected = r === role;
          return (
            <Pressable
              key={r}
              disabled={taken}
              onPress={() => setRole(r)}
              style={[
                styles.chip,
                selected && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
                taken && { opacity: 0.4 },
              ]}
            >
              <Text style={[styles.chipText, selected && { color: theme.colors.accent }]}>
                {SIGNER_ROLE_LABEL[r]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>ხელმოწერა</Text>

      {resolvedSigUrl ? (
        <View>
          <View style={styles.existingSigBox}>
            <Image source={{ uri: resolvedSigUrl }} style={{ width: '100%', height: 140 }} contentFit="contain" />
          </View>
          <Pressable onPress={clearCurrent} style={styles.redoBtn}>
            <Ionicons name="refresh" size={16} color={theme.colors.danger} />
            <Text style={styles.redoText}>გასუფთავება და თავიდან მოწერა</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.canvasBox}>
          <SignatureScreen
            key={resetCanvas}
            ref={sigRef}
            onOK={(sig: string) => {
              void save(sig);
            }}
            onBegin={() => setHasStroke(true)}
            descriptionText=""
            penColor="#000"
            backgroundColor="#fff"
            webStyle={`
              .m-signature-pad { box-shadow: none; border: none; height: 220px; }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { display: none; }
              body, html { height: 220px; margin: 0; }
            `}
          />
          <Text style={styles.canvasHint}>მოაწერეთ ხელი ქვემოთ</Text>
        </View>
      )}
    </SheetLayout>
  );
}

function SigThumbnail({ path, styles }: { path: string; styles: ReturnType<typeof createStyles> }) {
  const [uri, setUri] = useState(path.startsWith('data:') ? path : '');
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (path.startsWith('data:')) {
      setUri(path);
      return;
    }
    getStorageImageDisplayUrl(STORAGE_BUCKETS.signatures, path)
      .then(url => { if (!cancelled.current) setUri(url); })
      .catch(() => {});
    return () => { cancelled.current = true; };
  }, [path]);

  if (!uri) return null;
  return (
    <View style={styles.sigPreview}>
      <Image source={{ uri }} style={{ width: 48, height: 24 }} contentFit="contain" />
    </View>
  );
}

function pickFreeRole(taken: SignerRole[]): SignerRole {
  for (const r of ALL_ROLES) if (!taken.includes(r)) return r;
  return 'other';
}

function createStyles(theme: any) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.subtleSurface,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 13, fontWeight: '700' },
    rowTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.ink },
    rowMeta: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
    notSigned: {
      fontSize: 11,
      color: theme.colors.inkFaint,
      fontStyle: 'italic',
    },
    sigPreview: {
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      borderRadius: 6,
      padding: 4,
      backgroundColor: theme.colors.surface,
    },
    editHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.surface,
    },
    chipText: { fontSize: 13, color: theme.colors.ink, fontWeight: '600' },
    canvasBox: {
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      height: 240,
    },
    canvasHint: {
      position: 'absolute',
      bottom: 8,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 11,
      color: theme.colors.inkFaint,
    },
    existingSigBox: {
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      paddingVertical: 12,
    },
    redoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      marginTop: 6,
    },
    redoText: { color: theme.colors.danger, fontWeight: '600', fontSize: 13 },
  });
}
