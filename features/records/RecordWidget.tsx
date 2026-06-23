import { useMemo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SkeletonRow } from '../../components/Skeleton';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { getRecordStyles } from './styles';

/**
 * A single per-type "record section" card matching the project-detail screen:
 * header (type icon + title + count + "view all" link) over a short preview of
 * rows. Completed-only by contract — callers pass already-filtered items and
 * the rows themselves carry no status chrome. The "view all" link deep-links to
 * the History screen filtered to this type.
 */
export function RecordWidget({
  icon: Icon,
  title,
  count,
  viewAllHref,
  emptyText,
  loading = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  viewAllHref: string;
  emptyText: string;
  loading?: boolean;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getRecordStyles(theme), [theme]);
  const router = useRouter();
  const isEmpty = count === 0;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{count}</Text>
        </View>
        {!isEmpty ? (
          <Pressable
            onPress={() => router.push(viewAllHref as any)}
            hitSlop={12}
            {...a11y(t('records.viewAll'), undefined, 'button')}
          >
            <Text style={styles.sectionLink}>{t('records.viewAll')}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : isEmpty ? (
        <View style={styles.widgetEmpty}>
          <Text style={styles.widgetEmptyText}>{emptyText}</Text>
        </View>
      ) : (
        <View style={{ marginTop: 4 }}>{children}</View>
      )}
    </View>
  );
}
