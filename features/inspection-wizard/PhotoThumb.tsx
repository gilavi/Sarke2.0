import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Skeleton } from '../../components/Skeleton';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { storageApi } from '../../lib/services';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { AnswerPhoto } from '../../types/models';
import { getstyles } from './styles';
import { photoUrlCache, setPhotoUrlCache } from './wizardSchema';

export const PhotoThumb = memo(function PhotoThumb({
  photo,
  size = 80,
}: {
  photo: AnswerPhoto;
  size?: number;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  // Local device URIs (fresh upload) can be used directly without a network round-trip.
  const isLocal = /^(file|content|ph|asset):\/\//.test(photo.storage_path);
  const [uri, setUri] = useState<string | null>(isLocal ? photo.storage_path : null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(!isLocal);
  const fadeAnim = useRef(new Animated.Value(isLocal ? 1 : 0)).current;

  const load = useCallback(async () => {
    if (isLocal) return;
    const cacheKey = `${STORAGE_BUCKETS.answerPhotos}:${photo.storage_path}`;
    if (photoUrlCache.has(cacheKey)) {
      const url = photoUrlCache.get(cacheKey)!;
      setUri(url);
      setLoading(false);
      setError(false);
      fadeAnim.setValue(1);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const url = await imageForDisplay(STORAGE_BUCKETS.answerPhotos, photo.storage_path);
      setPhotoUrlCache(cacheKey, url);
      setUri(url);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } catch {
      const fallback = storageApi.publicUrl(STORAGE_BUCKETS.answerPhotos, photo.storage_path);
      setPhotoUrlCache(cacheKey, fallback);
      setUri(fallback);
      fadeAnim.setValue(1);
    } finally {
      setLoading(false);
    }
  }, [photo.storage_path, isLocal, fadeAnim]);

  useEffect(() => {
    void load();
    return () => { fadeAnim.stopAnimation(); };
  }, [load]);

  const containerStyle = [styles.photoThumb, { width: size, height: size }];

  if (loading) {
    return (
      <View style={containerStyle}>
        <Skeleton width={size * 0.6} height={size * 0.6} radius={size * 0.15} />
      </View>
    );
  }

  if (error || !uri) {
    return (
      <Pressable onPress={load} style={containerStyle} {...a11y('განახლება', 'შეეხეთ ფოტოს ხელახლა ჩასატვირთად', 'button')}>
        <Ionicons name="refresh" size={22} color={theme.colors.inkFaint} />
        <Text style={{ fontSize: 10, color: theme.colors.inkFaint, marginTop: 4 }}>განახლება</Text>
      </Pressable>
    );
  }

  return (
    <Animated.Image
      source={{ uri }}
      style={containerStyle}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
});
