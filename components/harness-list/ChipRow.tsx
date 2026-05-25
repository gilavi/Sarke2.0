import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { HelpIcon } from '../ScaffoldHelpSheet';
import type { AnswerPhoto } from '../../types/models';
import type { HarnessItem } from './_shared';
import { gets } from './styles';
import { CellPhotoThumb } from './CellPhotoThumb';

export const ChipRow = memo(function ChipRow({
  item,
  row,
  state,
  comment,
  cellPhotos,
  onSet,
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
  // Stable handlers (receive item/row) so memoized rows don't all re-render
  // on every keystroke/tap — only the row whose data changed re-renders.
  onSet: (item: HarnessItem, row: string, value: 'ok' | 'bad') => void;
  onCommentChange: (item: HarnessItem, row: string, text: string) => void;
  onPickPhoto: (item: HarnessItem, row: string) => void;
  onDeletePhoto: (p: AnswerPhoto) => Promise<void>;
  onHelp: (item: HarnessItem) => void;
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
        <HelpIcon onPress={() => onHelp(item)} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {/* ✓ chip */}
          <Pressable
            onPress={() => onSet(item, row, 'ok')}
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
            onPress={() => onSet(item, row, 'bad')}
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
              onCommentChange(item, row, text);
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
            <Pressable onPress={() => onPickPhoto(item, row)} style={s.addPhotoSmall} accessibilityLabel="ფოტოს დამატება">
              <Ionicons name="camera-outline" size={20} color={theme.colors.danger} />
              <Text style={s.addPhotoText}>+ ფოტოს დამატება</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}, (prev, next) =>
  prev.item === next.item &&
  prev.row === next.row &&
  prev.state === next.state &&
  prev.comment === next.comment &&
  prev.rowRef === next.rowRef &&
  prev.onSet === next.onSet &&
  prev.onCommentChange === next.onCommentChange &&
  prev.onPickPhoto === next.onPickPhoto &&
  prev.onDeletePhoto === next.onDeletePhoto &&
  prev.onHelp === next.onHelp &&
  prev.cellPhotos.length === next.cellPhotos.length &&
  prev.cellPhotos.every((p, i) => p.id === next.cellPhotos[i]?.id),
);