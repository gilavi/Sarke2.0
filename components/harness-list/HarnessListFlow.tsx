import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import type { Answer, AnswerPhoto, GridValues, Question, Template } from '../../types/models';
import { TourGuide, type TourStep } from '../TourGuide';
import { useScaffoldHelpSheet } from '../ScaffoldHelpSheet';
import { ChipNavStrip, type ChipNavItem } from '../inspection-parts/ChipNavStrip';
import { QuantitySelector } from '../inputs/QuantitySelector';
import {
  buildItems,
  captionFor,
  rowLabelsFor,
  type HarnessItem,
} from './_shared';
import { gets } from './styles';
import { ChipRow } from './ChipRow';

// Survives remounts within a session (keyed by inspection id) so an
// unexpected unmount of this full-screen takeover doesn't bounce the user
// back to the count picker — it restores their place (list + active harness).
const flowPos = new Map<string, { step: 'count' | 'list'; rowIdx: number }>();

function cloneGrid(g?: GridValues | null): GridValues {
  return g ? JSON.parse(JSON.stringify(g)) : {};
}

// The harness template defines a fixed N1–N15 grid and the legal PDF renders
// exactly those rows, so the count is capped at 15 (see rowLabelsFor).
const HARNESS_MAX = 15;
const HARNESS_COUNT_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];

export type HarnessListFlowProps = {
  inspectionId: string;
  template: Template;
  questions: Question[];
  answers: Record<string, Answer>;
  photos: Record<string, AnswerPhoto[]>;
  harnessRowCount: number;
  setHarnessRowCount: (n: number) => void;
  onPatchAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onPickItemPhoto: (q: Question, row: string, col: string) => void;
  onDeletePhoto: (p: AnswerPhoto) => Promise<void>;
  onClose: () => void;
  onConclude: () => void;
};

