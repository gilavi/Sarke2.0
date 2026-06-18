/**
 * Per-step body skeletons for inspection flows.
 *
 * Each variant mirrors the *shape* of one kind of inspection step (form /
 * keypad / checklist / conclusion / table / radio-list / identification /
 * documents / question) so that while a flow blocks on its initial fetch (or
 * is restored mid-flow from AsyncStorage), the body placeholder already looks
 * like the step it is about to become — instead of one generic stack of bars
 * for every step (which reads like a dashboard skeleton).
 *
 * These are BODIES ONLY: the header (FlowHeader + progress bar) and the footer
 * button are owned by {@link InspectionShellSkeleton}, which never waits on
 * loading. Every piece is built from the shared {@link Skeleton} atom, so the
 * shimmer colour + animation stay identical across all flows — the only thing
 * that changes step to step is the *layout*.
 *
 * Variants compose from a small set of inline shape helpers (field group,
 * section label, verdict buttons, notes box, photo strip, row card, …) so two
 * steps that look alike reuse the same building blocks.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from '../Skeleton';
import { useTheme, type Theme } from '../../lib/theme';

export type StepSkeletonVariant =
  | 'form' // stacked label + input-bar field groups (identification / single-field steps)
  | 'keypad' // PlateInput + SerialKeypad
  | 'checklist' // ChecklistStep legend + result rows
  | 'conclusion' // illustration + verdict buttons + notes + photos (params: verdicts, photos)
  | 'table' // DynamicTable-style numbered row-cards + add button
  | 'tablePhotos' // table row-cards + add button + a trailing photo strip
  | 'radioList' // caption + stacked single-select radio rows
  | 'identForm' // sectioned identification form (section labels + selector row + fields + chips + date)
  | 'docsPhotos' // a large photo-capture card + a horizontal photo-tile strip
  | 'question'; // generic wizard question (illustration + title + answers + photos + notes)

// ── Reusable shape helpers ───────────────────────────────────────────────────
// Plain render helpers (not components) so a single useTheme() per variant
// drives the whole body.

function FieldGroup({ theme, labelWidth = '34%' }: { theme: Theme; labelWidth?: `${number}%` }) {
  return (
    <View style={{ gap: 6 }}>
      <Skeleton width={labelWidth} height={10} radius={4} />
      <Skeleton width={'100%'} height={52} radius={theme.radius.input} />
    </View>
  );
}

function SectionLabel({ width = '32%' }: { width?: `${number}%` }) {
  return <Skeleton width={width} height={11} radius={4} />;
}

function PhotoStripBlock({ tiles = 2, size = 96, labelWidth = 110 }: { tiles?: number; size?: number; labelWidth?: number }) {
  return (
    <View style={{ gap: 10 }}>
      <Skeleton width={labelWidth} height={12} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {Array.from({ length: tiles }).map((_, i) => (
          <Skeleton key={i} width={size} height={size} radius={12} />
        ))}
      </View>
    </View>
  );
}

// ── form: stacked field groups (label stub + input bar) ──────────────────────
const FormBodySkeleton = memo(function FormBodySkeleton({ fields = 3 }: { fields?: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.formBody}>
      {Array.from({ length: Math.max(1, fields) }).map((_, i) => (
        // vary the label stub width a touch so it reads like real form labels
        <FieldGroup key={i} theme={theme} labelWidth={`${28 + (i % 3) * 8}%` as `${number}%`} />
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

// ── conclusion: illustration + verdict buttons + notes + photos ──────────────
// `verdicts` = number of big verdict buttons (0 hides the row, e.g. the
// general-equipment flow has no verdict). `photos` toggles the photo strip.
const ConclusionBodySkeleton = memo(function ConclusionBodySkeleton({
  verdicts = 3,
  photos = true,
}: {
  verdicts?: number;
  photos?: boolean;
}) {
  return (
    <View style={styles.conclusionBody}>
      <View style={styles.illustration}>
        <Skeleton width={72} height={72} radius={36} />
      </View>
      {verdicts > 0 ? (
        <>
          <Skeleton width={120} height={11} radius={4} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Array.from({ length: verdicts }).map((_, i) => (
              <Skeleton key={i} style={{ flex: 1 }} height={92} radius={16} />
            ))}
          </View>
        </>
      ) : null}
      <Skeleton width={90} height={11} radius={4} style={{ marginTop: 8 }} />
      <Skeleton width={'100%'} height={104} radius={12} />
      {photos ? <View style={{ marginTop: 8 }}>{PhotoStripBlock({ tiles: 2, size: 96 })}</View> : null}
    </View>
  );
});

// ── table: DynamicTable-style numbered row-cards + add button ─────────────────
// Mirrors the real DynamicTable: each row is a bordered card (number badge +
// delete, then stacked input cells), NOT a thin spreadsheet row. `photos` adds
// the trailing photo strip some steps render beneath the table.
const TableBodySkeleton = memo(function TableBodySkeleton({
  rows = 3,
  photos = false,
}: {
  rows?: number;
  photos?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.tableBody}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.rowCard, { borderColor: theme.colors.hairline }]}>
          <View style={styles.rowCardHead}>
            <Skeleton width={22} height={22} radius={11} />
            <Skeleton width={26} height={26} radius={8} />
          </View>
          <Skeleton width={'100%'} height={46} radius={theme.radius.input} />
          <Skeleton width={'100%'} height={46} radius={theme.radius.input} />
        </View>
      ))}
      <Skeleton width={180} height={40} radius={10} style={{ marginTop: 2 }} />
      {photos ? (
        <View style={{ marginTop: 14 }}>{PhotoStripBlock({ tiles: 3, size: 72, labelWidth: 130 })}</View>
      ) : null}
    </View>
  );
});

// ── radioList: caption + stacked single-select radio rows ────────────────────
const RadioListBodySkeleton = memo(function RadioListBodySkeleton({ rows = 3 }: { rows?: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.formBody}>
      <SectionLabel width={'40%'} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.radioRow, { borderColor: theme.colors.hairline }]}>
          <Skeleton width={`${48 + (i % 3) * 10}%` as `${number}%`} height={13} />
          <Skeleton width={22} height={22} radius={11} />
        </View>
      ))}
    </View>
  );
});

// ── identForm: sectioned identification form (slings / equipment ID) ─────────
// section label + a tappable selector row, then grouped fields, a marking
// chip row, and a final date field — the SlingsIdentificationStep shape.
const IdentFormBodySkeleton = memo(function IdentFormBodySkeleton() {
  const { theme } = useTheme();
  return (
    <View style={styles.formBody}>
      <SectionLabel width={'28%'} />
      <View style={[styles.selectorRow, { borderColor: theme.colors.hairline }]}>
        <Skeleton width={'55%'} height={14} />
        <Skeleton width={20} height={20} radius={6} />
      </View>

      <SectionLabel width={'34%'} />
      <Skeleton width={'100%'} height={52} radius={theme.radius.input} />
      <Skeleton width={'100%'} height={52} radius={theme.radius.input} />

      <SectionLabel width={'40%'} />
      <Skeleton width={'100%'} height={52} radius={theme.radius.input} />
      <Skeleton width={'100%'} height={52} radius={theme.radius.input} />
      <Skeleton width={'100%'} height={52} radius={theme.radius.input} />

      <SectionLabel width={'30%'} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton width={72} height={34} radius={16} />
        <Skeleton width={88} height={34} radius={16} />
        <Skeleton width={64} height={34} radius={16} />
      </View>

      <SectionLabel width={'42%'} />
      <Skeleton width={'100%'} height={52} radius={theme.radius.input} />
    </View>
  );
});

// ── docsPhotos: a large photo-capture card + a horizontal photo-tile strip ───
const DocsPhotosBodySkeleton = memo(function DocsPhotosBodySkeleton() {
  return (
    <View style={styles.formBody}>
      <SectionLabel width={'60%'} />
      <Skeleton width={'100%'} height={128} radius={12} />
      <View style={{ marginTop: 10 }}>{PhotoStripBlock({ tiles: 3, size: 64, labelWidth: 120 })}</View>
    </View>
  );
});

// ── question: generic wizard step (illustration + title + answers + photos) ──
const QuestionBodySkeleton = memo(function QuestionBodySkeleton() {
  return (
    <View style={styles.questionBody}>
      <View style={styles.illustration}>
        <Skeleton width={88} height={88} radius={20} />
      </View>
      <View style={{ gap: 10, alignItems: 'center' }}>
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
 * Dispatch a step body skeleton by variant. `fields` is read by the `form`
 * variant; `verdicts` + `photos` by `conclusion`; `photos` also adds the
 * trailing photo strip on `table`/`tablePhotos`. Falls back to `form` for an
 * unknown/omitted variant.
 */
export const StepBodySkeleton = memo(function StepBodySkeleton({
  variant = 'form',
  fields,
  verdicts,
  photos,
}: {
  variant?: StepSkeletonVariant;
  fields?: number;
  /** conclusion: number of verdict buttons (default 3; 0 = none). */
  verdicts?: number;
  /** conclusion: show the photo strip (default true). */
  photos?: boolean;
}) {
  switch (variant) {
    case 'keypad':
      return <KeypadBodySkeleton />;
    case 'checklist':
      return <ChecklistBodySkeleton />;
    case 'conclusion':
      return <ConclusionBodySkeleton verdicts={verdicts} photos={photos} />;
    case 'table':
      return <TableBodySkeleton />;
    case 'tablePhotos':
      return <TableBodySkeleton photos />;
    case 'radioList':
      return <RadioListBodySkeleton />;
    case 'identForm':
      return <IdentFormBodySkeleton />;
    case 'docsPhotos':
      return <DocsPhotosBodySkeleton />;
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
  conclusionBody: { flex: 1, paddingHorizontal: 24, paddingTop: 12, gap: 10 },
  tableBody: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  questionBody: { padding: 24, gap: 24 },
  illustration: { alignItems: 'center', paddingVertical: 4 },
  rowCard: {
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
});
