import { Pencil, type LucideIcon } from 'lucide-react-native';
import { TOPIC_ICONS, TOPIC_KEYS } from '../../components/briefings/TopicSelector';
import i18n from '../../lib/i18n';

// Briefing topic helpers shared by the briefing row + its topic avatar.
// Topics are either a known catalog key (scaffold_safety, …) or a free-text
// custom topic stored as `custom:<text>` (see app/briefings/new.tsx).

const isKnownKey = (topic: string): topic is (typeof TOPIC_KEYS)[number] =>
  (TOPIC_KEYS as readonly string[]).includes(topic);

export function briefingTopicIcon(topic: string): LucideIcon {
  return isKnownKey(topic) ? TOPIC_ICONS[topic] : Pencil;
}

export function briefingTopicLabel(topic: string, t: (k: string) => string): string {
  if (topic.startsWith('custom:')) return topic.slice('custom:'.length) || i18n.t('briefings.flowTitle');
  return isKnownKey(topic) ? t(`briefings.topics.${topic}`) : topic;
}

/** Comma-joined topic names for the briefing row title. */
export function briefingTopicsLabel(topics: string[], t: (k: string) => string): string {
  if (!topics || topics.length === 0) return i18n.t('briefings.flowTitle');
  return topics.map((tp) => briefingTopicLabel(tp, t)).join(', ');
}

/** Up to `max` distinct topic icons for the stacked topic avatar. */
export function briefingTopicIcons(topics: string[], max = 3): LucideIcon[] {
  const out: LucideIcon[] = [];
  for (const tp of topics ?? []) {
    const Icon = briefingTopicIcon(tp);
    if (!out.includes(Icon)) out.push(Icon);
    if (out.length >= max) break;
  }
  return out.length ? out : [Pencil];
}
