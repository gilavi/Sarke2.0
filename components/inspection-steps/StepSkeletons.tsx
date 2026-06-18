/**
 * Per-step body skeletons for inspection flows.
 *
 * Each variant mirrors the *shape* of one kind of inspection step (form /
 * keypad / checklist / conclusion / table / question) so that while a flow
 * blocks on its initial fetch, the body placeholder already looks like the
 * step it is about to become — instead of one generic form for every step.
 *
 * These are bodies ONLY: the header (FlowHeader + progress bar) and the
 * footer button are owned by {@link InspectionShellSkeleton}, which never
 * waits on loading. Every piece is built from the shared {@link Skeleton}
 * atom, so the shimmer colour + animation stay identical across all flows.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from '../Skeleton';
import { useTheme } from '../../lib/theme';

export type StepSkeletonVariant =
  | 'form' // FloatingLabelInput / IdentificationGrid fields
  | 'keypad' // PlateInput + SerialKeypad
  | 'checklist' // ChecklistStep legend + result rows
  | 'conclusion' // VerdictSelector + notes + photos
  | 'table' // DynamicTable-style rows + add button
  | 'question'; // generic wizard question (title + answers + photos + notes)

// ── form: stacked input bars ─────────────────────────────────────────────────
const FormBodySkeleton = memo(function FormBodySkeleton({ fields = 3 }: { fields?: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.formBody}>
      {Array.from({ length: Math.max(1, fields) }).map((_, i) => (
        <Skeleton key={i} width={'100%'} height={56} radius={theme.radius.input} />
      ))}
    </View>
  );
});

// ── keypad: plate field at the top, key grid pinned to the bottom ────────────
const KeypadBodySkeleton = memo(function KeypadBodySkeleton() {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.keypadHead}>
        <Skeleton width={'64%'} height={64} radius={14} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Skeleton width={72} height={28} radius={14} />
          <Skeleton width={96} height={28} radius={14} />
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <View style={styles.keypadGrid}>
        {Array.from({ length: 3 }).map((_, r) => (
          <View key={r} style={styles.keypadRow}>
            {Array.from({ length: 9 }).map((__, c) => (
              <Skeleton key={c} style={{ flex: 1 }} height={44} radius={8} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

// ── checklist: legend strip + rows (description + three result chips) ────────
const ChecklistBodySkeleton = memo(function ChecklistBodySkeleton({ rows = 6 }: { rows?: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.listBody}>
      <Skeleton width={'100%'} height={34} radius={10} style={{ marginBottom: 12 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.checkRow, { borderBottomColor: theme.colors.hairline }]}>
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width={'72%'} height={13} />
            <Skeleton width={'44%'} height={10} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Skeleton width={26} height={26} radius={8} />
            <Skeleton width={26} height={26} radius={8} />
            <Skeleton width={26} height={26} radius={8} />
          </View>
        </View>
      ))}
    </View>
  );
});

// ── conclusion: verdict caption + button row + notes + photos ────────────────
const ConclusionBodySkeleton = memo(function ConclusionBodySkeleton() {
  return (
    <View style={styles.conclusionBody}>
      <Skeleton width={120} height={11} radius={4} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton style={{ flex: 1 }} height={92} radius={16} />
        <Skeleton style={{ flex: 1 }} height={92} radius={16} />
        <Skeleton style={{ flex: 1 }} height={92} radius={16} />
      </View>
      <Skeleton width={'100%'} height={104} radius={12} style={{ marginTop: 8 }} />
      <View style={{ gap: 10, marginTop: 8 }}>
        <Skeleton width={110} height={12} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton width={96} height={96} radius={12} />
          <Skeleton width={96} height={96} radius={12} />
        </View>
      </View>
    </View>
  );
});

// ── table: header row + data rows + add button ───────────────────────────────
const TableBodySkeleton = memo(function TableBodySkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.tableBody}>
      <Skeleton width={'100%'} height={40} radius={10} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width={'100%'} height={48} radius={10} />
      ))}
      <Skeleton width={150} height={42} radius={1000} style={{ marginTop: 6 }} />
    </View>
  );
});

// ── question: generic wizard step (title + two answers + photos + notes) ─────
const QuestionBodySkeleton = memo(function QuestionBodySkeleton() {
  return (
    <View style={styles.questionBody}>
      <View style={{ gap: 10 }}>
        <Skeleton width={'85%'} height={20} />
        <Skeleton width={'55%'} height={20} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton width={'48%'} height={54} radius={14} />
        <Skeleton width={'48%'} height={54} radius={14} />
      </View>
      <View style={{ gap: 10 }}>
        <Skeleton width={110} height={12} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton width={110} height={110} radius={12} />
          <Skeleton width={110} height={110} radius={12} />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Skeleton width={80} height={10} />
        <Skeleton width={'100%'} height={100} radius={12} />
      </View>
    </View>
  );
});

/**
 * Dispatch a step body skeleton by variant. `fields` is only read by the
 * `form` variant. Falls back to `form` for an unknown/omitted variant.
 */
export const StepBodySkeleton = memo(function StepBodySkeleton({
  variant = 'form',
  fields,
}: {
  variant?: StepSkeletonVariant;
  fields?: number;
}) {
  switch (variant) {
    case 'keypad':
      return <KeypadBodySkeleton />;
    case 'checklist':
      return <ChecklistBodySkeleton />;
    case 'conclusion':
      return <ConclusionBodySkeleton />;
    case 'table':
      return <TableBodySkeleton />;
    case 'question':
      return <QuestionBodySkeleton />;
    case 'form':
    default:
      return <FormBodySkeleton fields={fields} />;
  }
});

const styles = StyleSheet.create({
  formBody: { flex: 1, paddingHorizontal: 24, paddingTop: 16, gap: 14 },
  keypadHead: { paddingTop: 32, paddingHorizontal: 20, alignItems: 'center', gap: 16 },
  keypadGrid: { padding: 10, gap: 8 },
  keypadRow: { flexDirection: 'row', gap: 8 },
  listBody: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  conclusionBody: { flex: 1, paddingHorizontal: 24, paddingTop: 16, gap: 10 },
  tableBody: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  questionBody: { padding: 24, gap: 24 },
});
