import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { SelectorOptionCard, SelectorOptionChip, SelectorOptionRow } from './SelectorOption';
import { getSelectorStyles } from './Selector.styles';

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

export type SelectorPresentation = 'rows' | 'list' | 'chips' | 'grid';

interface CommonProps {
  options: SelectorOption[];
  /** Group caption shown above the options. */
  label?: string;
  /** 'chips' (default) wraps compact pills; 'rows' is bordered cards; 'list' is
   *  a divided full-bleed list (for sheets / scrollable pickers); 'grid' is a
   *  2-column illustration-card picker (each option supplies a big `leading`). */
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
  const styles = useMemo(() => getSelectorStyles(theme), [theme]);

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

      {presentation === 'grid' ? (
        <View style={styles.gridWrap}>
          {options.map((opt) => (
            <SelectorOptionCard
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
      ) : presentation !== 'chips' ? (
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
