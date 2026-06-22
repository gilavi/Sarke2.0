// Add / edit a single equipment certificate. Rendered as a full screen view
// (inside the /inspections/[id]/certificates route), NOT a modal — so the
// canonical /photo-picker route flow works and the keyboard never hides the
// Save button.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Camera, Trash2 } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { Button } from '../ui';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { HeaderBackButton } from '../HeaderBackButton';
import { inspectionAttachmentsApi } from '../../lib/services';
import { ATTACHMENT_TYPE_PRESETS, type InspectionAttachment } from '../../types/models';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { usePhotoPicker } from '../../hooks/usePhotoPicker';
import { friendlyError } from '../../lib/errorMap';
import { haptic } from '../../lib/haptics';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { a11y } from '../../lib/accessibility';

export function CertEditForm({
  inspectionId,
  existing,
  onBack,
  onSaved,
  onDeleted,
}: {
  inspectionId: string;
  existing?: InspectionAttachment;
  onBack: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const toast = useToast();
  const { pickPhotoWithAnnotation } = usePhotoPicker();

  const [type, setType] = useState<string>(existing?.cert_type ?? ATTACHMENT_TYPE_PRESETS[0]);
  const [customType, setCustomType] = useState<string>(
    existing && !ATTACHMENT_TYPE_PRESETS.includes(existing.cert_type as any) ? existing.cert_type : '',
  );
  const isCustom = !ATTACHMENT_TYPE_PRESETS.includes(type as any);
  const [number, setNumber] = useState(existing?.cert_number ?? '');
  const [photoPath] = useState<string | null>(existing?.photo_path ?? null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | null>(null);

  // Resolve remote storage path → signed display URL for preview.
  useEffect(() => {
    let cancelled = false;
    if (photoUri) {
      setResolvedPhotoUrl(photoUri);
      return;
    }
    setResolvedPhotoUrl(null);
    if (!photoPath) return;
    (async () => {
      try {
        const url = await imageForDisplay(STORAGE_BUCKETS.certificates, photoPath);
        if (!cancelled) setResolvedPhotoUrl(url);
      } catch {
        // best-effort preview
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoPath, photoUri]);

  // Canonical route-based picker — works because this is a real screen, not a
  // modal. skipAnnotate: certificate photos are documents, no markup needed.
  const pickPhoto = useCallback(async () => {
    const result = await pickPhotoWithAnnotation({ skipAnnotate: true });
    if (!result) return;
    setPhotoUri(result.uri);
  }, [pickPhotoWithAnnotation]);

  const save = useCallback(async () => {
    const finalType = isCustom ? customType.trim() : type;
    if (!finalType) {
      toast.error(t('qualifications.typeRequired'));
      return;
    }
    setBusy(true);
    try {
      let uploadedPath: string | null | undefined = undefined;
      if (photoUri) {
        uploadedPath = await inspectionAttachmentsApi.uploadPhoto({ inspectionId, fileUri: photoUri });
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
    Alert.alert(t('qualifications.deleteTitle'), t('qualifications.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
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

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <HeaderBackButton onPress={onBack} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {existing ? t('qualifications.editTitle') : t('qualifications.newCertTitle')}
        </Text>
        {existing ? (
          <Pressable onPress={remove} hitSlop={11} style={styles.headerAction} {...a11y(t('common.delete'), t('qualifications.deleteHint'), 'button')}>
            <Trash2 size={20} color={theme.colors.danger} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
        contentContainerStyle={styles.body}
      >
        <Text style={styles.fieldLabel}>{t('qualifications.typeLabel')}</Text>
        <View style={styles.chipsWrap}>
          {ATTACHMENT_TYPE_PRESETS.map(preset => (
            <Pressable
              key={preset}
              onPress={() => setType(preset)}
              style={[styles.chip, type === preset && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft }]}
              {...a11y(preset, t('qualifications.selectTypeHint'), 'radio')}
            >
              <Text style={[styles.chipText, type === preset && { color: theme.colors.accent }]}>{preset}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setType(customType || t('qualifications.other'))}
            style={[styles.chip, isCustom && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft }]}
            {...a11y(t('qualifications.other'), t('qualifications.other'), 'radio')}
          >
            <Text style={[styles.chipText, isCustom && { color: theme.colors.accent }]}>{t('qualifications.other')}</Text>
          </Pressable>
        </View>
        {isCustom ? (
          <FloatingLabelInput
            label={t('qualifications.certTypeInput')}
            value={customType}
            onChangeText={text => {
              setCustomType(text);
              setType(text || t('qualifications.other'));
            }}
          />
        ) : null}

        <FloatingLabelInput label={t('qualifications.numberLabel')} value={number} onChangeText={setNumber} keyboardType="number-pad" />

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{t('qualifications.photoLabel16x9')}</Text>
        <Pressable onPress={pickPhoto} style={styles.photoSlot} {...a11y(t('qualifications.photoUploadBtn'), t('qualifications.photoUploadBtn'), 'button')}>
          {resolvedPhotoUrl ? (
            <Image source={{ uri: resolvedPhotoUrl }} style={styles.photoPreview} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Camera size={28} color={theme.colors.inkFaint} strokeWidth={1.5} />
              <Text style={{ color: theme.colors.inkSoft, fontSize: 13, marginTop: 6 }}>{t('qualifications.photoUploadBtn')}</Text>
            </View>
          )}
        </Pressable>
      </KeyboardAwareScrollView>

      <View style={styles.footer}>
        <Button title={t('common.save')} onPress={save} loading={busy} disabled={busy} />
      </View>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.ink },
    headerAction: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    headerSpacer: { width: 38 },
    body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 12 },
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
    photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
  });
}
