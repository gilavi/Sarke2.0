import { memo, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { A11yText as Text } from './primitives/A11yText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

import { haptic } from '../lib/haptics';
import type { Answer, AnswerPhoto, GridValues, Question, Template } from '../types/models';
import { TourGuide, type TourStep } from './TourGuide';
import { HelpIcon, useScaffoldHelpSheet } from './ScaffoldHelpSheet';

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
      out.push({
        question: q,
        col,
        label: col,
        itemKey: `${q.id}::${col}`,
      });
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

function isBadCell(answers: Record<string, Answer>, item: HarnessItem, row: string): boolean {
  const cell = answers[item.question.id]?.grid_values?.[row]?.[item.col];
  return cell === 'bad' || cell === 'დაზიანებულია';
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

  const [currentRowIdx, setCurrentRowIdx] = useState(0);
  const showHelp = useScaffoldHelpSheet();

  // Tour refs
  const headerRef = useRef<View>(null);
  const firstRowRef = useRef<View>(null);
  const firstRowHelpRef = useRef<View>(null);
  const confirmRef = useRef<View>(null);
  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        targetRef: headerRef,
        title: 'კომპონენტების შემოწმება',
        body: 'თითოეული მწკრივი ხარაჩოს ერთ ნაწილს წარმოადგენს',
        position: 'bottom',
      },
      {
        targetRef: firstRowRef,
        title: 'სტატუსი',
        body: 'შეეხე მწკრივს თუ პრობლემაა. თუ კარგია — არ შეეხო',
        position: 'bottom',
      },
      {
        targetRef: firstRowHelpRef,
        title: 'დახმარება',
        body: 'არ იცი რა არის? შეეხე და ნახე სურათი',
        position: 'bottom',
      },
      {
        targetRef: confirmRef,
        title: 'დადასტურება',
        body: 'ბოლოს დააჭირე — დაუდასტურებელი ავტომატურად კარგად ჩაითვლება',
        position: 'top',
      },
    ],
    [],
  );

  if (items.length === 0 || rowLabels.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
          ამ შაბლონში ქამრის კომპონენტები ვერ მოიძებნა.
        </Text>
        <View style={{ height: 16 }} />
        <Pressable
          onPress={onClose}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: theme.colors.subtleSurface,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontWeight: '700', color: theme.colors.ink }}>გასვლა</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const safeRowIdx = Math.min(currentRowIdx, rowLabels.length - 1);
  const row = rowLabels[safeRowIdx];

  const setBad = async (item: HarnessItem, r: string, bad: boolean) => {
    await onPatchAnswer(item.question, a => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      const cur: Record<string, string> = { ...(grid[r] ?? {}) };
      if (bad) {
        cur[item.col] = 'bad';
      } else {
        delete cur[item.col];
        delete cur[`კომენტარი_${item.col}`];
      }
      grid[r] = cur;
      return { ...a, grid_values: grid };
    });
    if (!bad) {
      const tag = captionFor(r, item.col);
      const a = answers[item.question.id];
      const cellPhotos = a ? photos[a.id] ?? [] : [];
      for (const p of cellPhotos) if (p.caption === tag) void onDeletePhoto(p);
    }
  };

  const onRowTap = async (item: HarnessItem) => {
    haptic.light();
    const bad = isBadCell(answers, item, row);
    await setBad(item, row, !bad);
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
      const cell = answers[item.question.id]?.grid_values?.[row]?.[item.col];
      if (cell !== undefined) continue;
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
    void (async () => {
      await applyAutoOkForCurrentRow();
      advance();
    })();
  };

  const badCountThisRow = items.reduce(
    (n, it) => (isBadCell(answers, it, row) ? n + 1 : n),
    0,
  );

  return (
    <TourGuide tourId="haraco_glossary_v1" steps={tourSteps}>
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
        {safeRowIdx === 0 && (
          <View style={s.countAdjust}>
            <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>რამდენი ქამარი სულ?</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable onPress={() => setHarnessRowCount(Math.max(1, harnessRowCount - 1))} hitSlop={10}>
                <Ionicons name="remove-circle" size={28} color={BRAND_GREEN} />
              </Pressable>
              <Text style={{ fontSize: 16, fontWeight: '700', minWidth: 18, textAlign: 'center' }}>
                {harnessRowCount}
              </Text>
              <Pressable onPress={() => setHarnessRowCount(Math.min(15, harnessRowCount + 1))} hitSlop={10}>
                <Ionicons name="add-circle" size={28} color={BRAND_GREEN} />
              </Pressable>
            </View>
          </View>
        )}
        <Text style={s.helpHint}>
          დააჭირეთ იმას, რაც გაუმართავია. დანარჩენი ჩაითვლება გამართულად.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item, idx) => (
          <ItemRow
            key={item.itemKey}
            item={item}
            row={row}
            bad={isBadCell(answers, item, row)}
            comment={readComment(answers, item, row)}
            cellPhotos={(() => {
              const a = answers[item.question.id];
              const all = a ? photos[a.id] ?? [] : [];
              return all.filter(p => p.caption === captionFor(row, item.col));
            })()}
            onTap={() => onRowTap(item)}
            onCommentChange={text => onCommentChange(item, text)}
            onPickPhoto={() => onPickItemPhoto(item.question, row, item.col)}
            onDeletePhoto={onDeletePhoto}
            onHelp={() => showHelp(item.label)}
            cardRef={idx === 0 ? firstRowRef : undefined}
            helpRef={idx === 0 ? firstRowHelpRef : undefined}
          />
        ))}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          ref={confirmRef}
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

