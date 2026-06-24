import { memo, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import {
  ConclusionStep as SharedConclusionStep,
  type VerdictOption,
} from '../../components/inspection-steps';
import { useTheme } from '../../lib/theme';
import type { AnswerPhoto, Question, Template } from '../../types/models';
import { getstyles, staticStyles } from './styles';
import { AttachmentBars } from './AttachmentBars';
import { PhotoPreviewModal } from './PhotoPreviewModal';

export type SafetyVerdict = 'safe' | 'caution' | 'unsafe';

/**
 * Scaffold-wizard conclusion step. Thin wrapper over the shared
 * `components/inspection-steps/ConclusionStep` so every inspection flow renders
 * the identical last step (illustration + icon-card verdict + "კომენტარი" box).
 * The wizard owns the surrounding scroll view, so we pass `scroll={false}`;
 * photos use the wizard's `AnswerPhoto` model via the photo slot.
 */
export const ConclusionStep = memo(function ConclusionStep({
  conclusion,
  onConclusion,
  safetyVerdict,
  onSafetyVerdict,
  template,
  harnessName,
  onHarnessName,
  photoQuestion,
  photoAnswerId,
  photos,
  onPickPhoto,
  onDeletePhoto,
}: {
  conclusion: string;
  onConclusion: (s: string) => void;
  safetyVerdict: SafetyVerdict | null;
  onSafetyVerdict: (v: SafetyVerdict | null) => void;
  template: Template | null;
  harnessName: string;
  onHarnessName: (s: string) => void;
  photoQuestion: Question | null;
  photoAnswerId: string | null;
  photos: AnswerPhoto[];
  onPickPhoto: () => void;
  onDeletePhoto: (photo: AnswerPhoto) => Promise<void>;
}) {
  const { t } = useTranslation();
  // Verdict values map to comment #11 from ClickUp "ფასადის ხარაჩოს შემოწმების აქტი":
  //   safe    → green  (უსაფრთხოა)
  //   caution → yellow (დასაშვებია, საჭიროებს დაკვირვებას)
  //   unsafe  → red    (დაუშვებელია გამოყენება)
  const SAFETY_VERDICT_OPTIONS: VerdictOption<SafetyVerdict>[] = [
    { value: 'safe', label: t('inspections.safe'), tone: 'success' },
    { value: 'caution', label: t('inspections.verdictCautionShort'), tone: 'caution' },
    { value: 'unsafe', label: t('inspections.verdictUnsafeShort'), tone: 'danger' },
  ];

  // photoAnswerId is propagated for parity with the original signature;
  // PhotoThumb/PhotoPreviewModal key off photo.id internally.
  void photoAnswerId;
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  // Don't surface "required" errors until the user has engaged with the step.
  const [interacted, setInteracted] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);

  return (
    <SharedConclusionStep
      scroll={false}
      verdict={safetyVerdict}
      verdictOptions={SAFETY_VERDICT_OPTIONS}
      onVerdictChange={(v) => { setInteracted(true); onSafetyVerdict(v); }}
      verdictError={interacted && safetyVerdict === null}
      showHarnessName={template?.category === 'harness'}
      harnessName={harnessName}
      onHarnessNameChange={(s) => { setInteracted(true); onHarnessName(s); }}
      notes={conclusion}
      onNotesChange={(s) => { setInteracted(true); onConclusion(s); }}
      notesRequired
      notesError={interacted && !conclusion.trim()}
      photoSection={photoQuestion ? (
        <View style={staticStyles.gap8}>
          <Text style={styles.label}>{t('inspections.generalPhotosLabel')}</Text>
          <AttachmentBars
            photos={photos}
            onPickPhoto={onPickPhoto}
            onDeletePhoto={onDeletePhoto}
            onViewPhoto={setPreviewPhoto}
          />
          <PhotoPreviewModal
            photo={previewPhoto}
            visible={!!previewPhoto}
            onClose={() => setPreviewPhoto(null)}
            onDelete={async (photo) => {
              await onDeletePhoto(photo);
            }}
          />
        </View>
      ) : undefined}
    />
  );
});
