// Inspections section of the project detail screen.
//
// Renders a header (count + "+ add" link) and a preview of the three most
// recent unified inspections (generic + per-equipment). Swipe a row to
// delete via `deleteInspection`. The "view more" row navigates to the
// full inspections list. Empty state renders when `allInspections` is
// empty.

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ChevronRight, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { InspectionRow } from '../../../components/InspectionRow';
import { EmptyState, ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
import { SkeletonRow } from '../../../components/Skeleton';
import { useTheme } from '../../../lib/theme';
import { a11y } from '../../../lib/accessibility';
import { formatShortDateTime } from '../../../lib/formatDate';
import { routeForInspection } from '../../../lib/inspectionRouting';
import { inspectionDisplayName } from '../../../lib/shared/documentName';
import type { Template } from '../../../types/models';
import { getStyles } from '../styles';
import type { UnifiedInspection } from '../unifiedInspections';

export function InspectionsSection({
  id,
  allInspections,
  templates,
  loading = false,
  onAdd,
  onDelete,
}: {
  id: string | undefined;
  allInspections: UnifiedInspection[];
  templates: Template[];
  loading?: boolean;
  onAdd: () => void;
  onDelete: (item: UnifiedInspection) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  // Completed-only — drafts live in the global Drafts screen (More tab).
  const completed = useMemo(() => allInspections.filter((i) => i.status === 'completed'), [allInspections]);
  const preview = useMemo(() => completed.slice(0, 3), [completed]);
  const overflow = useMemo(() => completed.slice(3), [completed]);

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>{t('projects.questionnairesSection')}</Text>
          <Text style={styles.sectionCount}>{completed.length}</Text>
        </View>
        <Pressable onPress={onAdd} hitSlop={16}>
          <Text style={styles.sectionAddLink}>+ დამატება</Text>
        </Pressable>
      </View>

      {loading && completed.length === 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : completed.length === 0 ? (
        <EmptyState text={t('projects.noCompletedInspections')} />
      ) : (
        <View style={{ marginTop: 4 }}>
          {preview.map((item, i) => {
            const tpl = templates.find(tt => tt.id === item.template_id);
            const route = routeForInspection(item.source, item.id, true);
            const isLast = i === preview.length - 1 && overflow.length === 0;
            return (
              <Swipeable
                key={`${item.source}-${item.id}`}
                renderRightActions={() => (
                  <Pressable onPress={() => onDelete(item)} style={styles.swipeDelete} {...a11y('შემოწმების აქტს წაშლა', 'შემოწმების აქტს წაშლა', 'button')}>
                    <Trash2 size={18} color={theme.colors.white} strokeWidth={1.5} />
                  </Pressable>
                )}
                overshootRight={false}
              >
                <InspectionRow
                  category={item.source ?? tpl?.category}
                  title={inspectionDisplayName(tpl?.name)}
                  subtitle={formatShortDateTime(item.created_at)}
                  trailing={<ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />}
                  inset={0}
                  showBorder={!isLast}
                  onPress={() => router.push(route as any)}
                  a11y={a11y(inspectionDisplayName(tpl?.name), 'დასრულებული შემოწმების აქტს ნახვა', 'button')}
                />
              </Swipeable>
            );
          })}
          {overflow.length > 0 ? (
            <ViewMoreRow
              items={overflow.map(item => {
                const tpl = templates.find(tt => tt.id === item.template_id);
                return { category: item.source ?? tpl?.category ?? null };
              })}
              total={overflow.length}
              onPress={() => router.push(`/projects/${id}/inspections` as any)}
            />
          ) : null}
        </View>
      )}
    </>
  );
}
