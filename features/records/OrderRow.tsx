import { ChevronRight, FileText } from 'lucide-react-native';
import { InspectionRow } from '../../components/InspectionRow';
import { RecordAvatar } from '../../components/RecordAvatar';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { formatShortDateTime } from '../../lib/formatDate';
import { ORDER_DOCUMENT_TYPE_LABEL, type Order } from '../../types/models';

/**
 * Status-free brdzaneba (order) row, reused by Home / History / Drafts.
 * Home/History pass `onPress` to open the order detail screen
 * (`app/orders/[id].tsx`); without one the row is display-only (no chevron /
 * tap) — e.g. the Drafts list.
 */
export function OrderRow({
  order,
  onPress,
  showBorder,
}: {
  order: Order;
  onPress?: () => void;
  showBorder?: boolean;
}) {
  const { theme } = useTheme();
  const label = ORDER_DOCUMENT_TYPE_LABEL[order.documentType] ?? order.documentType;
  return (
    <InspectionRow
      leading={<RecordAvatar icon={FileText} tint={theme.colors.certTint} bg={theme.colors.certSoft} />}
      title={label}
      subtitle={formatShortDateTime(order.createdAt)}
      trailing={onPress ? <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} /> : null}
      inset={0}
      showBorder={showBorder}
      onPress={onPress}
      a11y={a11y(label, 'ბრძანება', 'button')}
    />
  );
}
