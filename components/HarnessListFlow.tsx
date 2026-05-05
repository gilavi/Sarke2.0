import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { A11yText as Text } from './primitives/A11yText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { imageForDisplay } from '../lib/imageUrl';
import { STORAGE_BUCKETS } from '../lib/supabase';
import type { Answer, AnswerPhoto, GridValues, Question, Template } from '../types/models';
import { TourGuide, type TourStep } from './TourGuide';
import { HelpIcon, useScaffoldHelpSheet } from './ScaffoldHelpSheet';
import { FloatingLabelInput } from './inputs/FloatingLabelInput';

const BRAND_GREEN = '#1D9E75';

type HarnessItem = {
  question: Question;
  col: string;
  label: string;
  itemKey: string;
};

function buildItems(questions: Question[]): HarnessItem[] {
  const out: HarnessItem[] = [];
  const grids = questions.filter(
    q => q.type === 'component_grid' && (q.grid_rows?.[0] ?? '') === 'N1',
  );
  for (const q of grids) {
    for (const col of q.grid_cols ?? []) {
      if (col === 'კომენტარი') continue;
      out.push({ question: q, col, label: col, itemKey: `${q.id}::${col}` });
    }
  }
  return out;
}

function rowLabelsFor(questions: Question[], harnessRowCount: number): string[] {
  const first = questions.find(
    q => q.type === 'component_grid' && (q.grid_rows?.[0] ?? '') === 'N1',
  );
  const all = first?.grid_rows ?? [];
  return all.slice(0, Math.min(harnessRowCount, all.length));
}

/** Returns 'bad' | 'ok' | undefined (untouched) */
function cellState(
  answers: Record<string, Answer>,
  item: HarnessItem,
  row: string,
): 'bad' | 'ok' | undefined {
  const v = answers[item.question.id]?.grid_values?.[row]?.[item.col];
  if (v === 'bad' || v === 'დაზიანებულია') return 'bad';
  if (v === 'ok' || v === 'ვარგისია') return 'ok';
  return undefined;
}

function readComment(answers: Record<string, Answer>, item: HarnessItem, row: string): string {
  return answers[item.question.id]?.grid_values?.[row]?.[`კომენტარი_${item.col}`] ?? '';
}

function captionFor(row: string, col: string) {
  return `row:${row}:col:${col}`;
}

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
  console.log('[HarnessListFlow] render start');
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
  console.log('[HarnessListFlow] items:', items.length, 'rowLabels:', rowLabels.length, 'harnessRowCount:', harnessRowCount);

  /** 'count' = number picker; 'list' = per-harness chip list */
  const [step, setStep] = useState<'count' | 'list'>('count');
  const [currentRowIdx, setCurrentRowIdx] = useState(0);
  const showHelp = useScaffoldHelpSheet();
  console.log('[HarnessListFlow] step:', step, 'currentRowIdx:', currentRowIdx);

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
              <Ionicons name="remove-circle" size={52} color={BRAND_GREEN} />
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
              <Ionicons name="add-circle" size={52} color={BRAND_GREEN} />
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

// ── ChipRow ───────────────────────────────────────────────────────────────────

