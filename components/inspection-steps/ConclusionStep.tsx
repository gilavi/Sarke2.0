/**
 * Reusable, dynamic conclusion step - the single "last step" shared by every
 * inspection flow (equipment routes, harness, and the scaffold wizard).
 *
 * Renders, in order: a conclusion illustration, an optional summary slot, an
 * optional harness-name field, the shared icon-card VerdictSelector, a free-text
 * "კომენტარი" box, optional notes-history suggestion pills, and an optional photo
 * strip. The shell/wizard owns the footer CTA.
 */
import { type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { SuggestionPills } from '../SuggestionPills';
import { QuestionAvatar } from '../QuestionAvatar';
import { PhotoSection } from '../inspection-parts/PhotoSection';
import { useTheme } from '../../lib/theme';
import { VerdictSelector, type VerdictOption } from './VerdictSelector';
import { getConclusionStyles } from './ConclusionStep.styles';

export type { VerdictOption, VerdictTone } from './VerdictSelector';

export interface ConclusionStepProps<T extends string = string> {
  // Verdict
  verdict: T | null;
  verdictOptions: VerdictOption<T>[];
  onVerdictChange: (v: T | null) => void;
  verdictError?: boolean;
  /** Verdict-selector layout - 'row' (default) or 'vertical' for long labels. */
  verdictLayout?: 'row' | 'vertical';

  // Free-text comment
  notes?: string;
  onNotesChange?: (t: string) => void;
  /** Label for the comment field. Defaults to "კომენტარი". */
  notesLabel?: string;
  notesRequired?: boolean;
  notesError?: boolean;
  conclusionHistory?: string[];

  // Harness name (kamari / harness flows)
  showHarnessName?: boolean;
  harnessName?: string;
  onHarnessNameChange?: (t: string) => void;

  // Photos - first-class string[] strip, or a custom slot (scaffold AttachmentBars)
  photoPaths?: string[];
  onAddPhoto?: () => void;
  onDeletePhoto?: (path: string) => void;
  /** Label above the photo strip. Defaults to "ფოტოები (სურვ.)". */
  photoLabel?: string;
  photoSection?: ReactNode;

  // Layout
  showAvatar?: boolean;
  summarySection?: ReactNode;
  /** When false, render a plain View (the host already provides a scroll view). */
  scroll?: boolean;
  completing?: boolean;
}

export function ConclusionStep<T extends string = string>({
  verdict,
  verdictOptions,
  onVerdictChange,
  verdictError = false,
  verdictLayout = 'row',
  notes,
  onNotesChange,
  notesLabel = 'კომენტარი',
  notesRequired = false,
  notesError = false,
  conclusionHistory,
  showHarnessName = false,
  harnessName,
  onHarnessNameChange,
  photoPaths,
  onAddPhoto,
  onDeletePhoto,
  photoLabel = 'ფოტოები (სურვ.)',
  photoSection,
  showAvatar = true,
  summarySection,
  scroll = true,
  completing = false,
}: ConclusionStepProps<T>) {
  const { theme } = useTheme();
  const styles = getConclusionStyles(theme);

  const showNotes = onNotesChange !== undefined;
  const showPhotos =
    photoPaths !== undefined && onAddPhoto !== undefined && onDeletePhoto !== undefined;

  const body = (
    <>
      {showAvatar ? (
        <View style={styles.avatar}>
          <QuestionAvatar illustrationKey="conclusion" />
        </View>
      ) : null}

      {summarySection ?? null}

      {showHarnessName ? (
        <FloatingLabelInput
          label="ღვედის დასახელება"
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
          layout={verdictLayout}
          showError={verdictError}
        />
      ) : null}

      {showNotes ? (
        <>
          <FloatingLabelInput
            label={notesLabel}
            value={notes ?? ''}
            onChangeText={onNotesChange ?? (() => {})}
            required={notesRequired}
            error={notesError ? 'სავალდებულო ველი' : undefined}
            multiline
            numberOfLines={4}
          />
          {conclusionHistory && conclusionHistory.length > 0 ? (
            <SuggestionPills
              suggestions={conclusionHistory}
              onSelect={onNotesChange ?? (() => {})}
              visible
            />
          ) : null}
        </>
      ) : null}

      {showPhotos ? (
        <View style={styles.photoBlock}>
          <Text style={styles.photoLabel}>{photoLabel}</Text>
          <PhotoSection photoPaths={photoPaths!} onAdd={onAddPhoto!} onDelete={onDeletePhoto!} />
        </View>
      ) : null}

      {photoSection ?? null}

      {completing ? (
        <View style={styles.completingRow}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.completingText}>მიმდინარეობს…</Text>
        </View>
      ) : null}
    </>
  );

  if (!scroll) {
    return <View style={styles.embedded}>{body}</View>;
  }

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={120}
    >
      {body}
    </KeyboardAwareScrollView>
  );
}
