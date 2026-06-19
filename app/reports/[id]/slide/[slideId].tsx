import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { KeyboardSafeArea } from '../../../../components/layout/KeyboardSafeArea';
import { useBottomSheet } from '../../../../components/BottomSheet';
import { Button } from '../../../../components/ui';
import { FloatingLabelInput } from '../../../../components/inputs/FloatingLabelInput';
import { HeaderBackButton } from '../../../../components/HeaderBackButton';
import { SlidePhotoRow } from '../../../../components/reports/SlidePhotoRow';
import { SlideLayoutPicker } from '../../../../components/reports/SlideLayoutPicker';
import { useTheme } from '../../../../lib/theme';
import { SkeletonPreview } from '../../../../components/Skeleton';
import { useToast } from '../../../../lib/toast';
import { friendlyError } from '../../../../lib/errorMap';
import { reportsApi, storageApi } from '../../../../lib/services';
import { STORAGE_BUCKETS } from '../../../../lib/supabase';
import { imageForDisplay } from '../../../../lib/imageUrl';
import {
  MAX_SLIDE_PHOTOS,
  defaultSlideLayout,
  layoutsForCount,
  slideImagePath,
  slideImages,
  withSlideImages,
} from '../../../../lib/reportSlides';
import { qk } from '../../../../lib/apiHooks';
import { useQueryClient } from '@tanstack/react-query';
import { usePhotoPicker } from '../../../../hooks/usePhotoPicker';
import { useSubmitGuard } from '../../../../hooks/useSubmitGuard';
import type { Report, ReportSlide, ReportSlideLayout, SlideImage } from '../../../../types/models';

