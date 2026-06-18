import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';

/**
 * Selector — the ONE canonical form option-picker for the app.
 *
 * Replaces the many hand-rolled option lists/chip rows that drifted apart
 * (IdentificationGrid's select/chips/multi-chips, ad-hoc Pressable+map pickers,
 * etc.). Supports single or multi select, rendered as full-width `rows` (label +
 * radio) or wrapped `chips`. Monochrome by design — selection is carried by an
 * ink border + subtle fill, matching the rest of the inspection UI.
 *
 * For sheet/dropdown presentation use {@link CustomDropdown} (same option shape).
 */
export interface SelectorOption {
  value: string;
  /** Display label; falls back to `value`. */
  label?: string;
  /** Optional leading icon (rows presentation). */
  icon?: LucideIcon;
  /** Optional custom leading element (rows presentation) — wins over `icon`.
   *  e.g. an avatar in a project/equipment picker. */
  leading?: React.ReactNode;
  /** Optional second line (rows presentation). */
  subtitle?: string;
  disabled?: boolean;
}

export type SelectorPresentation = 'rows' | 'list' | 'chips';

interface CommonProps {
  options: SelectorOption[];
  /** Group caption shown above the options. */
  label?: string;
  /** 'chips' (default) wraps compact pills; 'rows' is bordered cards; 'list' is
   *  a divided full-bleed list (for sheets / scrollable pickers). */
  presentation?: SelectorPresentation;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface SingleProps extends CommonProps {
  mode?: 'single';
  value: string | null;
  onChange: (value: string) => void;
}

interface MultiProps extends CommonProps {
  mode: 'multi';
  values: string[];
  onValuesChange: (values: string[]) => void;
}

export type SelectorProps = SingleProps | MultiProps;

export function Selector(props: SelectorProps) {
  const { options, label, presentation = 'chips', style, testID } = props;
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const isMulti = props.mode === 'multi';
  const selectedValues = isMulti ? props.values : props.value != null ? [props.value] : [];
  const isSelected = (v: string) => selectedValues.includes(v);

  const handlePress = (opt: SelectorOption) => {
    if (opt.disabled) return;
    haptic.light();
    if (isMulti) {
      const next = props.values.includes(opt.value)
        ? props.values.filter((v) => v !== opt.value)
        : [...props.values, opt.value];
      props.onValuesChange(next);
    } else {
      props.onChange(opt.value);
    }
  };

  const a11yRole = isMulti ? 'checkbox' : 'radio';

  return (
    <View style={[styles.group, style]} testID={testID}>
      {label ? <Text style={styles.groupLabel}>{label}</Text> : null}

      {presentation !== 'chips' ? (
        <View style={presentation === 'list' ? styles.listContainer : styles.rowList}>
          {options.map((opt) => {
            const active = isSelected(opt.value);
            const Icon = opt.icon;
            const isList = presentation === 'list';
            return (
              <Pressable
                key={opt.value}
                style={[
                  isList ? styles.listRow : styles.row,
                  active && (isList ? styles.listRowActive : styles.rowActive),
                  opt.disabled && styles.disabled,
                ]}
                onPress={() => handlePress(opt)}
                disabled={opt.disabled}
                {...a11y(opt.label ?? opt.value, undefined, a11yRole)}
              >
                {opt.leading ?? (Icon ? <Icon size={20} color={active ? theme.colors.ink : theme.colors.inkSoft} strokeWidth={1.8} /> : null)}
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{opt.label ?? opt.value}</Text>
                  {opt.subtitle ? <Text style={styles.rowSubtitle}>{opt.subtitle}</Text> : null}
                </View>
                <View style={[isMulti ? styles.checkbox : styles.radio, active && (isMulti ? styles.checkboxActive : styles.radioActive)]}>
                  {active && (isMulti ? <View style={styles.checkboxInner} /> : <View style={styles.radioDot} />)}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.chipsRow}>
          {options.map((opt) => {
            const active = isSelected(opt.value);
            return (
              <Pressable
                key={opt.value}
                style={[styles.chip, active && styles.chipActive, opt.disabled && styles.disabled]}
                onPress={() => handlePress(opt)}
                disabled={opt.disabled}
                {...a11y(opt.label ?? opt.value, undefined, a11yRole)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {isMulti && active ? '✓ ' : ''}
                  {opt.label ?? opt.value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    group: { gap: 8 },
    groupLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    disabled: { opacity: 0.4 },

    // rows
    rowList: { gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    rowActive: { borderColor: theme.colors.ink, backgroundColor: theme.colors.subtleSurface },

    // list (divided full-bleed rows, for sheets / scrollable pickers)
    listContainer: {},
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    listRowActive: { backgroundColor: theme.colors.subtleSurface },

    rowTextWrap: { flex: 1, gap: 2 },
    rowText: { fontSize: 15, color: theme.colors.ink, fontWeight: '500' },
    rowTextActive: { color: theme.colors.ink, fontWeight: '700' },
    rowSubtitle: { fontSize: 12, color: theme.colors.inkFaint },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: theme.colors.ink },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.ink },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: { borderColor: theme.colors.ink, backgroundColor: theme.colors.ink },
    checkboxInner: { width: 9, height: 9, borderRadius: 2, backgroundColor: theme.colors.white },

    // chips
    chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    chipActive: { borderColor: theme.colors.ink, backgroundColor: theme.colors.subtleSurface },
    chipText: { fontSize: 14, color: theme.colors.inkSoft },
    chipTextActive: { color: theme.colors.ink, fontWeight: '700' },
  });
}
