import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { KeyboardSafeArea } from '../../../../components/layout/KeyboardSafeArea';
import { Button } from '../../../../components/ui';
import { FloatingLabelInput } from '../../../../components/inputs/FloatingLabelInput';
import { HeaderBackButton } from '../../../../components/HeaderBackButton';
import { SlidePhotoRow } from '../../../../components/reports/SlidePhotoRow';
import { SlideLayoutField } from '../../../../components/reports/SlideLayoutField';
import { SlideCanvas } from '../../../../components/reports/SlideCanvas';
import { useTheme } from '../../../../lib/theme';
import { SkeletonPreview } from '../../../../components/Skeleton';
import { useToast } from '../../../../lib/toast';
import { friendlyError } from '../../../../lib/errorMap';
import { reportsApi } from '../../../../lib/services';
import { STORAGE_BUCKETS } from '../../../../lib/supabase';
import {
  defaultSlideLayout,
  layoutsForCount,
  slideImagePath,
  slideImages,
  withSlideImages,
} from '../../../../lib/reportSlides';
import { qk } from '../../../../lib/apiHooks';
import { useQueryClient } from '@tanstack/react-query';
import { useResolvedImageUris } from '../../../../hooks/useResolvedImageUris';
import { useSlidePhotoEditing } from '../../../../hooks/useSlidePhotoEditing';
import { useSubmitGuard } from '../../../../hooks/useSubmitGuard';
import type { Report, ReportSlide, ReportSlideLayout, SlideImage } from '../../../../types/models';

export default function ReportSlideEditor() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { id, slideId } = useLocalSearchParams<{ id: string; slideId: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [slide, setSlide] = useState<ReportSlide | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<SlideImage[]>([]);
  const [layout, setLayout] = useState<ReportSlideLayout | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  // Enabled "შენახვა" button + on-press title error (see useSubmitGuard).
  const { attempted, guard } = useSubmitGuard();

  // Photo add / change / annotate / delete behaviour lives in its own hook.
  const { addingPhoto, uploadingPaths, uploading, addPhoto, onTapPhoto } = useSlidePhotoEditing({
    report,
    slideId,
    images,
    setImages,
  });

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

  const validLayouts = layoutsForCount(images.length);
  const effectiveLayout =
    layout && validLayouts.includes(layout) ? layout : defaultSlideLayout(images.length);

  // Resolve photo paths → display URIs once (cached); feeds preview + tiles.
  const uris = useResolvedImageUris(STORAGE_BUCKETS.reportPhotos, images.map(slideImagePath));

  // Title gate for the (always-enabled) save button. In-flight uploads stay a
  // separate disable so a half-uploaded photo can't be saved.
  const titleValid = title.trim().length > 0;

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

      <KeyboardSafeArea headerHeight={44} contentStyle={{ padding: 16, gap: 16 }}>
        {/* Live preview — mirrors how the slide renders in the PDF. */}
        <SlideCanvas
          num={slideIndex + 1}
          title={title}
          description={description}
          layout={effectiveLayout}
          uris={uris}
        />

        {/* Photos (1–2 per slide; the 2nd is optional). */}
        <SlidePhotoRow
          images={images}
          uris={uris}
          uploadingPaths={uploadingPaths}
          addingPhoto={addingPhoto}
          onTapPhoto={onTapPhoto}
          onAddPhoto={addPhoto}
        />

        {/* Layout chooser — only when there's a real choice (≥1 photo). */}
        {validLayouts.length > 1 ? (
          <SlideLayoutField layouts={validLayouts} value={effectiveLayout} onChange={setLayout} />
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

      {/* Footer rides above the keyboard so the save button stays reachable while
          editing the title / description. Mirrors app/reports/new.tsx. */}
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Button
            title="შენახვა"
            onPress={() => guard(titleValid, onSave)}
            disabled={busy || uploading}
            loading={busy}
          />
        </View>
      </KeyboardStickyView>
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
