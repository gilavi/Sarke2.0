import Animated, { LinearTransition } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { haptic } from '../../lib/haptics';
import { useAccessibilitySettings } from '../../lib/accessibility';
import { StatusChip } from './StatusChip';

interface AnswerButtonsProps {
  value: boolean | null;
  onChange: (v: boolean) => void;
  /**
   * Compact = icon beside label (chip), used while the keyboard is open so the
   * footer shrinks and the note input stays visible. Default = stacked pills.
   */
  compact?: boolean;
  /** Reveal a danger outline (+ shake) when no answer is chosen — set on a failed submit. */
  error?: boolean;
}

/**
 * Binary yes/no answer for the inspection wizard. Monochrome via StatusChip -
 * the ✓/✗ icons carry the meaning, not color. Haptics fire here; the chip owns
 * the press animation. The row morphs between stacked pills and a compact row
 * via a layout transition when `compact` flips.
 */
export function AnswerButtons({ value, onChange, compact, error }: AnswerButtonsProps) {
  const { reduceMotion } = useAccessibilitySettings();
  const layout = compact ? 'chip' : 'pill';
  const showError = !!error && value === null;
  return (
    <Animated.View
      layout={reduceMotion ? undefined : LinearTransition.duration(200)}
      style={{ flexDirection: 'row', gap: 12 }}
    >
      <StatusChip
        layout={layout}
        selected={value === true}
        error={showError}
        label="კი"
        icon={Check}
        onPress={() => {
          haptic.answerYes();
          onChange(true);
        }}
        a11yLabel="პასუხი: კი. უსაფრთხოა."
        a11yHint="შეეხეთ თუ პასუხი დადებითია"
      />
      <StatusChip
        layout={layout}
        selected={value === false}
        error={showError}
        label="არა"
        icon={X}
        onPress={() => {
          haptic.answerNo();
          onChange(false);
        }}
        a11yLabel="პასუხი: არა. არ არის უსაფრთხო."
        a11yHint="შეეხეთ თუ პასუხი უარყოფითია"
      />
    </Animated.View>
  );
}
