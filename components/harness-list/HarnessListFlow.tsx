import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import type { Answer, AnswerPhoto, GridValues, Question, Template } from '../../types/models';
import { TourGuide, type TourStep } from '../TourGuide';
import { useScaffoldHelpSheet } from '../ScaffoldHelpSheet';
import {
  buildItems,
  captionFor,
  cellState,
  readComment,
  rowLabelsFor,
  type HarnessItem,
} from './_shared';
import { gets } from './styles';
import { ChipRow } from './ChipRow';

export type HarnessListFlowProps = {
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
  const [step, setStep] = useState<'count' | 'list'>('count');
  const [currentRowIdx, setCurrentRowIdx] = useState(0);
  const showHelp = useScaffoldHelpSheet();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }} edges={['top']}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={s.eyebrow}>ქამრების შემოწმება</Text>
          <View style={{ flex: 1 }} />
          <Pressable hitSlop={12} onPress={onClose} style={s.closeBtn} accessibilityLabel="დახურვა">
            <Ionicons name="close" size={22} color={theme.colors.ink} />
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.ink }}>
            რამდენი ქამარი სულ?
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 28 }}>
            <Pressable
              onPress={() => setHarnessRowCount(Math.max(1, harnessRowCount - 1))}
              hitSlop={12}
              disabled={harnessRowCount <= 1}
              style={harnessRowCount <= 1 ? { opacity: 0.35 } : undefined}
            >
              <Ionicons name="remove-circle" size={52} color={theme.colors.accent} />
            </Pressable>
            <Text style={{ fontSize: 72, fontWeight: '800', color: theme.colors.ink, minWidth: 80, textAlign: 'center' }}>
              {harnessRowCount}
            </Text>
            <Pressable
              onPress={() => setHarnessRowCount(Math.min(15, harnessRowCount + 1))}
              hitSlop={12}
              disabled={harnessRowCount >= 15}
              style={harnessRowCount >= 15 ? { opacity: 0.35 } : undefined}
            >
              <Ionicons name="add-circle" size={52} color={theme.colors.accent} />
            </Pressable>
          </View>
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

  const setCell = async (item: HarnessItem, r: string, value: 'ok' | 'bad') => {
    haptic.light();
    await onPatchAnswer(item.question, a => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      const cur: Record<string, string> = { ...(grid[r] ?? {}) };
      cur[item.col] = value;
      if (value === 'ok') delete cur[`კომენტარი_${item.col}`];
      grid[r] = cur;
      return { ...a, grid_values: grid };
    });
    // Remove photos when marking good
    if (value === 'ok') {
      const tag = captionFor(r, item.col);
      const a = answers[item.question.id];
      const cellPhotos = a ? photos[a.id] ?? [] : [];
      for (const p of cellPhotos) if (p.caption === tag) void onDeletePhoto(p);
    }
  };

  const onCommentChange = (item: HarnessItem, text: string) =>
    onPatchAnswer(item.question, a => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      const cur: Record<string, string> = { ...(grid[row] ?? {}) };
      if (text.trim()) cur[`კომენტარი_${item.col}`] = text;
      else delete cur[`კომენტარი_${item.col}`];
      grid[row] = cur;
      return { ...a, grid_values: grid };
    });

  const applyAutoOkForCurrentRow = async () => {
    for (const item of items) {
      const v = answers[item.question.id]?.grid_values?.[row]?.[item.col];
      if (v !== undefined) continue;
      await onPatchAnswer(item.question, a => {
        const grid: GridValues = { ...(a.grid_values ?? {}) };
        const cur: Record<string, string> = { ...(grid[row] ?? {}) };
        cur[item.col] = 'ok';
        grid[row] = cur;
        return { ...a, grid_values: grid };
      });
    }
  };

  const advance = () => {
    if (safeRowIdx + 1 >= rowLabels.length) {
      onConclude();
    } else {
      setCurrentRowIdx(safeRowIdx + 1);
    }
  };

  const confirmCurrentRow = () => {
    haptic.success();
    // Advance first so the user moves on immediately.
    // Auto-ok fires after (using captured `row`/`answers` from this render)
    // so there's no visible flash of chips changing state.
    advance();
    void applyAutoOkForCurrentRow();
  };

  const badCountThisRow = items.reduce(
    (n, it) => (cellState(answers, it, row) === 'bad' ? n + 1 : n),
    0,
  );

  return (
    <TourGuide tourId="harness_list_v2" steps={tourSteps}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }} edges={['top']}>
        <View ref={headerRef} collapsable={false} style={s.header}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>ქამრების შემოწმება</Text>
              <Text style={s.title}>
                ქამარი {safeRowIdx + 1} / {rowLabels.length}
              </Text>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={s.closeBtn} accessibilityLabel="დახურვა">
              <Ionicons name="close" size={22} color={theme.colors.ink} />
            </Pressable>
          </View>
          <Text style={s.helpHint}>
            ყველა კომპონენტი ✓-ადაა. სადაც პრობლემაა — მონიშნეთ ✗.
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {items.map((item, idx) => {
            const state = cellState(answers, item, row);
            const comment = readComment(answers, item, row);
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
                onOk={() => setCell(item, row, 'ok')}
                onBad={() => setCell(item, row, 'bad')}
                onCommentChange={text => onCommentChange(item, text)}
                onPickPhoto={() => onPickItemPhoto(item.question, row, item.col)}
                onDeletePhoto={onDeletePhoto}
                onHelp={() => showHelp(item.label)}
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