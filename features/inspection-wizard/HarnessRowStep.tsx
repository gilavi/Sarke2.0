import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Camera, CircleMinus, CirclePlus, Plus } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { Answer, AnswerPhoto, GridValues, Question } from '../../types/models';
import { getstyles, staticStyles } from './styles';
import { PhotoThumb } from './PhotoThumb';
import { PhotoPreviewModal } from './PhotoPreviewModal';

// Harness (N1-N15) row step. Mounted by the wizard when
// `step.kind === 'gridRow'` AND `question.grid_rows[0] === 'N1'`.
// Sibling `ScaffoldRowStep` handles every other grid variant.

export const HarnessRowStep = memo(function HarnessRowStep({
  question,
  row,
  answer,
  photosByAnswer,
  isFirstRow,
  harnessRowCount,
  setHarnessRowCount,
  onAnswer,
  onPickPhoto,
  onDeletePhoto,
}: {
  question: Question;
  row: string;
  answer: Answer | undefined;
  photosByAnswer: Record<string, AnswerPhoto[]>;
  isFirstRow: boolean;
  harnessRowCount: number;
  setHarnessRowCount: (n: number) => void;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onPickPhoto: () => void;
  onDeletePhoto: (photo: AnswerPhoto) => Promise<void>;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const cols = question.grid_cols ?? [];
  const values: Record<string, string> = (answer?.grid_values ?? {})[row] ?? {};
  const allAnswerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];
  const rowTag = `row:${row}`;
  const answerPhotos = allAnswerPhotos.filter(p => p.caption === rowTag);
  const hasPhotos = answerPhotos.length > 0;

  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);

  const setValue = (col: string, value: string | null) => {
    onAnswer(question, a => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      const prev = grid[row] ?? {};
      const cur: Record<string, string> = { ...prev };
      if (value === null) delete cur[col];
      else cur[col] = value;
      grid[row] = cur;
      return { ...a, grid_values: grid };
    });
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[staticStyles.stepScrollContent, staticStyles.padTop16]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={120}
    >
      <View style={{ alignItems: 'center', paddingVertical: 8, gap: 4 }}>
        <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>{question.title}</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' }}>
          {row}
        </Text>
      </View>

      {isFirstRow ? (
        <View style={staticStyles.rowBetweenPadH4}>
          <Text style={{ fontWeight: '600' }}>რამდენი ქამარი სულ?</Text>
          <View style={staticStyles.rowCenterGap12}>
            <Pressable onPress={() => setHarnessRowCount(Math.max(1, harnessRowCount - 1))} {...a11y('ქამრების რაოდენობის შემცირება', 'შეეხეთ რაოდენობის შესამცირებლად', 'button')}>
              <CircleMinus size={28} color={theme.colors.accent} strokeWidth={1.5} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{harnessRowCount}</Text>
            <Pressable onPress={() => setHarnessRowCount(Math.min(15, harnessRowCount + 1))} {...a11y('ქამრების რაოდენობის გაზრდა', 'შეეხეთ რაოდენობის გასაზრდელად', 'button')}>
              <CirclePlus size={28} color={theme.colors.accent} strokeWidth={1.5} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={staticStyles.gap8}>
        {cols.map(col => {
          const current = values[col];
          return (
            <View key={col} style={styles.harnessRow}>
              <Text style={staticStyles.harnessColLabel}>{col}</Text>
              <View style={staticStyles.harnessChipRow}>
                <Pressable
                  onPress={() => setValue(col, 'ვარგისია')}
                  style={[
                    styles.chip,
                    current === 'ვარგისია' && {
                      backgroundColor: theme.colors.accentSoft,
                      borderColor: theme.colors.accent,
                    },
                  ]}
                  {...a11y(col + ' - ვარგისია', 'შეეხეთ ვარგისად მოსანიშნად', 'button')}
                >
                  <Text style={{ color: current === 'ვარგისია' ? theme.colors.accent : theme.colors.inkSoft }}>
                    ✓
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setValue(col, 'დაზიანებულია')}
                  style={[
                    styles.chip,
                    current === 'დაზიანებულია' && {
                      backgroundColor: theme.colors.dangerSoft,
                      borderColor: theme.colors.danger,
                    },
                  ]}
                  {...a11y(col + ' - დაზიანებულია', 'შეეხეთ დაზიანებულად მოსანიშნად', 'button')}
                >
                  <Text style={{ color: current === 'დაზიანებულია' ? theme.colors.danger : theme.colors.inkSoft }}>
                    ✗
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {hasPhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[staticStyles.gap10, staticStyles.padV8]}
        >
          {answerPhotos.map(p => (
            <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile} {...a11y('ფოტოს ნახვა', 'შეეხეთ ფოტოს დიდად სანახავად', 'button')}>
              <PhotoThumb photo={p} size={120} />
            </Pressable>
          ))}
          <Pressable onPress={onPickPhoto} style={styles.addPhotoTile} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
            <Plus size={32} color={theme.colors.inkSoft} strokeWidth={1.5} />
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.chipRow}>
          <Pressable onPress={onPickPhoto} style={styles.assistChip} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
            <Camera size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={styles.assistChipText}>ფოტო</Text>
          </Pressable>
        </View>
      )}

      <PhotoPreviewModal
        photo={previewPhoto}
        visible={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        onDelete={async (photo) => {
          await onDeletePhoto(photo);
        }}
      />
    </KeyboardAwareScrollView>
  );
});
