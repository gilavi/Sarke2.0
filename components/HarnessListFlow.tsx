import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import { haptic } from '../lib/haptics';
import type { Answer, AnswerPhoto, GridValues, Question, Template } from '../types/models';

const BRAND_GREEN = '#1D9E75';
const BAD_TINT = '#FCEBEB';

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

  const [editing, setEditing] = useState<{ item: HarnessItem; row: string } | null>(null);

  const badCount = useMemo(() => {
    let n = 0;
    for (const r of rowLabels) for (const it of items) if (isBadCell(answers, it, r)) n++;
    return n;
  }, [answers, items, rowLabels]);

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

  const setBad = async (item: HarnessItem, row: string, bad: boolean) => {
    await onPatchAnswer(item.question, a => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      const cur: Record<string, string> = { ...(grid[row] ?? {}) };
      if (bad) {
        cur[item.col] = 'bad';
      } else {
        cur[item.col] = 'ok';
        delete cur[`კომენტარი_${item.col}`];
      }
      grid[row] = cur;
      return { ...a, grid_values: grid };
    });
    if (!bad) {
      const tag = captionFor(row, item.col);
      const a = answers[item.question.id];
      const cellPhotos = a ? photos[a.id] ?? [] : [];
      for (const p of cellPhotos) if (p.caption === tag) void onDeletePhoto(p);
    }
  };

  const onCellTap = async (item: HarnessItem, row: string) => {
    haptic.light();
    const bad = isBadCell(answers, item, row);
    if (bad) {
      setEditing({ item, row });
    } else {
      await setBad(item, row, true);
      setEditing({ item, row });
    }
  };

  const applyAutoOk = async () => {
    for (const row of rowLabels) {
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
    }
    onConclude();
  };

  const confirmAll = () => {
    let untouched = 0;
    for (const row of rowLabels) {
      for (const item of items) {
        const cell = answers[item.question.id]?.grid_values?.[row]?.[item.col];
        if (cell === undefined) untouched += 1;
      }
    }
    haptic.success();
    if (untouched === 0) {
      void applyAutoOk();
      return;
    }
    Alert.alert(
      'დადასტურება',
      `${untouched} უჯრა არ არის შემოწმებული — ჩაითვლება გამართულად. გავაგრძელო?`,
      [
        { text: 'გაუქმება', style: 'cancel' },
        { text: 'დიახ, გავაგრძელო', onPress: () => void applyAutoOk() },
      ],
    );
  };

  const labelColWidth = 132;
  const cellSize = 56;
  const cellGap = 6;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>ქამრების შემოწმება</Text>
            <Text style={s.title}>
              {rowLabels.length} ქამარი · {items.length} კომპონენტი
            </Text>
          </View>
          <Pressable hitSlop={12} onPress={onClose} style={s.closeBtn} accessibilityLabel="დახურვა">
            <Ionicons name="close" size={22} color={theme.colors.ink} />
          </Pressable>
        </View>
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
        <Text style={s.helpHint}>
          ყველა ერთეული გამართულია. დააჭირეთ იმას, რაც გაუმართავია.
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: labelColWidth, paddingLeft: 16 }}>
              <View style={{ height: cellSize + cellGap }} />
              {items.map(item => (
                <View
                  key={item.itemKey}
                  style={{ height: cellSize, marginBottom: cellGap, justifyContent: 'center' }}
                >
                  <Text numberOfLines={2} style={s.itemLabel}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              <View>
                <View style={{ flexDirection: 'row', height: cellSize + cellGap, alignItems: 'center' }}>
                  {rowLabels.map((row, i) => (
                    <View
                      key={row}
                      style={{
                        width: cellSize,
                        marginRight: cellGap,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={s.colHeader}>{i + 1}</Text>
                    </View>
                  ))}
                </View>
                {items.map(item => (
                  <View key={item.itemKey} style={{ flexDirection: 'row', marginBottom: cellGap }}>
                    {rowLabels.map(row => {
                      const bad = isBadCell(answers, item, row);
                      return (
                        <Pressable
                          key={row}
                          onPress={() => onCellTap(item, row)}
                          style={[
                            s.cell,
                            { width: cellSize, height: cellSize, marginRight: cellGap },
                            bad
                              ? { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger }
                              : { backgroundColor: theme.colors.accentSoft, borderColor: 'transparent' },
                          ]}
                          accessibilityLabel={`${item.label} · ქამარი ${rowLabels.indexOf(row) + 1}`}
                        >
                          <Ionicons
                            name={bad ? 'close' : 'checkmark'}
                            size={26}
                            color={bad ? theme.colors.white : BRAND_GREEN}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          onPress={confirmAll}
          style={({ pressed }) => [s.bigCta, pressed && { opacity: 0.88 }]}
        >
          <Text style={s.bigCtaText}>
            {badCount === 0
              ? 'ყველაფერი წესრიგშია — დადასტურება →'
              : `დადასტურება · ${badCount} პრობლემა →`}
          </Text>
        </Pressable>
      </View>

      <CellEditor
        editing={editing}
        answers={answers}
        photos={photos}
        onClose={() => setEditing(null)}
        onCommentChange={(item, row, text) =>
          onPatchAnswer(item.question, a => {
            const grid: GridValues = { ...(a.grid_values ?? {}) };
            const cur: Record<string, string> = { ...(grid[row] ?? {}) };
            if (text.trim()) cur[`კომენტარი_${item.col}`] = text;
            else delete cur[`კომენტარი_${item.col}`];
            grid[row] = cur;
            return { ...a, grid_values: grid };
          })
        }
        onPickPhoto={(item, row) => onPickItemPhoto(item.question, row, item.col)}
        onDeletePhoto={onDeletePhoto}
        onRevert={async (item, row) => {
          await setBad(item, row, false);
          setEditing(null);
        }}
        rowIndex={editing ? rowLabels.indexOf(editing.row) : -1}
      />
    </SafeAreaView>
  );
}

const CellEditor = memo(function CellEditor({
  editing,
  answers,
  photos,
  onClose,
  onCommentChange,
  onPickPhoto,
  onDeletePhoto,
  onRevert,
  rowIndex,
}: {
  editing: { item: HarnessItem; row: string } | null;
  answers: Record<string, Answer>;
  photos: Record<string, AnswerPhoto[]>;
  onClose: () => void;
  onCommentChange: (item: HarnessItem, row: string, text: string) => void;
  onPickPhoto: (item: HarnessItem, row: string) => void;
  onDeletePhoto: (p: AnswerPhoto) => Promise<void>;
  onRevert: (item: HarnessItem, row: string) => Promise<void>;
  rowIndex: number;
}) {
  const visible = !!editing;
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const lastEditingKey = useRef<string>('');

  useEffect(() => {
    if (!editing) return;
    const key = `${editing.item.itemKey}|${editing.row}`;
    if (lastEditingKey.current !== key) {
      lastEditingKey.current = key;
      setDraft(readComment(answers, editing.item, editing.row));
    }
  }, [editing, answers]);

  if (!editing) return null;
  const { item, row } = editing;
  const a = answers[item.question.id];
  const allPhotos = a ? photos[a.id] ?? [] : [];
  const cellPhotos = allPhotos.filter(p => p.caption === captionFor(row, item.col));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.sheetOverlay}>
        <Pressable style={s.sheetBackdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[s.sheet, { paddingBottom: 16 + insets.bottom }]}
        >
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetEyebrow}>ქამარი {rowIndex + 1}</Text>
              <Text style={s.sheetTitle}>{item.label}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.ink} />
            </Pressable>
          </View>
          <TextInput
            value={draft}
            onChangeText={text => {
              setDraft(text);
              onCommentChange(item, row, text);
            }}
            multiline
            placeholder="რა აქვს?"
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
            <Pressable onPress={() => onPickPhoto(item, row)} style={s.addPhotoSmall}>
              <Ionicons name="camera-outline" size={26} color={theme.colors.inkSoft} />
              <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 }}>ფოტო</Text>
            </Pressable>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable
              onPress={() => onRevert(item, row)}
              style={[s.sheetBtn, { backgroundColor: theme.colors.subtleSurface, flex: 1 }]}
            >
              <Ionicons name="arrow-undo" size={18} color={theme.colors.ink} />
              <Text style={{ fontWeight: '700', color: theme.colors.ink }}>გამართულია</Text>
            </Pressable>
            <Pressable onPress={onClose} style={[s.sheetBtn, { backgroundColor: BRAND_GREEN, flex: 1 }]}>
              <Text style={{ fontWeight: '800', color: theme.colors.white }}>მზადაა</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

const CellPhotoThumb = memo(function CellPhotoThumb({
  photo,
  onDelete,
}: {
  photo: AnswerPhoto;
  onDelete: () => void;
}) {
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

const s = StyleSheet.create({
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
  itemLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.ink },
  colHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.inkSoft,
  },
  cell: {
    borderRadius: 12,
    borderWidth: 1,
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
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    paddingTop: 8,
    gap: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    marginBottom: 6,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  sheetEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.danger,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.ink, marginTop: 2 },
  commentInput: {
    backgroundColor: BAD_TINT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 15,
    color: theme.colors.ink,
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 56,
  },
  addPhotoSmall: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.hairline,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.subtleSurface,
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
});
