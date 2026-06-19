import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { SelectorOptionChip, SelectorOptionRow } from './SelectorOption';

/**
 * Selector — the ONE canonical form option-picker for the app.
 *
 * Replaces the many hand-rolled option lists/chip rows that drifted apart
 * (IdentificationGrid's select/chips/multi-chips, ad-hoc Pressable+map pickers,
 * etc.). Supports single or multi select, rendered as full-width `rows` (label +
 * radio) or wrapped `chips`. Monochrome by design — selection is carried by an
 * ink border + subtle fill, matching the rest of the inspection UI.
 *
 * Each option (see {@link SelectorOptionChip}/{@link SelectorOptionRow}) carries the
 * canonical press squish, a 150ms selection fill, and an indicator spring-in.
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
  /** rows/list trailing affordance: 'radio' (default) or 'check' (a check icon
   *  on the selected option, nothing on the rest — the "type card" look). */
  indicator?: 'radio' | 'check';
  /** Paint every option's border danger (e.g. required, submit-attempted). */
  error?: boolean;
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
  const { options, label, presentation = 'chips', indicator = 'radio', error, style, testID } = props;
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
          {options.map((opt) => (
            <SelectorOptionRow
              key={opt.value}
              opt={opt}
              active={isSelected(opt.value)}
              error={error}
              isMulti={isMulti}
              isList={presentation === 'list'}
              indicator={indicator}
              onPress={() => handlePress(opt)}
              styles={styles}
              theme={theme}
              a11yRole={a11yRole}
            />
          ))}
        </View>
      ) : (
        <View style={styles.chipsRow}>
          {options.map((opt) => (
            <SelectorOptionChip
              key={opt.value}
              opt={opt}
              active={isSelected(opt.value)}
              error={error}
              isMulti={isMulti}
              onPress={() => handlePress(opt)}
              styles={styles}
              theme={theme}
              a11yRole={a11yRole}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function getStyles(theme: Theme) {
  return StyleSheet.create({
    group: { gap: 8 },
    groupLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    disabled: { opacity: 0.4 },

    // rows (border + fill colors are animated per-option; defaults live here)
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
    listRowError: { borderBottomColor: theme.colors.semantic.danger },

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

    // chips (border + fill colors are animated per-option; defaults live here)
    chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    chipText: { fontSize: 14, color: theme.colors.inkSoft },
    chipTextActive: { color: theme.colors.ink, fontWeight: '700' },
  });
}
