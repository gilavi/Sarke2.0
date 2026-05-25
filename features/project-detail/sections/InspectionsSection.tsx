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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { InspectionTypeAvatar } from '../../../components/InspectionTypeAvatar';
import { RecordTypePill } from '../../../components/RecordTypePill';
import { EmptyState, ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
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
  onAdd,
  onDelete,
}: {
  id: string | undefined;
  allInspections: UnifiedInspection[];
  templates: Template[];
  onAdd: () => void;
  onDelete: (item: UnifiedInspection) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  const preview = useMemo(() => allInspections.slice(0, 3), [allInspections]);
  const overflow = useMemo(() => allInspections.slice(3), [allInspections]);

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.inkSoft} />
          <Text style={styles.sectionTitle}>{t('projects.questionnairesSection')}</Text>
          <Text style={styles.sectionCount}>{allInspections.length}</Text>
        </View>
        <Pressable onPress={onAdd} hitSlop={16}>
          <Text style={styles.sectionAddLink}>+ დამატება</Text>
        </Pressable>
      </View>

      {allInspections.length === 0 ? (
        <EmptyState text={t('projects.noCompletedInspections')} />
      ) : (
        <View style={{ gap: 8, marginTop: 10 }}>
          {preview.map(item => {
            const tpl = templates.find(tt => tt.id === item.template_id);
            const isCompleted = item.status === 'completed';
            const route = routeForInspection(item.source, item.id, isCompleted);
            return (
              <Swipeable
                key={`${item.source}-${item.id}`}
                renderRightActions={() => (
                  <Pressable onPress={() => onDelete(item)} style={styles.swipeDelete} {...a11y('შემოწმების აქტს წაშლა', 'შემოწმების აქტს წაშლა', 'button')}>
                    <Ionicons name="trash" size={18} color={theme.colors.white} />
                  </Pressable>
                )}
                overshootRight={false}
              >
                <Pressable
                  onPress={() => router.push(route as any)}
                  style={styles.listRow}
                  {...a11y(inspectionDisplayName(tpl?.name), isCompleted ? 'დასრულებული შემოწმების აქტს ნახვა' : 'დრაფტის გასაგრძელებლად დააჭირეთ', 'button')}
                >
                  <InspectionTypeAvatar
                    category={item.source === 'generic' ? tpl?.category : item.source}
                    size={36}
                    status={isCompleted ? 'completed' : 'draft'}
                  />
                  <View style={{ flex: 1 }}>
                    <RecordTypePill recordType="inspection" />
                    <Text style={styles.listRowTitle}>{inspectionDisplayName(tpl?.name)}</Text>
                    <Text style={styles.listRowSubtitle}>
                      {formatShortDateTime(item.created_at)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
                </Pressable>
              </Swipeable>
            );
          })}
          {overflow.length > 0 ? (
            <ViewMoreRow
              items={overflow.map(item => {
                const tpl = templates.find(tt => tt.id === item.template_id);
                return { category: item.source === 'generic' ? (tpl?.category ?? null) : item.source };
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
