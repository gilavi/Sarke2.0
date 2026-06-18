import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useTheme } from '../../../lib/theme';
import { imageForDisplay } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import type { AnswerPhoto } from '../../../types/models';
import { getstyles } from './styles';

export const KamariPhotoThumb = memo(function KamariPhotoThumb({
  photo,
  onDelete,
}: {
  photo: AnswerPhoto;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, photo.storage_path)
      .then(u => {
        if (!cancelled) setUri(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photo.storage_path]);
  return (
    <View>
      <View style={styles.thumb}>
        {uri ? <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" transition={200} /> : null}
      </View>
      <Pressable onPress={onDelete} style={styles.thumbDelete} hitSlop={12}>
        <X size={12} color="#fff" strokeWidth={1.5} />
      </Pressable>
    </View>
  );
});