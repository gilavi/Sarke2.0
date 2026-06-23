import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, FileText } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { formatShortDateTime } from '../../lib/formatDate';
import { ORDER_DOCUMENT_TYPE_LABEL, type Order } from '../../types/models';
import { getRecordStyles } from './styles';

/**
 * Status-free brdzaneba (order) row, reused by Home / History / Drafts.
 *
 * Orders have no per-order detail/edit screen on mobile (only `new` +
 * `[id]/success`), so the row is display-only unless an `onPress` is given.
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
  const styles = useMemo(() => getRecordStyles(theme), [theme]);
  const label = ORDER_DOCUMENT_TYPE_LABEL[order.documentType] ?? order.documentType;
  const body = (
    <>
      <View style={[styles.recordIcon, { backgroundColor: theme.colors.certSoft }]}>
        <FileText size={16} color={theme.colors.certTint} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listRowTitle} numberOfLines={1}>{label}</Text>
        <Text style={styles.listRowSubtitle}>{formatShortDateTime(order.createdAt)}</Text>
      </View>
    </>
  );

  if (!onPress) {
    return <View style={[styles.listRow, showBorder && styles.listRowBorder]}>{body}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={[styles.listRow, showBorder && styles.listRowBorder]}
      {...a11y(label, 'ბრძანების ნახვა', 'button')}
    >
      {body}
      <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
    </Pressable>
  );
}
