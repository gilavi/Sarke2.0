/**
 * Reusable, dynamic verdict selector — the canonical "გადაწყვეტილება" picker
 * for every inspection conclusion step (equipment routes, harness, and the
 * scaffold wizard). Renders one icon + label button per option in the
 * scaffold's style (originally bespoke in features/inspection-wizard).
 *
 * Icon resolution, in order of precedence:
 *   1. an explicit `option.icon`
 *   2. a semantic `option.tone` ('success' | 'caution' | 'danger')
 *   3. positional default — first option reads positive (shield), last reads
 *      negative (warning), anything in between is caution (eye). Every flow
 *      orders its options positive → negative, so this needs no per-route wiring.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';

type IoniconName = keyof typeof Ionicons.glyphMap;

export type VerdictTone = 'success' | 'caution' | 'danger';

export interface VerdictOption<T extends string = string> {
  value: T;
  label: string;
  /** Explicit icon — overrides `tone` and the positional default. */
  icon?: IoniconName;
  /** Semantic tone — drives the default icon when `icon` is absent. */
  tone?: VerdictTone;
}

export interface VerdictSelectorProps<T extends string = string> {
  value: T | null;
  options: VerdictOption<T>[];
  onChange: (v: T) => void;
  /** Caption above the buttons. Defaults to "გადაწყვეტილება". */
  title?: string;
  showError?: boolean;
  errorText?: string;
}

const TONE_ICON: Record<VerdictTone, IoniconName> = {
  success: 'shield-checkmark',
  caution: 'eye-outline',
  danger: 'warning',
};

function positionalIcon(index: number, count: number): IoniconName {
  if (index === 0) return 'shield-checkmark';
  if (index === count - 1) return 'warning';
  return 'eye-outline';
}

export function VerdictSelector<T extends string = string>({
  value,
  options,
  onChange,
  title = 'გადაწყვეტილება',
  showError = false,
  errorText = 'აუცილებლად აირჩიეთ სტატუსი.',
}: VerdictSelectorProps<T>) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const press = (v: T) => {
    haptic.light();
    onChange(v);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.header, { color: theme.colors.inkSoft }]}>{title}</Text>
      <View style={styles.row}>
        {options.map((opt, i) => {
          const active = value === opt.value;
          const icon = opt.icon ?? (opt.tone ? TONE_ICON[opt.tone] : positionalIcon(i, options.length));
          return (
            <Pressable
              key={opt.value}
              onPress={() => press(opt.value)}
              style={[
                styles.button,
                active
                  ? { backgroundColor: theme.colors.subtleSurface, borderColor: theme.colors.ink }
                  : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              {...a11y(opt.label, undefined, 'button', { selected: active })}
            >
              <Ionicons name={icon} size={24} color={active ? theme.colors.ink : theme.colors.inkFaint} />
              <Text style={[styles.label, { color: active ? theme.colors.ink : theme.colors.inkSoft }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {showError ? <Text style={[styles.error, { color: theme.colors.danger }]}>{errorText}</Text> : null}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    header: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    row: { flexDirection: 'row', gap: 8 },
    button: {
      flex: 1,
      minHeight: 92,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    label: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
    error: { fontSize: 12, marginTop: 4 },
  });
}
