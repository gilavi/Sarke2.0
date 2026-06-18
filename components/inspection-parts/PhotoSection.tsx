import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Camera, X } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { IconButton } from '../primitives/IconButton';
import { useTheme, type Theme } from '../../lib/theme';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { a11y } from '../../lib/accessibility';

export interface PhotoSectionProps {
  photoPaths: string[];
  onAdd: () => void;
  onDelete: (path: string) => void;
  title?: string;
  maxPhotos?: number;
  hint?: string;
}

export function PhotoSection({
  photoPaths,
  onAdd,
  onDelete,
  title,
  maxPhotos,
  hint,
}: PhotoSectionProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const canAdd = maxPhotos === undefined || photoPaths.length < maxPhotos;

  return (
    <View style={styles.container}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {photoPaths.map(path => (
          <PhotoThumb key={path} path={path} onDelete={() => onDelete(path)} />
        ))}
        {canAdd && (
          <Pressable
            style={styles.addBtn}
            onPress={onAdd}
            {...a11y('ფოტოს დამატება', 'ფოტოს გადაღება ან ბიბლიოთეკიდან', 'button')}
          >
            <Camera size={20} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={styles.addLabel}>+ ფოტო</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

// ── Photo thumbnail ──────────────────────────────────────────────────────────

const PhotoThumb = memo(function PhotoThumb({
  path,
  onDelete,
}: {
  path: string;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const [uri, setUri] = useState('');

  useEffect(() => {
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, path)
      .then(u => { if (!cancelled) setUri(u); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path]);

  return (
    <View style={styles.thumb}>
      <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" transition={200} />
      <IconButton
        icon={X}
        onPress={onDelete}
        a11yLabel="ფოტოს წაშლა"
        variant="overlay"
        size="sm"
        style={styles.thumbDelete}
      />
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    container: { gap: 6 },
    title: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    hint: { fontSize: 11, color: theme.colors.inkFaint, fontStyle: 'italic' },
    strip: { gap: 8, paddingVertical: 4 },
    addBtn: {
      width: 64,
      height: 64,
      borderRadius: 8,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    addLabel: { fontSize: 11, color: theme.colors.inkSoft },
    thumb: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
    thumbImg: { width: 64, height: 64 },
    thumbDelete: { position: 'absolute', top: 2, right: 2 },
  });
}