export function HarnessListFlow(props: HarnessListFlowProps) {
  const { theme } = useTheme();
  const s = useMemo(() => gets(theme), [theme]);
  const {
    inspectionId,
    questions,
    answers,
    photos,
    harnessRowCount,
    setHarnessRowCount,
    onPatchAnswer,
    onPickItemPhoto,
    onDeletePhoto,
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

  // Local draft of grid values (row → col → value), keyed by question id,
  // seeded from the persisted answers. ✓/✗ taps and comment edits mutate this
  // ONLY — we persist to the server (onPatchAnswer) when the user advances or
  // leaves, never on every tap/keystroke. Persisting per interaction re-rendered
  // the parent wizard and reloaded the whole screen.
  const [draft, setDraft] = useState<Record<string, GridValues>>(() => {
    const d: Record<string, GridValues> = {};
    for (const it of items) {
      if (!d[it.question.id]) d[it.question.id] = cloneGrid(answers[it.question.id]?.grid_values);
    }
    return d;
  });
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const draftStateOf = (item: HarnessItem, r: string): 'ok' | 'bad' | undefined => {
    const v = draft[item.question.id]?.[r]?.[item.col];
    if (v === 'bad' || v === 'დაზიანებულია') return 'bad';
    if (v === 'ok' || v === 'ვარგისია') return 'ok';
    return undefined;
  };
  const draftCommentOf = (item: HarnessItem, r: string): string =>
    draft[item.question.id]?.[r]?.[`კომენტარი_${item.col}`] ?? '';

  // Stable handlers (item/row passed in) so memoized ChipRows only re-render
  // when their own row's data changes.
  const handleSet = useCallback((item: HarnessItem, r: string, value: 'ok' | 'bad') => {
    haptic.light();
    setDraft(prev => {
      const grid: GridValues = { ...(prev[item.question.id] ?? {}) };
      const cur: Record<string, string> = { ...(grid[r] ?? {}) };
      cur[item.col] = value;
      if (value === 'ok') delete cur[`კომენტარი_${item.col}`];
      grid[r] = cur;
      return { ...prev, [item.question.id]: grid };
    });
  }, []);

  const handleComment = useCallback((item: HarnessItem, r: string, text: string) => {
    setDraft(prev => {
      const grid: GridValues = { ...(prev[item.question.id] ?? {}) };
      const cur: Record<string, string> = { ...(grid[r] ?? {}) };
      if (text.trim()) cur[`კომენტარი_${item.col}`] = text;
      else delete cur[`კომენტარი_${item.col}`];
      grid[r] = cur;
      return { ...prev, [item.question.id]: grid };
    });
  }, []);

  const handlePickPhoto = useCallback(
    (item: HarnessItem, r: string) => onPickItemPhoto(item.question, r, item.col),
    [onPickItemPhoto],
  );

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
      // Drop photos for cells that ended up marked good.
      for (const it of items) {
        const grid = snap[it.question.id];
        if (!grid) continue;
        for (const r of Object.keys(grid)) {
          const v = grid[r]?.[it.col];
          if (v !== 'ok' && v !== 'ვარგისია') continue;
          const a = answersRef.current[it.question.id];
          const cellPhotos = a ? photosRef.current[a.id] ?? [] : [];
          const tag = captionFor(r, it.col);
          for (const p of cellPhotos) if (p.caption === tag) void onDeletePhoto(p);
        }
      }
    },
    [items, onPatchAnswer, onDeletePhoto],
  );

  // Tour refs
  const headerRef = useRef<View>(null);
  const firstRowRef = useRef<View>(null);
  const confirmRef = useRef<View>(null);
  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        targetRef: headerRef,
        title: 'კომპონენტების შემოწმება',
        body: 'ყოველი ქამარისთვის მონიშნეთ ✓ (კარგი) ან ✗ (პრობლემა)',
        position: 'bottom',
      },
      {
        targetRef: firstRowRef,
        title: 'სტატუსი',
        body: 'შეეხეთ ✓ ან ✗ — ✗ გახსნის კომენტარის ველს',
        position: 'bottom',
      },
      {
        targetRef: confirmRef,
        title: 'დადასტურება',
        body: 'დასრულებისას დააჭირეთ — გამოუმჩინებელი ავტომატურად კარგად ჩაითვლება',
        position: 'top',
      },
    ],
    [],
  );

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
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={s.eyebrow}>ქამრების შემოწმება</Text>
          <View style={{ flex: 1 }} />
          <Pressable hitSlop={12} onPress={onClose} style={s.closeBtn} accessibilityLabel="დახურვა">
            <Ionicons name="close" size={22} color={theme.colors.ink} />
          </Pressable>
        </View>

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
      </SafeAreaView>
    );
  }

  // ── Step 2: per-harness chip list ───────────────────────────────────────────
  const safeRowIdx = Math.min(currentRowIdx, rowLabels.length - 1);
  const row = rowLabels[safeRowIdx];

  // Snapshot of the draft with every unanswered cell in the current row
  // defaulted to 'ok' (the harness convention).
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
      // Advancing between harnesses is purely local — only the list (middle)
      // re-renders; the header stays put and nothing is sent to the server,
      // so there's no full-screen reload. Persistence happens on conclude/close.
      setDraft(snap);
      setCurrentRowIdx(safeRowIdx + 1);
    }
  };

  // Leaving the flow persists whatever's been entered so far.
  const handleClose = () => {
    void flush();
    onClose();
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
    <TourGuide tourId="harness_list_v2" steps={tourSteps}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
        <View ref={headerRef} collapsable={false} style={s.header}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>ქამრების შემოწმება</Text>
              <Text style={s.title}>
                ქამარი {safeRowIdx + 1} / {rowLabels.length}
              </Text>
            </View>
            <Pressable hitSlop={12} onPress={handleClose} style={s.closeBtn} accessibilityLabel="დახურვა">
              <Ionicons name="close" size={22} color={theme.colors.ink} />
            </Pressable>
          </View>
          <Text style={s.helpHint}>
            ყველა კომპონენტი ✓-ადაა. სადაც პრობლემაა — მონიშნეთ ✗.
          </Text>
        </View>

        <ChipNavStrip
          items={harnessChips}
          activeIndex={safeRowIdx}
          onSelect={setCurrentRowIdx}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {items.map((item, idx) => {
            const state = draftStateOf(item, row);
            const comment = draftCommentOf(item, row);
            const a = answers[item.question.id];
            const allPhotos = a ? photos[a.id] ?? [] : [];
            const cellPhotos = allPhotos.filter(p => p.caption === captionFor(row, item.col));
            return (
              <ChipRow
                key={item.itemKey}
                item={item}
                row={row}
                state={state}
                comment={comment}
                cellPhotos={cellPhotos}
                onSet={handleSet}
                onCommentChange={handleComment}
                onPickPhoto={handlePickPhoto}
                onDeletePhoto={onDeletePhoto}
                onHelp={handleHelp}
                rowRef={idx === 0 ? firstRowRef : undefined}
              />
            );
          })}
        </ScrollView>

        <View ref={confirmRef} collapsable={false} style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable
            onPress={confirmCurrentRow}
            style={({ pressed }) => [s.bigCta, pressed && { opacity: 0.88 }]}
            accessibilityLabel={`ქამარი ${safeRowIdx + 1} დადასტურება`}
          >
            <Text style={s.bigCtaText}>
              {`ქამარი ${safeRowIdx + 1}${badCountThisRow > 0 ? ` · ${badCountThisRow} პრობლემა` : ''} — დადასტურება →`}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </TourGuide>
  );
}