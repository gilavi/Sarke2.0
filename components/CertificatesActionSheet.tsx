// CertificatesActionSheet — manage equipment certificates for an inspection.
//
// Two internal views (state-driven, no react-navigation):
//   - 'list':  rows of attachments with photo-status pill + "+ დამატება" CTA
//   - 'edit':  type chips (presets + სხვა) + №number input + 16:9 photo upload
//
// Mounted via BottomSheet's `content` prop; saving triggers `onChanged`
// so the result screen can rebuild the live PDF preview.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { FloatingLabelInput } from './inputs/FloatingLabelInput';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from './primitives/A11yText';
import { Button } from './ui';
import { SheetLayout } from './SheetLayout';
import { inspectionAttachmentsApi } from '../lib/services';
import { ATTACHMENT_TYPE_PRESETS, type InspectionAttachment } from '../types/models';
import { useTheme } from '../lib/theme';
import { useToast } from '../lib/toast';
import { friendlyError } from '../lib/errorMap';
import { haptic } from '../lib/haptics';
import { getStorageImageDisplayUrl } from '../lib/imageUrl';
import { STORAGE_BUCKETS } from '../lib/supabase';

interface Props {
  inspectionId: string;
  onClose: () => void;
  /** Fired after each successful save/delete so callers can refetch + rebuild preview. */
  onChanged: () => void;
}

type SheetView = { kind: 'list' } | { kind: 'edit'; existing?: InspectionAttachment };

export function CertificatesActionSheet({ inspectionId, onClose, onChanged }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const toast = useToast();
  const [view, setView] = useState<SheetView>({ kind: 'list' });
  const [items, setItems] = useState<InspectionAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await inspectionAttachmentsApi.listByInspection(inspectionId);
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
      <CertEditView
        inspectionId={inspectionId}
        existing={view.existing}
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

  const header = { title: 'სერტიფიკატები', onClose };

  return (
    <SheetLayout
      header={header}
      footer={
        <Button
          title="+ სერტიფიკატის დამატება"
          variant="ghost"
          onPress={() => setView({ kind: 'edit' })}
        />
      }
      maxHeightRatio={0.85}
    >
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>სერტიფიკატი ჯერ არ დამატებულა</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {items.map(item => (
            <CertRow
              key={item.id}
              item={item}
              styles={styles}
              theme={theme}
              onPress={() => setView({ kind: 'edit', existing: item })}
            />
          ))}
        </View>
      )}
    </SheetLayout>
  );
}

