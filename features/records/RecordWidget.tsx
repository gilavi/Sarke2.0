import { Fragment, useMemo, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SkeletonRow } from '../../components/Skeleton';
import { ViewMoreRow } from '../../components/projects/ProjectRowHelpers';
import { useTheme } from '../../lib/theme';
import { getRecordStyles } from './styles';

/**
 * A single per-type "record section" card matching the project-detail screen:
 * header (type icon + title + count) over a short preview of completed rows,
 * with the overflow surfaced as a bottom `ViewMoreRow` (stacked avatars +
 * "+N more") that deep-links to the History screen filtered to this type —
 * exactly like the project sections. No top-right "view all".
 */
export function RecordWidget<T>({
  icon: Icon,
  title,
  items,
  previewCount = 4,
  loading = false,
  emptyText,
  viewAllHref,
  keyOf,
  renderRow,
  getCategory,
  renderAvatar,
}: {
  icon: LucideIcon;
  title: string;
  items: T[];
  previewCount?: number;
  loading?: boolean;
  emptyText: string;
  viewAllHref: string;
  keyOf: (item: T) => string;
  renderRow: (item: T, isLast: boolean) => ReactElement;
  getCategory?: (item: T) => string | null;
  /** Row-matching avatar for the "view all" stack (overrides `getCategory`). */
  renderAvatar?: (item: T) => ReactNode;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getRecordStyles(theme), [theme]);
  const router = useRouter();

  const preview = items.slice(0, previewCount);
  const overflow = items.slice(previewCount);
  const isEmpty = items.length === 0;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </View>

      {loading && isEmpty ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : isEmpty ? (
        <View style={styles.widgetEmpty}>
          <Text style={styles.widgetEmptyText}>{emptyText}</Text>
        </View>
      ) : (
        <View style={{ marginTop: 10 }}>
          {preview.map((item, i) => (
            <Fragment key={keyOf(item)}>
              {renderRow(item, i === preview.length - 1 && overflow.length === 0)}
            </Fragment>
          ))}
          {overflow.length > 0 ? (
            <ViewMoreRow
              avatars={renderAvatar ? overflow.slice(0, 3).map((o) => renderAvatar(o)) : undefined}
              items={renderAvatar ? undefined : overflow.map((o) => ({ category: getCategory?.(o) ?? null }))}
              total={overflow.length}
              onPress={() => router.push(viewAllHref as never)}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}
