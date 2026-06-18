/**
 * Multi-select topic list for the briefing (ინსტრუქტაჟი) wizard, step 1.
 * Thin wrapper over the canonical {@link Selector} (multi · rows) — selecting
 * `other` reveals a free-text topic input.
 */
import { Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Wrench, CircleArrowUp, Shield, DoorOpen, Flame, Pencil } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { Selector, type SelectorOption } from '../ui/Selector';

export const TOPIC_KEYS = [
  'scaffold_safety', 'height_work', 'ppe', 'evacuation', 'fire_safety', 'other',
] as const;

export const TOPIC_ICONS: Record<typeof TOPIC_KEYS[number], LucideIcon> = {
  scaffold_safety: Wrench,
  height_work: CircleArrowUp,
  ppe: Shield,
  evacuation: DoorOpen,
  fire_safety: Flame,
  other: Pencil,
};

export interface TopicSelectorProps {
  selectedTopics: Set<string>;
  onToggle: (key: string) => void;
  customTopic: string;
  onChangeCustomTopic: (value: string) => void;
}

export function TopicSelector({
  selectedTopics,
  onToggle,
  customTopic,
  onChangeCustomTopic,
}: TopicSelectorProps) {
  const { t } = useTranslation();

  const values = Array.from(selectedTopics);
  const options: SelectorOption[] = TOPIC_KEYS.map((key) => ({
    value: key,
    label: t(`briefings.topics.${key}`),
    icon: TOPIC_ICONS[key],
  }));

  return (
    <>
      <Selector
        mode="multi"
        presentation="rows"
        options={options}
        values={values}
        onValuesChange={(next) => {
          // Selector toggles exactly one option per press — find the changed key
          // and forward it through the existing onToggle API.
          const added = next.find((v) => !selectedTopics.has(v));
          const removed = values.find((v) => !next.includes(v));
          const key = added ?? removed;
          if (key) onToggle(key);
        }}
      />

      {selectedTopics.has('other') && (
        <FloatingLabelInput
          label="თემის დასახელება"
          value={customTopic}
          onChangeText={onChangeCustomTopic}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      )}
    </>
  );
}
