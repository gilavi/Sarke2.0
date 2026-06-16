import { View } from 'react-native';
import { haptic } from '../../lib/haptics';
import { StatusChip } from './StatusChip';

interface AnswerButtonsProps {
  value: boolean | null;
  onChange: (v: boolean) => void;
}

/**
 * Binary yes/no answer for the inspection wizard. Monochrome via StatusChip —
 * the ✓/✗ icons carry the meaning, not color. Haptics fire here; the chip owns
 * the press animation.
 */
export function AnswerButtons({ value, onChange }: AnswerButtonsProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <StatusChip
        layout="pill"
        selected={value === true}
        label="კი"
        icon="checkmark"
        onPress={() => {
          haptic.answerYes();
          onChange(true);
        }}
        a11yLabel="პასუხი: კი. უსაფრთხოა."
        a11yHint="შეეხეთ თუ პასუხი დადებითია"
      />
      <StatusChip
        layout="pill"
        selected={value === false}
        label="არა"
        icon="close"
        onPress={() => {
          haptic.answerNo();
          onChange(false);
        }}
        a11yLabel="პასუხი: არა. არ არის უსაფრთხო."
        a11yHint="შეეხეთ თუ პასუხი უარყოფითია"
      />
    </View>
  );
}
