// features/signatures/AdditionalRowCard.tsx
//
// One additional signing slot in the SignaturesScreen. The row holds NO
// user-entered data - the visual placeholders for `ხელმოწერა`, `სახელი`,
// and `თარიღი` exist to communicate the row maps to an empty block on the
// printed page where a second/third signer can sign by hand. The PDF
// renderer emits matching labeled empty slots in the printed output.
//
// Only the × button is interactive (removes the row).

import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

interface Props {
  /** 1-based row index, used only for the visible label "ხაზი #N". */
  index: number;
  onRemove: () => void;
}

export function AdditionalRowCard({ index, onRemove }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('signature.lineLabel', { index })}</Text>
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
          {...a11y(t('common.delete'), t('signature.lineRemoveA11y', { index }), 'button')}
        >
          <X size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
        </Pressable>
      </View>

      <View style={styles.placeholderRow}>
        <Text style={styles.placeholderLabel}>{t('signature.eyebrow')}</Text>
        <View style={styles.lineLong} />
      </View>

      <View style={styles.placeholderRowSplit}>
        <View style={styles.placeholderHalf}>
          <Text style={styles.placeholderLabel}>{t('common.name')}</Text>
          <View style={styles.lineShort} />
        </View>
        <View style={styles.placeholderHalf}>
          <Text style={styles.placeholderLabel}>{t('common.date')}</Text>
          <View style={styles.lineShort} />
        </View>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      borderStyle: 'dashed',
      padding: 14,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    removeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.6 },
    placeholderRow: { gap: 6 },
    placeholderRowSplit: {
      flexDirection: 'row',
      gap: 12,
    },
    placeholderHalf: { flex: 1, gap: 6 },
    placeholderLabel: {
      fontSize: 11,
      color: theme.colors.inkFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    lineLong: {
      height: 1,
      backgroundColor: theme.colors.borderStrong,
      marginTop: 16,
    },
    lineShort: {
      height: 1,
      backgroundColor: theme.colors.borderStrong,
      marginTop: 12,
    },
  });
}
