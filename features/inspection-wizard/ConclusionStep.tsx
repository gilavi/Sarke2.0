import { memo, useMemo, useState } from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { QuestionAvatar } from '../../components/QuestionAvatar';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { AnswerPhoto, Question, Template } from '../../types/models';
import { getstyles, staticStyles } from './styles';
import { AttachmentBars } from './AttachmentBars';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { VerdictSelector, type SafetyVerdict } from './VerdictSelector';

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
  onSafetyVerdict: (v: SafetyVerdict) => void;
  template: Template | null;
  harnessName: string;
  onHarnessName: (s: string) => void;
  photoQuestion: Question | null;
  photoAnswerId: string | null;
  photos: AnswerPhoto[];
  onPickPhoto: () => void;
  onDeletePhoto: (photo: AnswerPhoto) => Promise<void>;
}) {
  // photoAnswerId is propagated for parity with the original signature;
  // PhotoThumb/PhotoPreviewModal key off photo.id internally.
  void photoAnswerId;
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const needsHarness = template?.category === 'harness';
  const harnessEmpty = needsHarness && !harnessName.trim();
  const conclusionEmpty = !conclusion.trim();
  // Don't surface "required" errors until the user has engaged with the step.
  const [interacted, setInteracted] = useState(false);
  const markInteracted = () => setInteracted(true);
  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);
  const accessoryId = 'wizardConclusionAccessory';

  return (
    <View style={staticStyles.gap18}>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.kbAccessory}>
            <Pressable
              hitSlop={10}
              onPress={() => Keyboard.dismiss()}
              style={({ pressed }) => [styles.kbDoneBtn, pressed && { opacity: 0.6 }]}
              {...a11y('მზადაა', 'შეეხეთ კლავიატურის დასახურად', 'button')}
            >
              <Text style={styles.kbDoneText}>მზადაა</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <QuestionAvatar illustrationKey="conclusion" />
      </View>
      {needsHarness ? (
        <FloatingLabelInput
          label="ღვედის დასახელება"
          required
          value={harnessName}
          onChangeText={(s) => { setInteracted(true); onHarnessName(s); }}
          error={interacted && harnessEmpty ? 'სავალდებულო ველი' : undefined}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
        />
      ) : null}
      <VerdictSelector
        value={safetyVerdict}
        onChange={onSafetyVerdict}
        onInteract={markInteracted}
        showError={interacted && safetyVerdict === null}
      />
      {photoQuestion ? (
        <View style={staticStyles.gap8}>
          <Text style={styles.label}>საერთო ფოტოები</Text>
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
      ) : null}
      <View>
        <FloatingLabelInput
          label="დასკვნა"
          required
          value={conclusion}
          onChangeText={(s) => { setInteracted(true); onConclusion(s); }}
          error={interacted && conclusionEmpty ? 'სავალდებულო ველი' : undefined}
          multiline
          inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
        />
      </View>
    </View>
  );
});
