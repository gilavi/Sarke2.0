import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { InspectionRow } from '../../components/InspectionRow';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { formatShortDateTime } from '../../lib/formatDate';
import type { Report } from '../../types/models';
import { ReportThumb } from './ReportThumb';

/** Status-free report row. Leading avatar is a 16:9 thumbnail of the first
 *  photo; otherwise the same layout as every other record row. */
export function ReportRow({
  report,
  onPress,
  showBorder,
}: {
  report: Report;
  onPress: () => void;
  showBorder?: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <InspectionRow
      leading={<ReportThumb report={report} />}
      title={report.title}
      subtitle={`${t('records.slideCount', { count: report.slides.length })} · ${formatShortDateTime(report.created_at)}`}
      trailing={<ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />}
      inset={0}
      showBorder={showBorder}
      onPress={onPress}
      a11y={a11y(report.title, t('records.reportViewA11y'), 'button')}
    />
  );
}
