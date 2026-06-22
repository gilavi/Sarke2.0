// QuantitySelector - pick a count in one tap, or type an unusual one.
//
// A form-selector alternative to a +/- stepper: a wrap-grid of preset
// chips (one-tap selection) plus a custom numeric field for values that
// aren't in the presets. The value is always clamped to [min, max], so a
// caller can expose a typed entry without risking an out-of-range count.
//
// Reusable across any "how many?" prompt - the caller supplies the
// presets and bounds; this component owns the chip/typing UX only.
import { memo, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { PressBounce } from '../animations/PressBounce';

export type QuantitySelectorProps = {
  value: number;
  onChange: (n: number) => void;
  /** Quick-pick values shown as chips. Caller supplies domain-appropriate ones. */
  presets?: number[];
  min?: number;
  max?: number;
  /** Accessibility label prefix, e.g. "ქამრების რაოდენობა". Defaults to translated "Quantity". */
  accessibilityLabelPrefix?: string;
};

const DEFAULT_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];

export const QuantitySelector = memo(function QuantitySelector({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  min = 1,
  max = 99,
  accessibilityLabelPrefix,
}: QuantitySelectorProps) {
  const { t } = useTranslation();
  const labelPrefix = accessibilityLabelPrefix ?? t('inputs.quantityLabel');
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const isCustom = (n: number) => !presets.includes(n);

  const [customText, setCustomText] = useState(isCustom(value) ? String(value) : '');

  // Adjust the custom field when `value` changes from outside (chip tap,
  // parent reset) - the React "derived state on prop change" pattern.
  const prevValue = useRef(value);
  if (prevValue.current !== value) {
    prevValue.current = value;
    setCustomText(isCustom(value) ? String(value) : '');
  }

  const selectPreset = (p: number) => {
    haptic.light();
    setCustomText('');
    onChange(p);
  };

  const onCustomChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    if (digits === '') {
      setCustomText('');
      return;
    }
    const n = clamp(parseInt(digits, 10));
    onChange(n);
    // If the typed number is itself a preset, let the chip own it.
    setCustomText(isCustom(n) ? String(n) : '');
  };

  const customActive = customText !== '';

  return (
    <View style={styles.wrap}>
      {presets.map(p => {
        const active = value === p && !customActive;
        return (
          <PressBounce
            key={p}
            onPress={() => selectPreset(p)}
            scaleTo={0.94}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${labelPrefix} ${p}`}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{p}</Text>
          </PressBounce>
        );
      })}

      <View style={[styles.chip, styles.customChip, customActive && styles.chipActive]}>
        <TextInput
          value={customText}
          onChangeText={onCustomChange}
          keyboardType="number-pad"
          maxLength={String(max).length}
          placeholder={t('inputs.otherPlaceholder')}
          placeholderTextColor={theme.colors.inkFaint}
          style={[styles.customInput, customActive && styles.chipTextActive]}
          accessibilityLabel={`${labelPrefix} - ${t('inputs.otherA11y')}`}
          returnKeyType="done"
        />
      </View>
    </View>
  );
});

function makeStyles(theme: any) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
    },
    chip: {
      minWidth: 56,
      height: 52,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: theme.colors.ink,
      borderColor: theme.colors.ink,
    },
    chipText: { fontSize: 20, fontWeight: '700', color: theme.colors.ink },
    chipTextActive: { color: theme.colors.white },
    customChip: { minWidth: 84, paddingHorizontal: 10 },
    customInput: {
      width: '100%',
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.ink,
      padding: 0,
      margin: 0,
    },
  });
}
