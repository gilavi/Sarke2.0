/**
 * Reusable conclusion step for equipment inspection flows.
 * Renders verdict pill selector + conclusion textarea + optional notes + optional harness name.
 */
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { SuggestionPills } from '../SuggestionPills';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

export interface VerdictOption<T extends string = string> {
  value: T;
  label: string;
}

export interface ConclusionStepProps<T extends string = string> {
  verdict: T | null;
  verdictOptions: VerdictOption<T>[];
  conclusionText?: string;
  onVerdictChange: (v: T | null) => void;
  onConclusionChange?: (t: string) => void;
  notes?: string;
  onNotesChange?: (t: string) => void;
  showHarnessName?: boolean;
  harnessName?: string;
  onHarnessNameChange?: (t: string) => void;
  conclusionHistory?: string[];
  /** Slot for summary photos strip or other extra content */
  photoSection?: ReactNode;
  completing?: boolean;
}

export function ConclusionStep<T extends string = string>({
  verdict,
  verdictOptions,
  conclusionText,
  onVerdictChange,
  onConclusionChange,
  notes,
  onNotesChange,
  showHarnessName = false,
  harnessName,
  onHarnessNameChange,
  conclusionHistory,
  photoSection,
  completing = false,
}: ConclusionStepProps<T>) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={120}
    >
      {showHarnessName ? (
        <FloatingLabelInput
          label="ღვედის დასახელება *"
          value={harnessName ?? ''}
          onChangeText={onHarnessNameChange ?? (() => {})}
          required
        />
      ) : null}

      <Text style={[styles.fieldLabel, { color: theme.colors.ink }]}>დასკვნა *</Text>
      <View style={styles.chipRow}>
        {verdictOptions.map(opt => {
          const active = verdict === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.chip,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                active && { borderColor: theme.colors.ink, backgroundColor: theme.colors.subtleSurface },
              ]}
              onPress={() => onVerdictChange(active ? null : opt.value)}
              {...a11y(opt.label, undefined, 'radio', { selected: active })}
            >
              <Text style={[
                styles.chipText,
                { color: theme.colors.inkSoft },
                active && { color: theme.colors.ink, fontWeight: '700' },
              ]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {(onNotesChange !== undefined || onConclusionChange !== undefined) ? (
        <>
          <FloatingLabelInput
            label="შენიშვნები / ხარვეზები"
            value={notes ?? ''}
            onChangeText={onNotesChange ?? (() => {})}
            multiline
            numberOfLines={4}
          />
          {conclusionHistory && conclusionHistory.length > 0 && onConclusionChange ? (
            <SuggestionPills
              suggestions={conclusionHistory}
              onSelect={onConclusionChange}
              visible
            />
          ) : null}
        </>
      ) : null}

      {photoSection ?? null}

      {completing ? (
        <View style={styles.completingRow}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={[styles.completingText, { color: theme.colors.inkSoft }]}>მიმდინარეობს…</Text>
        </View>
      ) : null}
    </KeyboardAwareScrollView>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 24,
      gap: 12,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    chipText: {
      fontSize: 13,
    },
    completingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
      paddingTop: 8,
    },
    completingText: {
      fontSize: 14,
    },
  });
}
