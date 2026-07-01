/**
 * Multi-select topic list for the briefing (ინსტრუქტაჟი) wizard, step 1.
 * Thin wrapper over the canonical {@link Selector} (multi · rows) — selecting
 * `other` reveals a free-text topic input.
 */
import { Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Scale, Zap, DoorOpen, ShieldAlert, CircleArrowUp, ScrollText, HeartPulse,
  Signpost, Container, Truck, PersonStanding, Monitor, Sparkles, Cog,
  FlaskConical, Pencil, Wrench, Shield, Flame,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { Selector, type SelectorOption } from '../ui/Selector';
import { BRIEFING_TOPIC_KEYS, KNOWN_BRIEFING_TOPIC_KEYS } from '../../lib/briefingTopics';

/** The topics offered in the picker, in the source-document order. */
export const TOPIC_OPTION_KEYS = BRIEFING_TOPIC_KEYS;

/** Every known key (catalog + legacy) — used for label/icon resolution. */
export const TOPIC_KEYS = KNOWN_BRIEFING_TOPIC_KEYS;

/**
 * Icons for every known topic key — the 15 catalog topics + `other`, plus 3
 * legacy keys (scaffold_safety / ppe / fire_safety) kept so historical briefings
 * still render an icon. Similar/semantic glyphs per topic.
 */
export const TOPIC_ICONS: Record<string, LucideIcon> = {
  labor_safety_principles: Scale,
  workplace_electrical: Zap,
  evacuation: DoorOpen,
  risk_control: ShieldAlert,
  height_work: CircleArrowUp,
  internal_regulations: ScrollText,
  first_aid: HeartPulse,
  safety_signs: Signpost,
  load_handling: Container,
  heavy_machinery: Truck,
  ergonomics: PersonStanding,
  monitor_radiation: Monitor,
  housekeeping: Sparkles,
  technical_equipment: Cog,
  chemical_safety: FlaskConical,
  other: Pencil,
  // legacy (not offered in the picker)
  scaffold_safety: Wrench,
  ppe: Shield,
  fire_safety: Flame,
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
  const options: SelectorOption[] = TOPIC_OPTION_KEYS.map((key) => ({
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
          label={t('briefings.topicNameLabel')}
          value={customTopic}
          onChangeText={onChangeCustomTopic}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      )}
    </>
  );
}
