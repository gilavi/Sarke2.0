import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Images, Plus } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Button } from '../../../components/primitives/Button';
import { FlowHeader } from '../../../components/FlowHeader';
import { useBottomSheet } from '../../../components/BottomSheet';
import { SlideReorderList } from '../../../components/reports/SlideReorderList';
import { useTheme } from '../../../lib/theme';
import { SkeletonListCard } from '../../../components/Skeleton';
import { useToast } from '../../../lib/toast';
import { friendlyError } from '../../../lib/errorMap';
import { saveRecordThroughOutbox } from '../../../lib/outbox';
import { useReport, useProject, qk, invalidateRecordLists } from '../../../lib/apiHooks';
import { useQueryClient } from '@tanstack/react-query';
import type { Report, ReportSlide } from '../../../types/models';

export default function ReportSlidesEditor() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const showSheet = useBottomSheet();
  const { t } = useTranslation();
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

  // Every write on this screen funnels through the offline outbox: offline it
  // queues (an update coalesces into a still-queued create) and seeds the
  // detail cache so the flow keeps rendering; online it is the direct call.
  const saveReport = useCallback(
    async (patch: Partial<Pick<Report, 'slides' | 'status'>>) => {
      if (!report) return { queued: false };
      const res = await saveRecordThroughOutbox({
        entity: 'report',
        mode: 'update',
        recordId: report.id,
        payload: patch,
        displayTitle: 'ანგარიში',
        projectId: report.project_id,
        detailKey: qk.reports.byId(report.id),
        optimistic: { ...report, ...patch },
      });
      if (!res.queued && res.record) {
        queryClient.setQueryData(qk.reports.byId(report.id), res.record);
      }
      return res;
    },
    [report, queryClient],
  );

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
    saveReport({ slides: [newSlide] })
      .then(() => {
        router.push(`/reports/${report.id}/slide/${newSlide.id}` as any);
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
        // Silent autosave: a queued offline save shows no toast.
        await saveReport({ slides: renumbered });
      } catch (e) {
        toast.error(friendlyError(e, t('errors.saveFailed')));
        queryClient.invalidateQueries({ queryKey: qk.reports.byId(report.id) });
      }
    },
    [report, toast, queryClient, t, saveReport],
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
        title: t('reports.deleteSlideTitle'),
        options: [t('projects.deleteConfirmYes'), t('common.cancel')],
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
      toast.error(t('reports.addSlideRequired'));
      return;
    }
    setGenerating(true);
    try {
      const res = await saveReport({ status: 'completed' });
      if (res.queued) toast.success(t('components.savedOffline'));
      invalidateRecordLists(queryClient);
      router.replace(`/reports/${report.id}/success` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.saveFailed')));
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
        flowTitle={t('records.reports')}
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
            <Text style={styles.emptyText}>{t('reports.noSlidesYet')}</Text>
            <Text style={styles.emptyHint}>{t('reports.addFirstSlideHint')}</Text>
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
          <Text style={styles.addBtnText}>{t('reports.addSlide')}</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky footer - always visible so the user knows how to finish */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          title={generating ? t('reports.generating') : t('reports.generatePdfButton')}
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
