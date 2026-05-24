import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import type { AnswerPhoto } from '../../types/models';
import { gets } from './styles';

export const CellPhotoThumb = memo(function CellPhotoThumb({
  photo,
  onDelete,
}: {
  photo: AnswerPhoto;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => gets(theme), [theme]);
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

  useEffect(() => {
    return fetchUri();
  }, [fetchUri]);

  return (
    <View style={s.thumbWrap}>
      {loadError ? (
        <Pressable onPress={fetchUri} style={{ alignItems: 'center', gap: 2 }} hitSlop={6}>
          <Ionicons name="refresh" size={18} color={theme.colors.inkFaint} />
        </Pressable>
      ) : uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <ActivityIndicator color={theme.colors.inkSoft} />
      )}
      <Pressable onPress={onDelete} style={s.thumbDelete} hitSlop={6}>
        <Ionicons name="close" size={14} color={theme.colors.white} />
      </Pressable>
    </View>
  );
});