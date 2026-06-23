// Files + Orders section of the project detail screen.
//
// One card on the screen shows both:
//   - Generated orders (ბრძანებები) - read-only previews
//   - Uploaded files (ფაილები) - swipe-to-delete, tap-to-open
//
// Header has two `+` actions: "+ ბრძანება" (new order) and
// "+ ატვირთვა" (upload file). Empty state renders only when both
// lists are empty.

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Award, ChevronRight, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { FileThumbnail, ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
import { SkeletonRow } from '../../../components/Skeleton';
import { OrderRow } from '../../records';
import { useTheme } from '../../../lib/theme';
import { a11y } from '../../../lib/accessibility';
import { formatShortDateTime } from '../../../lib/formatDate';
import type { Order, ProjectFile } from '../../../types/models';
import { getStyles } from '../styles';

export function FilesAndOrdersSection({
  id,
  files,
  orders,
  filesBusy,
  loading = false,
  onUpload,
  onOpenFile,
  onDeleteFile,
}: {
  id: string | undefined;
  files: ProjectFile[];
  orders: Order[];
  filesBusy: boolean;
  loading?: boolean;
  onUpload: () => void;
  onOpenFile: (f: ProjectFile) => void;
  onDeleteFile: (f: ProjectFile) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  const filesSorted = useMemo(
    () => [...files].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [files],
  );
  const filesPreview = useMemo(() => filesSorted.slice(0, 3), [filesSorted]);
  const overflowFiles = useMemo(() => filesSorted.slice(3), [filesSorted]);
  // Completed-only — draft orders live in the global Drafts screen (More tab).
  const completedOrders = useMemo(() => orders.filter((o) => o.status === 'completed'), [orders]);

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Award size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>ბრძანებები</Text>
          <Text style={styles.sectionCount}>{files.length + completedOrders.length}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.push(`/orders/new?projectId=${id}` as any)}
            hitSlop={16}
            {...a11y('ბრძანების შექმნა', 'ახალი ბრძანების შექმნა', 'button')}
          >
            <Text style={styles.sectionAddLink}>+ ბრძანება</Text>
          </Pressable>
          <Pressable onPress={onUpload} disabled={filesBusy} hitSlop={16}>
            <Text style={[styles.sectionAddLink, filesBusy && { opacity: 0.5 }]}>
              {filesBusy ? 'იტვირთება…' : '+ ატვირთვა'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Generated orders (ბრძანებები) — completed only */}
      {completedOrders.length > 0 ? (
        <View style={{ marginTop: 4 }}>
          {completedOrders.map((order, i) => (
            <OrderRow
              key={order.id}
              order={order}
              showBorder={i < completedOrders.length - 1 || filesPreview.length > 0}
            />
          ))}
        </View>
      ) : null}

      {/* Uploaded files */}
      {loading && files.length === 0 && completedOrders.length === 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : files.length === 0 && completedOrders.length === 0 ? (
        <SectionEmptyState type="documents" />
      ) : files.length === 0 ? null : (
        <View style={{ marginTop: completedOrders.length > 0 ? 0 : 4 }}>
          {filesPreview.map((f, i) => (
            <Swipeable
              key={f.id}
              renderRightActions={() => (
                <Pressable onPress={() => onDeleteFile(f)} style={styles.swipeDelete} {...a11y('ფაილის წაშლა', 'ფაილის წაშლა', 'button')}>
                  <Trash2 size={18} color={theme.colors.white} strokeWidth={1.5} />
                </Pressable>
              )}
              overshootRight={false}
            >
              <Pressable
                onPress={() => onOpenFile(f)}
                style={[
                  styles.listRow,
                  (i < filesPreview.length - 1 || overflowFiles.length > 0) && styles.listRowBorder,
                ]}
                {...a11y(f.name, 'ფაილის გახსნა', 'button')}
              >
                <FileThumbnail file={f} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.listRowSubtitle}>
                    {formatShortDateTime(f.created_at)}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
              </Pressable>
            </Swipeable>
          ))}
          {overflowFiles.length > 0 ? (
            <ViewMoreRow
              items={overflowFiles.map(() => ({ category: null }))}
              total={overflowFiles.length}
              onPress={() => router.push(`/projects/${id}/files` as any)}
            />
          ) : null}
        </View>
      )}
    </>
  );
}
