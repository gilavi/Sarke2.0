import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '../../lib/theme';

import { haptic } from '../../lib/haptics';
import { a11y, useAccessibilitySettings } from '../../lib/accessibility';
import { PressableScale } from '../animations/PressableScale';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import type { AnswerPhoto } from '../../types/models';

interface PhotoThumbsProps {
  photos: AnswerPhoto[];
  onView: (photo: AnswerPhoto) => void;
  onDelete: (photo: AnswerPhoto) => void;
}

function PhotoThumbCell({ photo, onView, onDelete, styles, theme }: {
  photo: AnswerPhoto;
  onView: (p: AnswerPhoto) => void;
  onDelete: (p: AnswerPhoto) => void;
  styles: ReturnType<typeof getstyles>;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const isLocal = /^(file|content|ph|asset):\/\//.test(photo.storage_path);
  const [uri, setUri] = useState<string | null>(isLocal ? photo.storage_path : null);
  const [loadError, setLoadError] = useState(false);

  const fetchUri = useCallback(() => {
    if (isLocal) return;
    let cancelled = false;
    setLoadError(false);
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, photo.storage_path)
      .then(url => { if (!cancelled) setUri(url); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [photo.storage_path, isLocal]);

  useEffect(() => { return fetchUri(); }, [fetchUri]);

  return (
    <>
      <PressableScale onPress={() => onView(photo)} hapticOnPress="light" scaleTo={0.95}>
        {loadError ? (
          <Pressable onPress={fetchUri} style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="refresh" size={22} color={theme.colors.inkFaint} />
          </Pressable>
        ) : uri ? (
          <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator color={theme.colors.inkSoft} />
          </View>
        )}
      </PressableScale>
      <Pressable
        onPress={() => onDelete(photo)}
        style={styles.deleteBtn}
        hitSlop={8}
        {...a11y('ფოტოს წაშლა', 'შეეხეთ ფოტოს წასაშლად', 'button')}
      >
        <Ionicons name="close" size={12} color="#fff" />
      </Pressable>
    </>
  );
}

export function WizardPhotoThumbs({ photos, onView, onDelete }: PhotoThumbsProps) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {photos.map((photo, index) => (
        <Animated.View
          key={photo.id}
          entering={reduceMotion ? undefined : FadeInUp.delay(index * 80).springify()}
          layout={reduceMotion ? undefined : Layout.springify()}
        >
          <PhotoThumbCell
            photo={photo}
            onView={onView}
            onDelete={onDelete}
            styles={styles}
            theme={theme}
          />
        </Animated.View>
      ))}
    </View>
  );
}

function getstyles(theme: Theme) {
  return StyleSheet.create({
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  deleteBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.semantic.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
}
