import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';

export interface VerdictOption {
  value: string;
  label: string;
  type: 'success' | 'warning' | 'danger';
}

export interface VerdictSelectorProps {
  options: VerdictOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  note?: string;
  onNoteChange?: (text: string) => void;
  notePlaceholder?: string;
}

export function VerdictSelector({
  options,
  value,
  onChange,
  note,
  onNoteChange,
  notePlaceholder,
}: VerdictSelectorProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                haptic.light();
                onChange(value === opt.value ? null : opt.value);
              }}
              {...a11y(opt.label, undefined, 'radio', { selected: active })}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {onNoteChange !== undefined && (
        <FloatingLabelInput
          label={notePlaceholder ?? 'კომენტარი'}
          value={note ?? ''}
          onChangeText={onNoteChange}
          multiline
          numberOfLines={4}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    container: { gap: 12 },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chipActive: {
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.subtleSurface,
    },
    chipText: { fontSize: 13, color: theme.colors.inkSoft },
    chipTextActive: { color: theme.colors.ink, fontWeight: '700' },
  });
}
