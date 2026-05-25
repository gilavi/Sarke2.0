import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
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
  /** Currently selected values (multiSelect mode — replaces value/onChange) */
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
      {fields.map((field, idx) => (
        <View
          key={idx}
          // chips/select fields span full width for readability
          style={[styles.item, { width: field.type === 'chips' || field.type === 'select' ? '100%' : itemWidth }]}
        >
          {field.type === 'select' ? (
            <SelectField field={field} />
          ) : field.type === 'chips' ? (
            field.multiSelect
              ? <MultiChipsField field={field} />
              : <ChipsField field={field} />
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
                  <Ionicons
                    name={field.unknown ? 'checkbox' : 'square-outline'}
                    size={15}
                    color={field.unknown ? theme.colors.accent : theme.colors.inkSoft}
                  />
                  <Text style={styles.unknownLabel}>მონაცემი ვერ დგინდება</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ── Single-select "form selector" — full-width selectable list rows ──────────

function SelectField({ field }: { field: IdentificationField }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const options = field.options ?? [];
  const labels = field.optionLabels ?? options;

  return (
    <View style={styles.chipsGroup}>
      <Text style={styles.chipsLabel}>{field.label}</Text>
      <View style={styles.selectList}>
        {options.map((opt, i) => {
          const active = field.value === opt;
          return (
            <Pressable
              key={opt}
              style={[styles.selectRow, active && styles.selectRowActive]}
              onPress={() => {
                haptic.light();
                field.onChange?.(opt);
              }}
              {...a11y(labels[i] ?? opt, undefined, 'radio')}
            >
              <Text style={[styles.selectRowText, active && styles.selectRowTextActive]}>
                {labels[i] ?? opt}
              </Text>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Single-select chips field ─────────────────────────────────────────────────

function ChipsField({ field }: { field: IdentificationField }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const options = field.options ?? [];
  const labels = field.optionLabels ?? options;

  return (
    <View style={styles.chipsGroup}>
      <Text style={styles.chipsLabel}>{field.label}</Text>
      <View style={styles.chipsRow}>
        {options.map((opt, i) => {
          const active = field.value === opt;
          const isProb = field.isProblematic && active;
          const isWarn = !isProb && field.isWarning && active;
          return (
            <Pressable
              key={opt}
              style={[
                styles.chip,
                active && styles.chipActive,
                isProb && styles.chipProblematic,
                isWarn && styles.chipWarning,
              ]}
              onPress={() => {
                haptic.light();
                field.onChange?.(opt);
              }}
              {...a11y(labels[i] ?? opt, undefined, 'radio')}
            >
              <Text
                style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                  isProb && styles.chipTextProblematic,
                  isWarn && styles.chipTextWarning,
                ]}
              >
                {labels[i] ?? opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Multi-select chips field ──────────────────────────────────────────────────

function MultiChipsField({ field }: { field: IdentificationField }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const options = field.options ?? [];
  const labels = field.optionLabels ?? options;
  const selected = field.values ?? [];
  const otherActive = field.otherOptionValue ? selected.includes(field.otherOptionValue) : false;

  const toggle = (opt: string) => {
    haptic.light();
    const next = selected.includes(opt)
      ? selected.filter(v => v !== opt)
      : [...selected, opt];
    field.onValuesChange?.(next);
  };

  return (
    <View style={styles.chipsGroup}>
      <Text style={styles.chipsLabel}>{field.label}</Text>
      <View style={styles.chipsRow}>
        {options.map((opt, i) => {
          const active = selected.includes(opt);
          return (
            <Pressable
              key={opt}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(opt)}
              {...a11y(labels[i] ?? opt, undefined, 'checkbox')}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {active ? '✓ ' : ''}{labels[i] ?? opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {otherActive && field.onOtherValueChange ? (
        <FloatingLabelInput
          label={`${field.otherOptionValue} — კონკრეტული სახელი`}
          value={field.otherValue ?? ''}
          onChangeText={field.onOtherValueChange}
        />
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    item: {
      paddingHorizontal: 4,
      marginBottom: 4,
    },
    textFieldWrap: { gap: 2 },
    unknownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    unknownLabel: { fontSize: 11, color: theme.colors.inkSoft },
    chipsGroup: { gap: 8 },
    chipsLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    selectList: { gap: 8 },
    selectRow: {
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
    selectRowActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    selectRowText: { fontSize: 15, color: theme.colors.ink, fontWeight: '500' },
    selectRowTextActive: { color: theme.colors.accent, fontWeight: '700' },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: theme.colors.accent },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent },
    chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    chipActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    chipProblematic: {
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
    },
    chipWarning: {
      borderColor: theme.colors.warn,
      backgroundColor: theme.colors.warnSoft,
    },
    chipText: { fontSize: 12, color: theme.colors.inkSoft },
    chipTextActive: { color: theme.colors.accent, fontWeight: '700' },
    chipTextProblematic: { color: theme.colors.danger, fontWeight: '700' },
    chipTextWarning: { color: theme.colors.warn, fontWeight: '700' },
  });
}
