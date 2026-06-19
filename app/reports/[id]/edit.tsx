import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Images, Plus } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Button } from '../../../components/primitives/Button';
import { FlowHeader } from '../../../components/FlowHeader';
import { useBottomSheet } from '../../../components/BottomSheet';
import { SlideReorderList } from '../../../components/reports/SlideReorderList';
import { useTheme } from '../../../lib/theme';
import { SkeletonListCard } from '../../../components/Skeleton';
import { useToast } from '../../../lib/toast';
import { friendlyError } from '../../../lib/errorMap';
import { reportsApi } from '../../../lib/services';
import { useReport, useProject, qk } from '../../../lib/apiHooks';
import { useQueryClient } from '@tanstack/react-query';
import type { ReportSlide } from '../../../types/models';

export default function ReportSlidesEditor() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const showSheet = useBottomSheet();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: report } = useReport(id);
  const { data: project } = useProject(report?.project_id);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const slides = useMemo(
    () => (report?.slides ?? []).slice().sort((a, b) => a.order - b.order),
    [report],
  );

  const autoCreatedRef = useRef(false);

  // On first open of a brand-new report (no slides yet), create one slide
  // automatically and navigate straight into its editor so the user lands
  // directly in the slide form rather than seeing an empty list.
  useEffect(() => {
    if (!report || slides.length > 0 || autoCreatedRef.current) return;
    autoCreatedRef.current = true;
    const newSlide: ReportSlide = {
      id: Crypto.randomUUID(),
      order: 0,
      title: '',
      description: '',
      image_path: null,
      annotated_image_path: null,
    };
    reportsApi
      .update(report.id, { slides: [newSlide] })
      .then(saved => {
        queryClient.setQueryData(qk.reports.byId(saved.id), saved);
        router.push(`/reports/${saved.id}/slide/${newSlide.id}` as any);
      })
      .catch(() => {
        autoCreatedRef.current = false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, slides.length]);

  const persistSlides = useCallback(
    async (next: ReportSlide[]) => {
      if (!report) return;
      const renumbered = next.map((s, i) => ({ ...s, order: i }));
      queryClient.setQueryData(qk.reports.byId(report.id), { ...report, slides: renumbered });
      try {
        const saved = await reportsApi.update(report.id, { slides: renumbered });
        queryClient.setQueryData(qk.reports.byId(saved.id), saved);
      } catch (e) {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
        queryClient.invalidateQueries({ queryKey: qk.reports.byId(report.id) });
      }
    },
    [report, toast, queryClient],
  );

  const addSlide = async () => {
    if (!report) return;
    const newSlide: ReportSlide = {
      id: Crypto.randomUUID(),
      order: slides.length,
      title: '',
      description: '',
      image_path: null,
      annotated_image_path: null,
    };
    await persistSlides([...slides, newSlide]);
    router.push(`/reports/${report.id}/slide/${newSlide.id}` as any);
  };

  // Commit a drag-reorder: map the new id order back to slide objects and persist.
  const onReorder = useCallback(
    (orderedIds: string[]) => {
      const byId = new Map(slides.map(s => [s.id, s]));
      const next = orderedIds.map(sid => byId.get(sid)).filter((s): s is ReportSlide => !!s);
      if (next.length !== slides.length) return;
      if (!next.some((s, i) => s.id !== slides[i].id)) return; // order unchanged
      void persistSlides(next);
    },
    [slides, persistSlides],
  );

  const removeSlide = (slide: ReportSlide) => {
    showSheet(
      {
        title: 'სლაიდის წაშლა?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      async idx => {
        if (idx !== 0) return;
        await persistSlides(slides.filter(s => s.id !== slide.id));
      },
    );
  };

  const onComplete = async () => {
    if (!report) return;
    if (slides.length === 0) {
      toast.error('მინიმუმ ერთი სლაიდი დაამატეთ');
      return;
    }
    setGenerating(true);
    try {
      const saved = await reportsApi.update(report.id, { status: 'completed' });
      queryClient.setQueryData(qk.reports.byId(saved.id), saved);
      router.replace(`/reports/${saved.id}/success` as any);
    } catch (e) {
      toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
    } finally {
      setGenerating(false);
    }
  };

  if (!report) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.card, padding: 16 }}>
        <SkeletonListCard rows={4} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlowHeader
        flowTitle="რეპორტი"
        project={project ? { name: project.name } : null}
        step={2}
        totalSteps={2}
        leading="back"
        trailing="close"
        onBack={() => router.back()}
        onClose={() => router.back()}
        surfaceColor={theme.colors.surface}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {slides.length === 0 ? (
          <View style={styles.empty}>
            <Images size={36} color={theme.colors.borderStrong} strokeWidth={1.5} />
            <Text style={styles.emptyText}>ჯერ სლაიდები არ არის</Text>
            <Text style={styles.emptyHint}>დაამატეთ პირველი სლაიდი ქვემოთ</Text>
          </View>
        ) : (
          <SlideReorderList
            slides={slides}
            onPress={s => router.push(`/reports/${report.id}/slide/${s.id}` as any)}
            onDelete={removeSlide}
            onReorder={onReorder}
          />
        )}

        <Pressable
          onPress={addSlide}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        >
          <Plus size={20} color={theme.colors.inkSoft} strokeWidth={1.75} />
          <Text style={styles.addBtnText}>სლაიდის დამატება</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky footer - always visible so the user knows how to finish */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          title={generating ? 'გენერირდება…' : 'PDF-ის გენერაცია →'}
          variant="primary"
          size="lg"
          onPress={onComplete}
          loading={generating}
          disabled={generating || slides.length === 0}
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    empty: {
      paddingVertical: 60,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: { fontSize: 14, color: theme.colors.inkSoft, fontWeight: '600' },
    emptyHint: { fontSize: 12, color: theme.colors.inkFaint },
    addBtn: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 18,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surface,
    },
    addBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.inkSoft },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
  });
}