export default function ReportSlideEditor() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const showSheet = useBottomSheet();
  const queryClient = useQueryClient();
  const { id, slideId } = useLocalSearchParams<{ id: string; slideId: string }>();
  const { pickPhotoWithAnnotation, pickPhotoWithAnnotationFromUri } = usePhotoPicker();

  const [report, setReport] = useState<Report | null>(null);
  const [slide, setSlide] = useState<ReportSlide | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<SlideImage[]>([]);
  const [layout, setLayout] = useState<ReportSlideLayout | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  // Enabled "შენახვა" button + on-press title error (see useSubmitGuard).
  const { attempted, guard } = useSubmitGuard();

  // Prevents useFocusEffect from resetting user-edited fields when the screen
  // regains focus after returning from the photo picker / annotator.
  const hasInitialized = useRef(false);

  // Navigating to a different slideId should re-sync the form to the new slide.
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
      setImages(slideImages(s));
      setLayout(s.layout);
    }
  }, [id, slideId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const uploadLocalUri = async (localUri: string): Promise<string | null> => {
    if (!report) return null;
    const ext = (localUri.split('.').pop() || 'jpg').split('?')[0];
    const path = `${report.id}/${slideId}/annotated-${Crypto.randomUUID()}.${ext}`;
    try {
      await storageApi.uploadFromUri(STORAGE_BUCKETS.reportPhotos, path, localUri, 'image/jpeg', 'report');
      return path;
    } catch (e) {
      toast.error(friendlyError(e, 'სურათის ატვირთვა ვერ მოხერხდა'));
      return null;
    }
  };

  const addPhoto = async () => {
    if (images.length >= MAX_SLIDE_PHOTOS || addingPhoto) return;
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    setAddingPhoto(true);
    const newPath = await uploadLocalUri(result.uri);
    if (newPath) {
      setImages(prev => [...prev, { image_path: newPath, annotated_image_path: null }]);
    }
    setAddingPhoto(false);
  };

  // Handlers match the target photo by object identity, not positional index, so
  // a concurrent remove of a lower-indexed photo (while a change/re-annotate upload
  // is in flight) can't reindex the array and drop or overwrite the wrong photo.
  const changePhoto = async (target: SlideImage, index: number) => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    setUploadingIndex(index);
    const newPath = await uploadLocalUri(result.uri);
    if (newPath) {
      setImages(prev => prev.map(im => (im === target ? { image_path: newPath, annotated_image_path: null } : im)));
    }
    setUploadingIndex(null);
  };

  const reAnnotatePhoto = async (target: SlideImage, index: number) => {
    const path = slideImagePath(target);
    if (!path) return;
    setUploadingIndex(index);
    try {
      const signed = await imageForDisplay(STORAGE_BUCKETS.reportPhotos, path);
      const annotatedUri = await pickPhotoWithAnnotationFromUri(signed);
      if (annotatedUri) {
        const newPath = await uploadLocalUri(annotatedUri);
        if (newPath) {
          setImages(prev =>
            prev.map(im => (im === target ? { image_path: newPath, annotated_image_path: null } : im)),
          );
        }
      }
    } catch (e) {
      toast.error(friendlyError(e, 'ხატვის გახსნა ვერ მოხერხდა'));
    } finally {
      setUploadingIndex(null);
    }
  };

  const removePhoto = (target: SlideImage) => {
    showSheet(
      {
        title: 'სურათის წაშლა?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      idx => {
        if (idx !== 0) return;
        setImages(prev => prev.filter(im => im !== target));
      },
    );
  };

  const onTapPhoto = (index: number) => {
    const target = images[index];
    if (!target) return;
    showSheet(
      {
        title: 'სურათის ცვლილება',
        options: ['შეცვლა', 'ხატვა / რედაქტირება', 'წაშლა', 'გაუქმება'],
        cancelButtonIndex: 3,
        destructiveButtonIndex: 2,
      },
      idx => {
        if (idx === 0) void changePhoto(target, index);
        else if (idx === 1) void reAnnotatePhoto(target, index);
        else if (idx === 2) removePhoto(target);
      },
    );
  };

  const validLayouts = layoutsForCount(images.length);
  const effectiveLayout =
    layout && validLayouts.includes(layout) ? layout : defaultSlideLayout(images.length);

  // Title gate for the (always-enabled) save button. In-flight uploads stay a
  // separate disable so a half-uploaded photo can't be saved.
  const titleValid = title.trim().length > 0;
  const uploading = addingPhoto || uploadingIndex !== null;

  const onSave = async () => {
    if (!report || !slide || busy || uploading || !titleValid) return;
    setBusy(true);
    const next = report.slides.map(s =>
      s.id === slide.id
        ? withSlideImages(
            { ...s, title: title.trim(), description: description.trim() },
            images,
            effectiveLayout,
          )
        : s,
    );
    try {
      const saved = await reportsApi.update(report.id, { slides: next });
      queryClient.setQueryData(qk.reports.byId(saved.id), saved);
      router.back();
    } catch (e) {
      toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      setBusy(false);
    }
  };

  if (!report || !slide) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SkeletonPreview />
      </View>
    );
  }

  const slideIndex = report.slides.findIndex(s => s.id === slide.id);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `სლაიდი ${slideIndex + 1}`,
          headerBackVisible: false,
          headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.ink, fontWeight: '700', fontSize: 17 },
        }}
      />

      <KeyboardSafeArea headerHeight={44} contentStyle={{ padding: 16, gap: 14 }}>
        {/* Photos (1–2 per slide) */}
        <SlidePhotoRow
          images={images}
          uploadingIndex={uploadingIndex}
          addingPhoto={addingPhoto}
          onTapPhoto={onTapPhoto}
          onAddPhoto={addPhoto}
        />

        {/* Layout chooser — only when there's a real choice (≥1 photo). */}
        {validLayouts.length > 1 ? (
          <SlideLayoutPicker layouts={validLayouts} value={effectiveLayout} onChange={setLayout} />
        ) : null}

        {/* Title */}
        <FloatingLabelInput
          label="სლაიდის სათაური"
          required
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
          error={attempted && !title.trim() ? 'სავალდებულო ველი' : undefined}
        />

        {/* Description */}
        <FloatingLabelInput
          label="აღწერა"
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </KeyboardSafeArea>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Button
          title="შენახვა"
          onPress={() => guard(titleValid, onSave)}
          disabled={busy || uploading}
          loading={busy}
        />
      </View>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
  });
}
