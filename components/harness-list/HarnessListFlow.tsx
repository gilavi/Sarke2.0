import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import type { Answer, GridValues, Question, Template } from '../../types/models';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { FlowHeader } from '../FlowHeader';
import { useScaffoldHelpSheet } from '../ScaffoldHelpSheet';
import { ChipNavStrip, type ChipNavItem } from '../inspection-parts/ChipNavStrip';
import { ChecklistLegend } from '../inspection-parts/ChecklistLegend';
import { QuantitySelector } from '../inputs/QuantitySelector';
import { buildItems, rowLabelsFor, type HarnessItem } from './_shared';
import { gets } from './styles';
import { ChipRow } from './ChipRow';

// Survives remounts within a session (keyed by inspection id) so an
// unexpected unmount of this full-screen takeover doesn't bounce the user
// back to the count picker - it restores their place (list + active harness).
const flowPos = new Map<string, { step: 'count' | 'list'; rowIdx: number }>();

function cloneGrid(g?: GridValues | null): GridValues {
  return g ? JSON.parse(JSON.stringify(g)) : {};
}

// The harness template defines a fixed N1–N15 grid and the legal PDF renders
// exactly those rows, so the count is capped at 15 (see rowLabelsFor).
const HARNESS_MAX = 15;
const HARNESS_COUNT_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];

const LEGEND = [
  { icon: 'checkmark' as const, label: 'გამართული' },
  { icon: 'close' as const, label: 'დაზიანებული' },
];

export type HarnessListFlowProps = {
  inspectionId: string;
  template: Template;
  /** Only the name is shown (header subtitle) - kept loose so callers can pass a partial. */
  project: { name: string; logo?: string | null } | null;
  questions: Question[];
  answers: Record<string, Answer>;
  harnessRowCount: number;
  setHarnessRowCount: (n: number) => void;
  /** 1-based position of the harness step in the overall wizard (for the header counter). */
  stepIndex: number;
  totalSteps: number;
  onPatchAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  /** Wizard "go to previous step" - used by the header back from the count screen. */
  onBack: () => void;
  onClose: () => void;
  onConclude: () => void;
};

