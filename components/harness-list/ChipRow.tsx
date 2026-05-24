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