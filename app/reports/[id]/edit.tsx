import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Images, CirclePlus } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { HeaderBackButton } from '../../../components/HeaderBackButton';
import { useBottomSheet } from '../../../components/BottomSheet';
import { ReportSlideCard } from '../../../components/reports/ReportSlideCard';
import { useTheme } from '../../../lib/theme';
import { SkeletonListCard } from '../../../components/Skeleton';
import { useToast } from '../../../lib/toast';
import { a11y } from '../../../lib/accessibility';
import { reportDisplayName } from '../../../lib/shared/documentName';
import { friendlyError } from '../../../lib/errorMap';
import { reportsApi } from '../../../lib/services';
import { useReport, useProject, qk } from '../../../lib/apiHooks';
import { useQueryClient } from '@tanstack/react-query';
import type { Report, ReportSlide } from '../../../types/models';

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
  const [busy, setBusy] = useState(false);
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
    setBusy(true);
    reportsApi
      .update(report.id, { slides: [newSlide] })
      .then(saved => {
        queryClient.setQueryData(qk.reports.byId(saved.id), saved);
        router.push(`/reports/${saved.id}/slide/${newSlide.id}` as any);
      })
      .catch(() => {
        autoCreatedRef.current = false;
      })
      .finally(() => setBusy(false));
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
    if (!report || busy) return;
    setBusy(true);
    const newSlide: ReportSlide = {
      id: Crypto.randomUUID(),
      order: slides.length,
      title: '',
      description: '',
      image_path: null,
      annotated_image_path: null,
    };
    const next = [...slides, newSlide];
    await persistSlides(next);
    setBusy(false);
    router.push(`/reports/${report.id}/slide/${newSlide.id}` as any);
  };

  const moveSlide = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target], next[idx]];
    await persistSlides(next);
  };

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
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 16 }}>
        <SkeletonListCard rows={4} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: reportDisplayName(report.title),
          headerBackVisible: false,
          headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.accent,
          headerTitleStyle: { color: theme.colors.ink, fontWeight: '700', fontSize: 17 },
          headerRight: () => (
            <Pressable
              onPress={onComplete}
              disabled={generating}
              hitSlop={8}
              style={({ pressed }) => [
                styles.pdfBtn,
                {
                  backgroundColor: slides.length === 0 ? theme.colors.subtleSurface : theme.colors.accent,
                },
                pressed && { opacity: 0.7 },
              ]}
              {...a11y('PDF', 'PDF-ის გენერაცია', 'button')}
            >
              <Text
                style={{
                  color: slides.length === 0 ? theme.colors.inkFaint : theme.colors.white,
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                PDF →
              </Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 16, gap: 12 }}
      >
        {slides.length === 0 ? (
          <View style={styles.empty}>
            <Images size={36} color={theme.colors.borderStrong} strokeWidth={1.5} />
            <Text style={styles.emptyText}>ჯერ სლაიდები არ არის</Text>
            <Text style={styles.emptyHint}>დაამატეთ პირველი სლაიდი ქვემოთ</Text>
          </View>
        ) : (
          slides.map((s, idx) => (
            <ReportSlideCard
              key={s.id}
              slide={s}
              index={idx}
              total={slides.length}
              onPress={() => router.push(`/reports/${report.id}/slide/${s.id}` as any)}
              onUp={() => moveSlide(idx, -1)}
              onDown={() => moveSlide(idx, 1)}
              onDelete={() => removeSlide(s)}
            />
          ))
        )}

        <Pressable
          onPress={addSlide}
          disabled={busy}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }, busy && { opacity: 0.6 }]}
        >
          <CirclePlus size={20} color={theme.colors.accent} strokeWidth={1.5} />
          <Text style={[styles.addBtnText, { color: theme.colors.accent }]}>+ სლაიდის დამატება</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky footer - always visible so the user knows how to finish */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={onComplete}
          disabled={generating}
          style={({ pressed }) => [
            styles.completeBtn,
            {
              backgroundColor:
                slides.length === 0 ? theme.colors.subtleSurface : theme.colors.accent,
            },
            pressed && { opacity: 0.8 },
            (generating || slides.length === 0) && { opacity: 0.6 },
          ]}
        >
          {generating ? (
            <ActivityIndicator color={theme.colors.white} size="small" />
          ) : (
            <Text
              style={[
                styles.completeBtnText,
                { color: slides.length === 0 ? theme.colors.inkFaint : theme.colors.white },
              ]}
            >
              PDF-ის გენერაცია →
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    pdfBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
    },
    empty: {
      paddingVertical: 60,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: { fontSize: 14, color: theme.colors.inkSoft, fontWeight: '600' },
    emptyHint: { fontSize: 12, color: theme.colors.inkFaint },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    addBtnText: { fontSize: 14, fontWeight: '700' },
    stickyFooter: {
      paddingHorizontal: 24,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
    completeBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    completeBtnText: { fontSize: 15, fontWeight: '700' },
  });
}