const ItemRow = memo(function ItemRow({
  item,
  bad,
  comment,
  cellPhotos,
  onTap,
  onCommentChange,
  onPickPhoto,
  onDeletePhoto,
  onHelp,
  cardRef,
  helpRef,
}: {
  item: HarnessItem;
  row: string;
  bad: boolean;
  comment: string;
  cellPhotos: AnswerPhoto[];
  onTap: () => void;
  onCommentChange: (text: string) => void;
  onPickPhoto: () => void;
  onDeletePhoto: (p: AnswerPhoto) => Promise<void>;
  onHelp: () => void;
  cardRef?: React.RefObject<View | null>;
  helpRef?: React.RefObject<View | null>;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => gets(theme), [theme]);
  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={[
        s.rowCard,
        bad
          ? { backgroundColor: theme.colors.dangerTint, borderColor: theme.colors.dangerBorder }
          : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}
    >
      <Pressable
        onPress={onTap}
        style={({ pressed }) => [s.rowHeader, pressed && { opacity: 0.7 }]}
        accessibilityLabel={item.label}
        accessibilityState={{ selected: bad }}
      >
        <Text style={s.itemLabel} numberOfLines={2}>
          {item.label}
        </Text>
        <View ref={helpRef} collapsable={false}>
          <HelpIcon onPress={onHelp} />
        </View>
        <View
          style={[
            s.circle,
            bad
              ? { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger }
              : { backgroundColor: 'transparent', borderColor: theme.colors.borderStrong },
          ]}
        >
          {bad && <Ionicons name="alert" size={18} color={theme.colors.white} />}
        </View>
      </Pressable>

      {bad && (
        <Animated.View
          entering={FadeInDown.duration(150)}
          exiting={FadeOut.duration(100)}
          style={s.accordionBody}
        >
          <Text style={s.accordionLabel}>რა პრობლემაა?</Text>
          <TextInput
            value={comment}
            onChangeText={onCommentChange}
            multiline
            placeholder="აღწერე დაზიანება..."
            placeholderTextColor={theme.colors.inkFaint}
            style={s.commentInput}
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
  const [uri] = useState<string | null>(isLocal ? photo.storage_path : null);
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

function gets(theme: any) {
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
  countAdjust: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpHint: {
    marginTop: 10,
    fontSize: 12,
    color: theme.colors.inkSoft,
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    gap: 8,
  },
  accordionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  commentInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
    color: theme.colors.ink,
  },
  addPhotoSmall: {
    height: 80,
    paddingHorizontal: 14,
    borderRadius: 10,
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
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: theme.colors.subtleSurface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
