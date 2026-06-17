/**
 * Reusable conclusion step for equipment inspection flows.
 * Renders the shared VerdictSelector + conclusion textarea + optional notes + optional harness name.
 */
import { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { SuggestionPills } from '../SuggestionPills';
import { useTheme } from '../../lib/theme';
import { VerdictSelector, type VerdictOption } from './VerdictSelector';

export type { VerdictOption, VerdictTone } from './VerdictSelector';

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

      {verdictOptions.length > 0 ? (
        <VerdictSelector
          value={verdict}
          options={verdictOptions}
          onChange={onVerdictChange}
        />
      ) : null}

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
