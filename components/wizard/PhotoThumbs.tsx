import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';
import { PressableScale } from '../animations/PressableScale';
import type { AnswerPhoto } from '../../types/models';

interface PhotoThumbsProps {
  photos: AnswerPhoto[];
  onView: (photo: AnswerPhoto) => void;
  onDelete: (photo: AnswerPhoto) => void;
}

export function WizardPhotoThumbs({ photos, onView, onDelete }: PhotoThumbsProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {photos.map((photo, index) => (
        <Animated.View
          key={photo.id}
          entering={FadeInUp.delay(index * 80).springify()}
          layout={Layout.springify()}
        >
          <PressableScale onPress={() => onView(photo)} hapticOnPress="light" scaleTo={0.95}>
            <Image
              source={{ uri: photo.storage_path }}
              style={styles.thumb}
              contentFit="cover"
            />
          </PressableScale>
          <Pressable
            onPress={() => onDelete(photo)}
            style={styles.deleteBtn}
            hitSlop={8}
            {...a11y(
              'ფოტოს წაშლა',
              'შეეხეთ ფოტოს წასაშლად',
              'button'
            )}
          >
            <Ionicons name="close" size={12} color="#fff" />
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

function getstyles(theme: any) {
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
