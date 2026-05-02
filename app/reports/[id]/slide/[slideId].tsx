import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { KeyboardSafeArea } from '../../../../components/layout/KeyboardSafeArea';
import { A11yText as Text } from '../../../../components/primitives/A11yText';
import { useBottomSheet } from '../../../../components/BottomSheet';
import { Button } from '../../../../components/ui';
import { FloatingLabelInput } from '../../../../components/inputs/FloatingLabelInput';
import { HeaderBackPill } from '../../../../components/HeaderBackPill';
import { useTheme } from '../../../../lib/theme';
import { useToast } from '../../../../lib/toast';
import { friendlyError } from '../../../../lib/errorMap';
import { reportsApi, storageApi } from '../../../../lib/services';
import { STORAGE_BUCKETS } from '../../../../lib/supabase';
import { getStorageImageDisplayUrl } from '../../../../lib/imageUrl';
import { setPhotoAnnotateCallback, setPhotoPickerCallback } from '../../../../lib/photoPickerBus';
import type { Report, ReportSlide } from '../../../../types/models';

export default function ReportSlideEditor() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const showSheet = useBottomSheet();
  const { id, slideId } = useLocalSearchParams<{ id: string; slideId: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [slide, setSlide] = useState<ReportSlide | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [annotatedPath, setAnnotatedPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  // Prevents useFocusEffect from resetting user-edited fields when the screen
  // regains focus after returning from the photo picker / annotator.
  const hasInitialized = useRef(false);

  // Navigating to a different slideId should re-sync the form to the new
  // slide's content. Without this reset, the ref stays true from the prior
  // slide and the next load() skips the sync, leaving stale title/desc.
  useEffect(() => {
    hasInitialized.current = false;
  }, [slideId]);

  const load = useCallback(async () => {
    if (!id || !slideId) return;
    const r = await reportsApi.getById(id).catch(() => null);
    if (!r) return;
    setReport(r);
    const s = r.slides.find(x => x.id === slideId) ?? null;
    setSlide(s);
    if (s && !hasInitialized.current) {
      hasInitialized.current = true;
      setTitle(s.title);
      setDescription(s.description);
      setImagePath(s.image_path);
      setAnnotatedPath(s.annotated_image_path);
    }
  }, [id, slideId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Resolve display URI for the active image.
  useEffect(() => {
    const path = annotatedPath ?? imagePath;
    if (!path) {
      setThumbUri(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await getStorageImageDisplayUrl(STORAGE_BUCKETS.reportPhotos, path);
        if (!cancelled) setThumbUri(u);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [annotatedPath, imagePath]);

  const uploadLocalUri = async (localUri: string, kind: 'raw' | 'annotated'): Promise<string | null> => {
    if (!report) return null;
    const ext = (localUri.split('.').pop() || 'jpg').split('?')[0];
    const path = `${report.id}/${slideId}/${kind}-${Crypto.randomUUID()}.${ext}`;
    try {
      await storageApi.uploadFromUri(STORAGE_BUCKETS.reportPhotos, path, localUri, 'image/jpeg', 'report');
      return path;
    } catch (e) {
      toast.error(friendlyError(e, 'სურათის ატვირთვა ვერ მოხერხდა'));
      return null;
    }
  };

  // Mirror the questionnaire flow: push /photo-picker (live camera + library
  // strip), and when the user picks a URI, replace with /photo-annotate so
  // returning from annotate lands back on this screen. Then upload + persist.
  const pickPhoto = () => {
    setPhotoPickerCallback(localUri => {
      if (!localUri) return;
      setPhotoAnnotateCallback(async annotatedLocalUri => {
        // User cancelled annotation → fall back to raw photo upload.
        const sourceUri = annotatedLocalUri ?? localUri;
        const kind: 'raw' | 'annotated' = annotatedLocalUri ? 'annotated' : 'raw';
        setImageUploading(true);
        const newPath = await uploadLocalUri(sourceUri, kind);
        if (newPath) {
          if (kind === 'raw') {
            setImagePath(newPath);
            setAnnotatedPath(null);
          } else {
            // We don't keep the raw if user only sees annotated; safe simplification.
            setImagePath(newPath);
            setAnnotatedPath(null);
          }
        }
        setImageUploading(false);
      });
      router.replace(`/photo-annotate?uri=${encodeURIComponent(localUri)}` as any);
    });
    router.push('/photo-picker' as any);
  };

  const reAnnotateExisting = async () => {
    const path = annotatedPath ?? imagePath;
    if (!path) return;
    setImageUploading(true);
    try {
      const signed = await getStorageImageDisplayUrl(STORAGE_BUCKETS.reportPhotos, path);
      setPhotoAnnotateCallback(async annotatedLocalUri => {
        if (annotatedLocalUri) {
          const newPath = await uploadLocalUri(annotatedLocalUri, 'annotated');
          if (newPath) {
            setImagePath(newPath);
            setAnnotatedPath(null);
          }
        }
        setImageUploading(false);
      });
      router.push(`/photo-annotate?uri=${encodeURIComponent(signed)}` as any);
    } catch (e) {
      toast.error(friendlyError(e, 'ხატვის გახსნა ვერ მოხერხდა'));
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    showSheet(
      {
        title: 'სურათის წაშლა?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      idx => {
        if (idx !== 0) return;
        setImagePath(null);
        setAnnotatedPath(null);
      },
    );
  };

  const onImageTap = () => {
    if (!imagePath && !annotatedPath) {
      pickPhoto();
      return;
    }
    showSheet(
      {
        title: 'სურათის ცვლილება',
        options: ['შეცვლა', 'ხატვა / რედაქტირება', 'წაშლა', 'გაუქმება'],
        cancelButtonIndex: 3,
        destructiveButtonIndex: 2,
      },
      idx => {
        if (idx === 0) pickPhoto();
        else if (idx === 1) void reAnnotateExisting();
        else if (idx === 2) removeImage();
      },
    );
  };

  const canSave = title.trim().length > 0 && !busy && !imageUploading;

  const onSave = async () => {
    if (!report || !slide || !canSave) return;
    setBusy(true);
    const next = report.slides.map(s =>
      s.id === slide.id
        ? {
            ...s,
            title: title.trim(),
            description: description.trim(),
            image_path: imagePath,
            annotated_image_path: annotatedPath,
          }
        : s,
    );
    try {
      await reportsApi.update(report.id, { slides: next });
      router.back();
    } catch (e) {
      toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      setBusy(false);
    }
  };

  if (!report || !slide) {
    return (
      <View style={[styles.centered, { flex: 1, backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  const slideIndex = report.slides.findIndex(s => s.id === slide.id);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: `სლაიდი ${slideIndex + 1}`,
          headerBackVisible: false,
          headerLeft: () => <HeaderBackPill onPress={() => router.back()} />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.ink, fontWeight: '700', fontSize: 17 },
        }}
      />

      <KeyboardSafeArea headerHeight={44} contentStyle={{ padding: 16, gap: 16 }}>
        {/* Image section */}
        <Pressable onPress={onImageTap} style={styles.imageWrap}>
          {thumbUri ? (
            <Image source={{ uri: thumbUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={32} color={theme.colors.inkFaint} />
              <Text style={styles.imagePlaceholderText}>+ ფოტოს დამატება</Text>
            </View>
          )}
          {imageUploading ? (
            <View style={styles.imageOverlay}>
              <ActivityIndicator color={theme.colors.white} />
            </View>
          ) : null}
        </Pressable>

        {/* Title */}
        <FloatingLabelInput
          label="სლაიდის სათაური"
          required
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
        />

        {/* Description */}
        <FloatingLabelInput
          label="აღწერა"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={{ flex: 1 }} />
        <View style={styles.footer}>
          <Button title="შენახვა" onPress={onSave} disabled={!canSave} loading={busy} />
        </View>
      </KeyboardSafeArea>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    centered: { alignItems: 'center', justifyContent: 'center' },
    imageWrap: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.subtleSurface,
    },
    imagePlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.borderStrong,
      borderRadius: 12,
    },
    imagePlaceholderText: { fontSize: 14, color: theme.colors.inkSoft, fontWeight: '600' },
    imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
  });
}
