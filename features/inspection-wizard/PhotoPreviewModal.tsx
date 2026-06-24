import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { ImageIcon, RefreshCw, Trash2, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Skeleton } from '../../components/Skeleton';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { storageApi } from '../../lib/services';
import { logError } from '../../lib/logError';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { AnswerPhoto } from '../../types/models';
import { getstyles } from './styles';

export function PhotoPreviewModal({
  photo,
  visible,
  onClose,
  onDelete,
}: {
  photo: AnswerPhoto | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (photo: AnswerPhoto) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadUri = useCallback(() => {
    if (!photo) {
      setUri(null);
      setError(false);
      return;
    }
    const isLocal = /^(file|content|ph|asset):\/\//.test(photo.storage_path);
    if (isLocal) {
      setUri(photo.storage_path);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, photo.storage_path)
      .then(url => { if (!cancelled) setUri(url); })
      .catch((e) => {
        logError(e, 'wizard.photoDisplayUrl');
        if (!cancelled) {
          setUri(storageApi.publicUrl(STORAGE_BUCKETS.answerPhotos, photo.storage_path));
          setError(true);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [photo]);

  useEffect(() => {
    const cleanup = loadUri();
    return cleanup;
  }, [loadUri]);

  if (!visible || !photo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.previewOverlay}>
        <Pressable style={styles.previewBackdrop} onPress={onClose} {...a11y(t('a11y.close'), t('inspections.closePhotoBackdropHint'), 'button')} />
        {loading || !uri ? (
          <View style={[styles.previewImage, { alignItems: 'center', justifyContent: 'center' }]}>
            <Skeleton width={120} height={120} radius={12} />
          </View>
        ) : error ? (
          <View style={[styles.previewImage, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
            <ImageIcon size={48} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{t('inspections.photoLoadFailed')}</Text>
            <Pressable onPress={loadUri} style={{ padding: 8 }} {...a11y(t('inspections.retryPhotoLoad'), t('inspections.retryPhotoLoadHint'), 'button')}>
              <RefreshCw size={28} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
            </Pressable>
          </View>
        ) : (
          <Image
            source={{ uri }}
            style={styles.previewImage}
            contentFit="contain"
            onError={() => setError(true)}
          />
        )}
        <Pressable
          style={styles.previewDeleteBtn}
          onPress={async () => {
            await onDelete(photo);
            onClose();
          }}
          {...a11y(t('common.delete'), t('inspections.deleteA11yHint'), 'button')}
        >
          <Trash2 size={22} color="#fff" strokeWidth={1.5} />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{t('common.delete')}</Text>
        </Pressable>
        <Pressable style={styles.previewCloseBtn} onPress={onClose} {...a11y(t('a11y.close'), t('a11y.closeHint'), 'button')}>
          <X size={28} color="#fff" strokeWidth={1.5} />
        </Pressable>
      </View>
    </Modal>
  );
}
