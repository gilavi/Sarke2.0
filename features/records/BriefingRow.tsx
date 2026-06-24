import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { InspectionRow } from '../../components/InspectionRow';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { formatShortDateTime } from '../../lib/formatDate';
import type { Briefing } from '../../types/models';
import { BriefingTopicAvatar } from './BriefingTopicAvatar';
import { briefingTopicsLabel } from './topics';

/** Status-free briefing row. Leading avatar shows the topic icon(s); the title
 *  is the topic name(s). Reused by Home / History / Drafts. */
export function BriefingRow({
  briefing,
  onPress,
  showBorder,
}: {
  briefing: Briefing;
  onPress: () => void;
  showBorder?: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <InspectionRow
      leading={<BriefingTopicAvatar topics={briefing.topics} />}
      title={briefingTopicsLabel(briefing.topics, t)}
      subtitle={`${t('records.participantCount', { count: briefing.participants.length })} · ${formatShortDateTime(briefing.dateTime)}`}
      trailing={<ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />}
      inset={0}
      showBorder={showBorder}
      onPress={onPress}
      a11y={a11y(t('records.briefingA11y'), t('records.viewDetailsA11y'), 'button')}
    />
  );
}