const ChipRow = memo(function ChipRow({
  item,
  row,
  state,
  comment,
  cellPhotos,
  onOk,
  onBad,
  onCommentChange,
  onPickPhoto,
  onDeletePhoto,
  onHelp,
  rowRef,
}: {
  item: HarnessItem;
  row: string;
  state: 'ok' | 'bad' | undefined;
  comment: string;
  cellPhotos: AnswerPhoto[];
  onOk: () => void;
  onBad: () => void;
  onCommentChange: (text: string) => void;
  onPickPhoto: () => void;
  onDeletePhoto: (p: AnswerPhoto) => Promise<void>;
  onHelp: () => void;
  rowRef?: React.RefObject<View | null>;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => gets(theme), [theme]);

  const [draft, setDraft] = useState(comment);
  const lastKey = useRef('');
  const key = `${item.itemKey}|${row}`;
  useEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key;
      setDraft(comment);
    }
  }, [key, comment]);

  const isBad = state === 'bad';
  // Default everything to ✓ — only explicitly-marked bad items show ✗.
  const isOk = !isBad;

  return (
    <View ref={rowRef} collapsable={false}>
      {/* Main row */}
      <View
        style={[
          s.chipRowWrap,
          isBad && { backgroundColor: theme.colors.dangerTint, borderColor: theme.colors.dangerBorder },
        ]}
      >
        <Text style={s.itemLabel} numberOfLines={2}>
          {item.label}
        </Text>
        <HelpIcon onPress={onHelp} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {/* ✓ chip */}
          <Pressable
            onPress={onOk}
            style={[
              s.chip,
              isOk && { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
            ]}
            accessibilityLabel={`${item.label} — კარგი`}
          >
            <Ionicons
              name="checkmark"
              size={18}
              color={isOk ? theme.colors.accent : theme.colors.inkSoft}
            />
          </Pressable>
          {/* ✗ chip */}
          <Pressable
            onPress={onBad}
            style={[
              s.chip,
              isBad && { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger },
            ]}
            accessibilityLabel={`${item.label} — პრობლემა`}
          >
            <Ionicons
              name="close"
              size={18}
              color={isBad ? theme.colors.danger : theme.colors.inkSoft}
            />
          </Pressable>
        </View>
      </View>

      {/* Accordion — only when bad */}
      {isBad && (
        <Animated.View
          entering={FadeInDown.duration(150)}
          exiting={FadeOut.duration(100)}
          style={s.accordion}
        >
          <FloatingLabelInput
            label="რა პრობლემაა?"
            value={draft}
            onChangeText={text => {
              setDraft(text);
              onCommentChange(text);
            }}
            multiline
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          >
            {cellPhotos.map(p => (
              <CellPhotoThumb key={p.id} photo={p} onDelete={() => onDeletePhoto(p)} />
            ))}
            <Pressable onPress={onPickPhoto} style={s.addPhotoSmall} accessibilityLabel="ფოტოს დამატება">
              <Ionicons name="camera-outline" size={20} color={theme.colors.danger} />
              <Text style={s.addPhotoText}>+ ფოტოს დამატება</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
});

// ── CellPhotoThumb ────────────────────────────────────────────────────────────

const CellPhotoThumb = memo(function CellPhotoThumb({
  photo,
  onDelete,
}: {
  photo: AnswerPhoto;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => gets(theme), [theme]);
  const isLocal = /^(file|content|ph|asset):\/\//.test(photo.storage_path);
  const [uri, setUri] = useState<string | null>(isLocal ? photo.storage_path : null);

  useEffect(() => {
    if (isLocal) return;
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, photo.storage_path)
      .then(url => { if (!cancelled) setUri(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [photo.storage_path, isLocal]);

  return (
    <View style={s.thumbWrap}>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <ActivityIndicator color={theme.colors.inkSoft} />
      )}
      <Pressable onPress={onDelete} style={s.thumbDelete} hitSlop={6}>
        <Ionicons name="close" size={14} color={theme.colors.white} />
      </Pressable>
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

function gets(theme: Theme) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
      backgroundColor: theme.colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: BRAND_GREEN,
    },
    title: { fontSize: 18, fontWeight: '800', color: theme.colors.ink, marginTop: 2 },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.subtleSurface,
    },
    helpHint: { marginTop: 8, fontSize: 12, color: theme.colors.inkSoft },
    // Chip row
    chipRowWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'transparent',
      gap: 8,
    },
    itemLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.ink,
    },
    chip: {
      width: 40,
      height: 44,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
    },
    // Accordion
    accordion: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.dangerBorder,
      borderTopWidth: 0,
      padding: 12,
      gap: 10,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
      marginTop: -1,
    },
    accordionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.danger,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    commentInput: {
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.dangerBorder,
      padding: 10,
      minHeight: 72,
      textAlignVertical: 'top',
      fontSize: 15,
      color: theme.colors.ink,
    },
    addPhotoSmall: {
      height: 72,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.colors.dangerBorder,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
      flexDirection: 'row',
      gap: 8,
    },
    addPhotoText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.danger,
    },
    thumbWrap: {
      width: 72,
      height: 72,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbDelete: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 8,
      backgroundColor: theme.colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
    },
    bigCta: {
      minHeight: 64,
      backgroundColor: BRAND_GREEN,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bigCtaText: { fontSize: 18, fontWeight: '800', color: theme.colors.white },
  });
}
