import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { Selector, type SelectorOption } from '../ui/Selector';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';

export interface IdentificationField {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: 'text' | 'number' | 'chips' | 'select';
  /** For type='chips'|'select': raw option values */
  options?: string[];
  /** For type='chips'|'select': display labels (parallel to options); falls back to options if absent */
  optionLabels?: string[];
  /** Red indicator when true (caller computes from domain logic) */
  isProblematic?: boolean;
  /** Amber indicator when true (caller computes, e.g., partial/warning state) */
  isWarning?: boolean;
  /** Whether this field's value is currently unknown (requires allowUnknown on the grid) */
  unknown?: boolean;
  /** Called when the "მონაცემი ვერ დგინდება" checkbox is toggled */
  onUnknownChange?: (v: boolean) => void;
  // ── Multi-select (type='chips' only) ───────────────────────────────────────
  /** Allow multiple chips to be toggled simultaneously */
  multiSelect?: boolean;
  /** Currently selected values (multiSelect mode - replaces value/onChange) */
  values?: string[];
  /** Callback when selection changes in multiSelect mode */
  onValuesChange?: (vals: string[]) => void;
  /** Option value that, when selected, shows a text input for custom entry */
  otherOptionValue?: string;
  /** Text input value for the "other" option */
  otherValue?: string;
  /** Callback for the "other" text input */
  onOtherValueChange?: (v: string) => void;
}

export interface IdentificationGridProps {
  fields: IdentificationField[];
  columns?: 1 | 2;
  /** Show a "მონაცემი ვერ დგინდება" checkbox beneath each text/number field */
  allowUnknown?: boolean;
}

/** Build canonical Selector options from the parallel options/optionLabels arrays. */
function toOptions(field: IdentificationField): SelectorOption[] {
  const options = field.options ?? [];
  const labels = field.optionLabels ?? options;
  return options.map((value, i) => ({ value, label: labels[i] ?? value }));
}

export function IdentificationGrid({
  fields,
  columns = 2,
  allowUnknown = false,
}: IdentificationGridProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const itemWidth = columns === 2 ? '50%' : '100%';

  return (
    <View style={styles.grid}>
      {fields.map((field, idx) => {
        const isSelector = field.type === 'chips' || field.type === 'select';
        const isMulti = field.type === 'chips' && field.multiSelect;
        const otherActive = field.otherOptionValue ? (field.values ?? []).includes(field.otherOptionValue) : false;

        return (
          <View
            key={idx}
            // chips/select fields span full width for readability
            style={[styles.item, { width: isSelector ? '100%' : itemWidth }]}
          >
            {field.type === 'select' || (field.type === 'chips' && !field.multiSelect) ? (
              <Selector
                label={field.label}
                presentation={field.type === 'select' ? 'rows' : 'chips'}
                options={toOptions(field)}
                value={field.value}
                onChange={(v) => field.onChange?.(v)}
              />
            ) : field.type === 'chips' && field.multiSelect ? (
              <View style={styles.multiWrap}>
                <Selector
                  mode="multi"
                  label={field.label}
                  presentation="chips"
                  options={toOptions(field)}
                  values={field.values ?? []}
                  onValuesChange={(vals) => field.onValuesChange?.(vals)}
                />
                {otherActive && field.onOtherValueChange ? (
                  <FloatingLabelInput
                    label={`${field.otherOptionValue} - კონკრეტული სახელი`}
                    value={field.otherValue ?? ''}
                    onChangeText={field.onOtherValueChange}
                  />
                ) : null}
              </View>
            ) : (
              <View style={styles.textFieldWrap}>
                <FloatingLabelInput
                  label={field.label}
                  value={field.unknown ? '' : field.value}
                  onChangeText={field.onChange ?? (() => {})}
                  keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
                  editable={!field.unknown && !!field.onChange}
                />
                {allowUnknown && field.onUnknownChange ? (
                  <Pressable
                    style={styles.unknownRow}
                    onPress={() => {
                      haptic.light();
                      field.onUnknownChange?.(!field.unknown);
                    }}
                    {...a11y('მონაცემი ვერ დგინდება', undefined, 'checkbox')}
                  >
                    <View style={[styles.checkbox, field.unknown && styles.checkboxActive]}>
                      {field.unknown && <View style={styles.checkboxInner} />}
                    </View>
                    <Text style={styles.unknownLabel}>მონაცემი ვერ დგინდება</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function getstyles(theme: Theme) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    item: {
      paddingHorizontal: 4,
      marginBottom: 12,
    },
    textFieldWrap: { gap: 2 },
    multiWrap: { gap: 12 },
    unknownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    checkbox: {
      width: 15,
      height: 15,
      borderRadius: 3,
      borderWidth: 1.5,
      borderColor: theme.colors.inkSoft,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    checkboxInner: {
      width: 7,
      height: 7,
      borderRadius: 1,
      backgroundColor: theme.colors.white,
    },
    unknownLabel: { fontSize: 11, color: theme.colors.inkSoft },
  });
}