function CertRow({
  item,
  styles,
  theme,
  onPress,
}: {
  item: InspectionAttachment;
  styles: ReturnType<typeof createStyles>;
  theme: any;
  onPress: () => void;
}) {
  const hasPhoto = !!item.photo_path;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.cert_type}
          {item.cert_number ? ` №${item.cert_number}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons
            name={hasPhoto ? 'checkmark-circle' : 'close-circle-outline'}
            size={14}
            color={hasPhoto ? theme.colors.accent : theme.colors.inkFaint}
          />
          <Text
            style={[
              styles.rowMeta,
              { color: hasPhoto ? theme.colors.accent : theme.colors.inkFaint },
            ]}
          >
            {hasPhoto ? '✓ ფოტო' : 'ფოტო არ არის'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
    </Pressable>
  );
}

function CertEditView({
  inspectionId,
  existing,
  onBack,
  onSaved,
  onDeleted,
  styles,
}: {
  inspectionId: string;
  existing?: InspectionAttachment;
  onBack: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { theme } = useTheme();
  const toast = useToast();
  const [type, setType] = useState<string>(existing?.cert_type ?? ATTACHMENT_TYPE_PRESETS[0]);
  const [customType, setCustomType] = useState<string>(
    existing && !ATTACHMENT_TYPE_PRESETS.includes(existing.cert_type as any)
      ? existing.cert_type
      : '',
  );
  const isCustom = !ATTACHMENT_TYPE_PRESETS.includes(type as any);
  const [number, setNumber] = useState(existing?.cert_number ?? '');
  const [photoPath, setPhotoPath] = useState<string | null>(existing?.photo_path ?? null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | null>(null);

  // Resolve remote storage path → display URL (signed) for preview.
  useEffect(() => {
    let cancelled = false;
    setResolvedPhotoUrl(null);
    if (photoUri) {
      // local pick — render directly
      setResolvedPhotoUrl(photoUri);
      return;
    }
    if (!photoPath) return;
    (async () => {
      try {
        const url = await getStorageImageDisplayUrl(STORAGE_BUCKETS.certificates, photoPath);
        if (!cancelled) setResolvedPhotoUrl(url);
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoPath, photoUri]);

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error('გალერეაზე წვდომა სავალდებულოა');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (res.canceled || !res.assets?.[0]) return;
    setPhotoUri(res.assets[0].uri);
  }, [toast]);

  const save = useCallback(async () => {
    const finalType = isCustom ? customType.trim() : type;
    if (!finalType) {
      toast.error('აირჩიე ან ჩაწერე სერტიფიკატის ტიპი');
      return;
    }
    setBusy(true);
    try {
      let uploadedPath: string | null | undefined = undefined;
      if (photoUri) {
        // Local pick — upload to storage.
        uploadedPath = await inspectionAttachmentsApi.uploadPhoto({
          inspectionId,
          fileUri: photoUri,
        });
      }
      if (existing) {
        await inspectionAttachmentsApi.update(existing.id, {
          certType: finalType,
          certNumber: number.trim() || null,
          ...(uploadedPath !== undefined ? { photoPath: uploadedPath } : {}),
        });
      } else {
        await inspectionAttachmentsApi.create({
          inspectionId,
          certType: finalType,
          certNumber: number.trim() || null,
          photoPath: uploadedPath ?? null,
        });
      }
      haptic.success();
      onSaved();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }, [type, customType, isCustom, number, photoUri, existing, inspectionId, onSaved, toast]);

  const remove = useCallback(() => {
    if (!existing) return;
    Alert.alert('წაიშალოს?', 'სერტიფიკატის წაშლა შეუქცევადია', [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await inspectionAttachmentsApi.remove(existing.id);
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
  }, [existing, onDeleted, toast]);

  const header = (
    <View style={styles.editHeader}>
      <Pressable onPress={onBack} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="chevron-back" size={20} color={theme.colors.accent} />
        <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 15 }}>სერტიფიკატები</Text>
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
      footer={<Button title="შენახვა" onPress={save} loading={busy} disabled={busy} />}
      maxHeightRatio={0.92}
    >
      <Text style={styles.fieldLabel}>ტიპი</Text>
      <View style={styles.chipsWrap}>
        {ATTACHMENT_TYPE_PRESETS.map(preset => (
          <Pressable
            key={preset}
            onPress={() => setType(preset)}
            style={[
              styles.chip,
              type === preset && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
            ]}
          >
            <Text style={[styles.chipText, type === preset && { color: theme.colors.accent }]}>
              {preset}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setType(customType || 'სხვა')}
          style={[
            styles.chip,
            isCustom && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
          ]}
        >
          <Text style={[styles.chipText, isCustom && { color: theme.colors.accent }]}>სხვა</Text>
        </Pressable>
      </View>
      {isCustom ? (
        <FloatingLabelInput
          label="სერტიფიკატის ტიპი"
          value={customType}
          onChangeText={text => {
            setCustomType(text);
            setType(text || 'სხვა');
          }}
        />
      ) : null}

      <FloatingLabelInput
        label="ნომერი"
        value={number}
        onChangeText={setNumber}
        keyboardType="number-pad"
      />

      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>ფოტო (16:9)</Text>
      <Pressable onPress={pickPhoto} style={styles.photoSlot}>
        {resolvedPhotoUrl ? (
          <Image source={{ uri: resolvedPhotoUrl }} style={styles.photoPreview} contentFit="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={28} color={theme.colors.inkFaint} />
            <Text style={{ color: theme.colors.inkSoft, fontSize: 13, marginTop: 6 }}>
              ფოტოს ატვირთვა
            </Text>
          </View>
        )}
      </Pressable>
    </SheetLayout>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    loadingBox: { padding: 32, alignItems: 'center' },
    emptyText: { textAlign: 'center', color: theme.colors.inkSoft, paddingVertical: 24 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.subtleSurface,
    },
    rowTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.ink },
    rowMeta: { fontSize: 12, fontWeight: '600' },
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
    input: {
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.colors.ink,
      backgroundColor: theme.colors.surface,
    },
    photoSlot: {
      aspectRatio: 16 / 9,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.subtleSurface,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      borderStyle: 'dashed',
    },
    photoPreview: { width: '100%', height: '100%' },
    photoPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
