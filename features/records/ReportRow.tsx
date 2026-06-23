import { ChevronRight } from 'lucide-react-native';
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
  return (
    <InspectionRow
      leading={<ReportThumb report={report} />}
      hidePill
      title={report.title}
      subtitle={`${report.slides.length} სლაიდი · ${formatShortDateTime(report.created_at)}`}
      trailing={<ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />}
      inset={0}
      showBorder={showBorder}
      onPress={onPress}
      a11y={a11y(report.title, 'რეპორტის ნახვა', 'button')}
    />
  );
}
