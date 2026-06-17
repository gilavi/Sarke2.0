// Inspection "act saved" success view.
//
// The shared body of every inspection done.tsx route (generic harness/
// scaffold + bobcat, excavator, cargo-platform, general-equipment). Each
// route stays a thin data-loader that fetches its own row, maps it to the
// props below, and renders this view - the wording, layout, primary CTA and
// the home action all live here so they can never drift between types.
//
// Terminology: the document is a "შემოწმების აქტი" (inspection act), never
// "ინსპექცია". Keep that out of every user-facing string here.
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { A11yText as Text } from '../primitives/A11yText';
import { Card } from '../ui';
import { Skeleton, SkeletonCard } from '../Skeleton';
import { useTheme } from '../../lib/theme';
import { SuccessScreen } from './SuccessScreen';

/** Verdict color intent. `safe` uses the brand accent (neutral-positive). */
export type DoneVerdictTone = 'safe' | 'success' | 'warn' | 'danger';

export type InspectionDoneViewProps = {
  /** True while the inspection row is still being fetched. */
  loading: boolean;
  /** Whether the inspection row resolved (controls summary vs nothing). */
  loaded: boolean;
  /** Full act name shown in the summary, e.g. "ექსკავატორის შემოწმების აქტი". */
  typeLabel: string;
  projectName?: string;
  /** Pre-formatted, locale-aware date string. */
  dateText?: string;
  /** Resolved verdict line + its color intent, or null if the type has none. */
  verdict?: { text: string; tone: DoneVerdictTone } | null;
  conclusion?: string | null;
  /** Opens the saved PDF (detail/preview screen). Wired to "PDF-ის ნახვა". */
  onViewPdf: () => void;
};

const SUBTITLE =
  'ყველა მონაცემი შენახულია. PDF რეპორტის ჩამოტვირთვა და ხელმოწერა შეგიძლიათ აქტის გვერდიდან.';

export function InspectionDoneView({
  loading,
  loaded,
  typeLabel,
  projectName,
  dateText,
  verdict,
  conclusion,
  onViewPdf,
}: InspectionDoneViewProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();

  const verdictColor = (tone: DoneVerdictTone) =>
    tone === 'danger'
      ? theme.colors.danger
      : tone === 'warn'
        ? theme.colors.warn
        : tone === 'success'
          ? theme.colors.semantic.success
          : theme.colors.accent;

  return (
    <SuccessScreen
      title="შემოწმების აქტი შენახულია!"
      subtitle={SUBTITLE}
      primary={{ title: 'PDF-ის ნახვა', icon: 'document-text', onPress: onViewPdf }}
      actions={[
        {
          icon: 'home-outline',
          title: 'მთავარ გვერდზე დაბრუნება',
          onPress: () => router.replace('/(tabs)/home' as any),
        },
      ]}
    >
      {loading ? (
        <SkeletonCard>
          <Skeleton width={90} height={10} />
          <View style={{ height: 10 }} />
          <Skeleton width={'80%'} height={18} />
          <View style={{ height: 6 }} />
          <Skeleton width={'50%'} height={12} />
          <View style={{ height: 14 }} />
          <Skeleton width={'65%'} height={14} />
        </SkeletonCard>
      ) : loaded ? (
        <Card>
          <Text style={styles.eyebrow}>შეჯამება</Text>
          <Text style={styles.actTitle}>{typeLabel}</Text>
          {projectName ? <Text style={styles.meta}>{projectName}</Text> : null}
          {dateText ? <Text style={styles.meta}>{dateText}</Text> : null}
          {verdict ? (
            <Text style={[styles.verdict, { color: verdictColor(verdict.tone) }]}>
              {verdict.text}
            </Text>
          ) : null}
          {conclusion ? (
            <Text style={styles.conclusion} numberOfLines={4}>
              {conclusion}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </SuccessScreen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    eyebrow: {
      fontSize: 11,
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '700',
    },
    actTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.ink,
      marginTop: 6,
    },
    meta: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
    verdict: { fontWeight: '700', marginTop: 10 },
    conclusion: { marginTop: 8, color: theme.colors.ink, fontSize: 14, lineHeight: 20 },
  });
}