export function HarnessListFlow(props: HarnessListFlowProps) {
  const { theme } = useTheme();
  const s = useMemo(() => gets(theme), [theme]);
  const {
    inspectionId,
    template,
    project,
    questions,
    answers,
    harnessRowCount,
    setHarnessRowCount,
    stepIndex,
    totalSteps,
    onPatchAnswer,
    onBack,
    onClose,
    onConclude,
  } = props;

  const insets = useSafeAreaInsets();
  const items = useMemo(() => buildItems(questions), [questions]);
  const rowLabels = useMemo(
    () => rowLabelsFor(questions, harnessRowCount),
    [questions, harnessRowCount],
  );
  /** 'count' = number picker; 'list' = per-harness chip list */
  const restored = flowPos.get(inspectionId);
  const [step, setStep] = useState<'count' | 'list'>(restored?.step ?? 'count');
  const [currentRowIdx, setCurrentRowIdx] = useState(restored?.rowIdx ?? 0);
  // Persist position so a remount restores it instead of resetting to 'count'.
  useEffect(() => {
    flowPos.set(inspectionId, { step, rowIdx: currentRowIdx });
  }, [inspectionId, step, currentRowIdx]);
  const showHelp = useScaffoldHelpSheet();

  // Local draft of grid values (row → col → value), keyed by question id, seeded
  // from the persisted answers. ✓/✗ taps mutate this ONLY - we persist to the
  // server (onPatchAnswer) when the user advances or leaves, never on every tap.
  const [draft, setDraft] = useState<Record<string, GridValues>>(() => {
    const d: Record<string, GridValues> = {};
    for (const it of items) {
      if (!d[it.question.id]) d[it.question.id] = cloneGrid(answers[it.question.id]?.grid_values);
    }
    return d;
  });
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const draftStateOf = (item: HarnessItem, r: string): 'ok' | 'bad' | undefined => {
    const v = draft[item.question.id]?.[r]?.[item.col];
    if (v === 'bad' || v === 'დაზიანებულია') return 'bad';
    if (v === 'ok' || v === 'ვარგისია') return 'ok';
    return undefined;
  };

  // Stable handler (item/row passed in) so memoized ChipRows only re-render when
  // their own row's data changes. `null` clears the cell back to unanswered.
  const handleSet = useCallback((item: HarnessItem, r: string, value: 'ok' | 'bad' | null) => {
    haptic.light();
    setDraft(prev => {
      const grid: GridValues = { ...(prev[item.question.id] ?? {}) };
      const cur: Record<string, string> = { ...(grid[r] ?? {}) };
      if (value === null) delete cur[item.col];
      else cur[item.col] = value;
      grid[r] = cur;
      return { ...prev, [item.question.id]: grid };
    });
  }, []);

  const handleHelp = useCallback((item: HarnessItem) => showHelp(item.label), [showHelp]);

  // Persist the whole draft to the server. Called on advance/leave only.
  const flush = useCallback(
    async (snapshot?: Record<string, GridValues>) => {
      const snap = snapshot ?? draftRef.current;
      const byQuestion = new Map<string, Question>();
      for (const it of items) byQuestion.set(it.question.id, it.question);
      for (const [qid, grid] of Object.entries(snap)) {
        const q = byQuestion.get(qid);
        if (!q) continue;
        await onPatchAnswer(q, a => ({ ...a, grid_values: grid }));
      }
    },
    [items, onPatchAnswer],
  );

  const flowTitle = template.name ? inspectionDisplayName(template.name) : 'ქამრების შემოწმება';

  // Leaving the flow persists whatever's been entered so far.
  const handleClose = useCallback(() => {
    void flush();
    onClose();
  }, [flush, onClose]);

  // Back from the count screen exits the harness step (persist first).
  const handleExit = useCallback(() => {
    void flush();
    onBack();
  }, [flush, onBack]);

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
          ამ შაბლონში ქამრის კომპონენტები ვერ მოიძებნა.
        </Text>
        <View style={{ height: 16 }} />
        <Pressable
          onPress={onClose}
          style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.colors.subtleSurface, borderRadius: 12 }}
        >
          <Text style={{ fontWeight: '700', color: theme.colors.ink }}>გასვლა</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Step 1: count picker ────────────────────────────────────────────────────
  if (step === 'count') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        <FlowHeader
          flowTitle={flowTitle}
          project={project}
          step={stepIndex + 1}
          totalSteps={totalSteps}
          leading="back"
          trailing="close"
          backDisabled={stepIndex === 0}
          onBack={handleExit}
          onClose={handleClose}
          surfaceColor={theme.colors.surface}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.ink }}>
            რამდენი ქამარი სულ?
          </Text>
          <QuantitySelector
            value={harnessRowCount}
            onChange={setHarnessRowCount}
            presets={HARNESS_COUNT_PRESETS}
            min={1}
            max={HARNESS_MAX}
            accessibilityLabelPrefix="ქამრების რაოდენობა"
          />
        </View>

        <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable
            onPress={() => {
              setCurrentRowIdx(0);
              setStep('list');
            }}
            style={({ pressed }) => [s.bigCta, pressed && { opacity: 0.88 }]}
          >
            <Text style={s.bigCtaText}>დაწყება →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Step 2: per-harness chip list ───────────────────────────────────────────
  const safeRowIdx = Math.min(currentRowIdx, rowLabels.length - 1);
  const row = rowLabels[safeRowIdx];

  // Snapshot of the draft with every unanswered cell in the current row defaulted
  // to 'ok' - the harness convention so the legal PDF has a value for every cell.
  const buildAutoOkSnapshot = (): Record<string, GridValues> => {
    const snap: Record<string, GridValues> = {};
    for (const [qid, g] of Object.entries(draftRef.current)) snap[qid] = cloneGrid(g);
    for (const item of items) {
      const qid = item.question.id;
      if (!snap[qid]) snap[qid] = {};
      const cur: Record<string, string> = { ...(snap[qid][row] ?? {}) };
      if (cur[item.col] === undefined) cur[item.col] = 'ok';
      snap[qid][row] = cur;
    }
    return snap;
  };

  const confirmCurrentRow = () => {
    haptic.success();
    const snap = buildAutoOkSnapshot();
    if (safeRowIdx + 1 >= rowLabels.length) {
      // Last harness: persist everything once, then leave the flow.
      setDraft(snap);
      void flush(snap).then(onConclude);
    } else {
      // Advancing between harnesses is purely local - persistence happens on
      // conclude/close, so there's no full-screen reload.
      setDraft(snap);
      setCurrentRowIdx(safeRowIdx + 1);
    }
  };

  const badCountThisRow = items.reduce(
    (n, it) => (draftStateOf(it, row) === 'bad' ? n + 1 : n),
    0,
  );

  // Secondary navigation: one chip per harness, so the user can jump around
  // instead of only advancing linearly via "დადასტურება →".
  const harnessChips: ChipNavItem[] = rowLabels.map(r => {
    const hasBad = items.some(it => draftStateOf(it, r) === 'bad');
    const allSet = items.every(it => draftStateOf(it, r) !== undefined);
    return { key: r, label: r, state: hasBad ? 'problem' : allSet ? 'done' : 'pending' };
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <FlowHeader
        flowTitle={flowTitle}
        project={project}
        step={stepIndex + 1}
        totalSteps={totalSteps}
        leading="back"
        trailing="close"
        onBack={() => setStep('count')}
        onClose={handleClose}
        surfaceColor={theme.colors.surface}
      />

      <ChipNavStrip
        items={harnessChips}
        activeIndex={safeRowIdx}
        onSelect={setCurrentRowIdx}
        tone="neutral"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <ChecklistLegend items={LEGEND} />
        {items.map(item => (
          <ChipRow
            key={item.itemKey}
            item={item}
            row={row}
            state={draftStateOf(item, row)}
            onSet={handleSet}
            onHelp={handleHelp}
          />
        ))}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          onPress={confirmCurrentRow}
          style={({ pressed }) => [s.bigCta, pressed && { opacity: 0.88 }]}
          accessibilityLabel={`ქამარი ${safeRowIdx + 1} დადასტურება`}
        >
          <Text style={s.bigCtaText}>
            {`ქამარი ${safeRowIdx + 1}${badCountThisRow > 0 ? ` · ${badCountThisRow} პრობლემა` : ''} - დადასტურება →`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
