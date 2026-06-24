import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { Paperclip, X } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { IconButton } from '../primitives/IconButton';
import { useTheme, type Theme } from '../../lib/theme';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { a11y } from '../../lib/accessibility';

export interface QualDocProps {
  photoPath?: string | null;
  onAdd: () => void;
  onDelete: () => void;
  label?: string;
}

export function QualDoc({
  photoPath,
  onAdd,
  onDelete,
  label,
}: QualDocProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const [uri, setUri] = useState('');

  const resolvedLabel = label ?? t('inspections.qualDocLabel');

  useEffect(() => {
    if (!photoPath) { setUri(''); return; }
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, photoPath)
      .then(u => { if (!cancelled) setUri(u); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [photoPath]);

  if (photoPath && uri) {
    return (
      <View style={styles.photoContainer}>
        <Image source={{ uri }} style={styles.photo} contentFit="cover" transition={200} />
        <IconButton
          icon={X}
          onPress={onDelete}
          a11yLabel={t('generalEquipment.deletePhotoA11y')}
          variant="overlay"
          size="md"
          style={styles.deleteBtn}
        />
      </View>
    );
  }

  return (
    <Pressable
      style={styles.placeholder}
      onPress={onAdd}
      {...a11y(t('inspections.addDocPhoto'), resolvedLabel, 'button')}
    >
      <Paperclip size={28} color={theme.colors.inkSoft} strokeWidth={1.5} />
      <Text style={styles.placeholderLabel}>{resolvedLabel}</Text>
      <Text style={styles.placeholderHint}>{t('inspections.takePhoto')}</Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    photoContainer: {
      width: '100%',
      height: 160,
      borderRadius: 12,
      overflow: 'hidden',
    },
    photo: { width: '100%', height: '100%' },
    deleteBtn: { position: 'absolute', top: 8, right: 8 },
    placeholder: {
      width: '100%',
      height: 120,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: theme.colors.subtleSurface,
    },
    placeholderLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
      textAlign: 'center',
    },
    placeholderHint: { fontSize: 11, color: theme.colors.inkFaint },
  });
}
