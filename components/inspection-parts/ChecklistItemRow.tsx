import { memo, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { StatusChip } from '../wizard/StatusChip';
import { HelpIcon } from '../ScaffoldHelpSheet';

export interface ChecklistRowOption {
  /** Stored value (e.g. 'ok' | 'bad' | 'good' | 'na'). */
  value: string;
  /** Icon-only chip (✓ / ✗ / ⚠). Omit when using `shortLabel`. */
  icon?: LucideIcon;
  /** Text chip (e.g. 'N/A') - rendered when there is no `icon`. */
  shortLabel?: string;
  /** Georgian accessibility label, e.g. "მხრის ღვედები - გამართული". */
  a11yLabel: string;
}

export interface ChecklistItemRowProps {
  label: string;
  description?: string;
  /** When set, renders a TextInput for the label instead of static text. */
  editableLabel?: { value: string; onChange: (text: string) => void; placeholder?: string };
  /** 2 options = harness ✓/✗; 3–4 = equipment ratings incl. N/A. */
  options: ChecklistRowOption[];
  /** `null` = unanswered (neutral - no chip filled). */
  value: string | null;
  /** Tapping the already-selected option clears back to `null`. */
  onChange: (value: string | null) => void;
  onHelp?: () => void;
  /** Compact chips for rows with 3–4 options so they fit a phone width. */
  dense?: boolean;
}

/**
 * Canonical "one item in a several-items-on-one-page checklist" row, shared by
 * the harness flow and the equipment inspections. Label (+ inline help "?") on
 * the left, a cluster of monochrome {@link StatusChip}s on the right - selected
 * fills solid ink, unselected is a quiet outline. Neutral (no selection) by
 * default. No per-row note/photo accordion by design; problem detail lives on
 * the conclusion step.
 */
export const ChecklistItemRow = memo(function ChecklistItemRow({
  label,
  description,
  editableLabel,
  options,
  value,
  onChange,
  onHelp,
  dense,
}: ChecklistItemRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <View style={styles.labelRow}>
          {editableLabel ? (
            <TextInput
              style={[styles.label, styles.labelInput]}
              value={editableLabel.value}
              onChangeText={editableLabel.onChange}
              placeholder={editableLabel.placeholder ?? 'დასახელება...'}
              placeholderTextColor={theme.colors.inkFaint}
            />
          ) : (
            <>
              <Text style={styles.label} numberOfLines={2}>
                {label}
              </Text>
              {onHelp ? <HelpIcon onPress={onHelp} /> : null}
            </>
          )}
        </View>
        {description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>

      <View style={[styles.chips, dense && styles.chipsDense]}>
        {options.map(opt => {
          const selected = value === opt.value;
          return (
            <StatusChip
              key={opt.value}
              layout="chip"
              selected={selected}
              icon={opt.icon}
              label={opt.shortLabel ?? ''}
              onPress={() => {
                haptic.light();
                onChange(selected ? null : opt.value);
              }}
              a11yLabel={opt.a11yLabel}
              style={[
                styles.chip,
                opt.shortLabel ? styles.chipText : null,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}, (prev, next) =>
  prev.label === next.label &&
  prev.description === next.description &&
  prev.editableLabel?.value === next.editableLabel?.value &&
  prev.editableLabel?.onChange === next.editableLabel?.onChange &&
  prev.value === next.value &&
  prev.dense === next.dense &&
  prev.onChange === next.onChange &&
  prev.onHelp === next.onHelp &&
  prev.options === next.options,
);

function getStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    info: { flex: 1, minWidth: 0, gap: 2 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { flexShrink: 1, fontSize: 15, fontWeight: '500', color: theme.colors.ink, lineHeight: 20 },
    labelInput: { flex: 1, padding: 0 },
    desc: { fontSize: 12, color: theme.colors.inkSoft, lineHeight: 16 },
    chips: { flexDirection: 'row', gap: 8, flexShrink: 0 },
    // Tighter gap when there are 3–4 options, so the chips themselves stay the
    // same size as the 2-option (harness) toggle rather than shrinking.
    chipsDense: { gap: 6 },
    // Icon-only ✓/✗ - fixed square chips (override StatusChip's flex:1). Same
    // size everywhere so equipment matches the harness toggle.
    chip: { flex: 0, minWidth: 50, paddingHorizontal: 0 },
    chipText: { minWidth: 52, paddingHorizontal: 10 },
  });
}
