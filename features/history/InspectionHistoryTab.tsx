import { useCallback, useMemo } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { FileText, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { InspectionRow } from '../../components/InspectionRow';
import {
  useTemplates,
  useProjects,
  useCertificateCounts,
  invalidateRecordLists,
} from '../../lib/apiHooks';
import { inspectionsApi } from '../../lib/services';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { friendlyError } from '../../lib/errorMap';
import { useToast } from '../../lib/toast';
import { formatShortDateTime } from '../../lib/formatDate';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { routeForInspection } from '../../lib/inspectionRouting';
import type { Inspection, Template } from '../../types/models';
import { RecordHistoryList } from './RecordHistoryList';
import type { HistoryTabFilters } from './HistoryTabs';
import { matchesQuery, projectNameMap } from './historyListUtils';
import { feedPaging, useHistoryInspections } from './useHistoryFeed';

/**
 * Inspections tab of the History screen. Completed-only (no draft/completed
 * status dot — `InspectionRow` omits the badge when `status` is undefined),
 * keeps the per-row certificate-count badge and swipe-to-delete that the old
 * single-type History had. Paged feed (useHistoryInspections) + the screen's
 * search / project filter applied client-side over the loaded rows.
 */
export function InspectionHistoryTab({ search, projectId }: HistoryTabFilters) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const inspQ = useHistoryInspections();
  const templatesQ = useTemplates();
  const { data: projects = [] } = useProjects();

  const all = inspQ.data ?? [];
  const templates = templatesQ.data ?? [];
  const templateById = useMemo(() => {
    const map = new Map<string, Template>();
    for (const tpl of templates) map.set(tpl.id, tpl);
    return map;
  }, [templates]);
  const projectNames = useMemo(() => projectNameMap(projects), [projects]);

  const items = useMemo(
    () =>
      all.filter(
        (q) =>
          (!projectId || q.project_id === projectId) &&
          matchesQuery(search, [
            inspectionDisplayName(templateById.get(q.template_id)?.name),
            projectNames.get(q.project_id),
          ]),
      ),
    [all, search, projectId, templateById, projectNames],
  );

  // Badge counts for every LOADED row (not the filtered slice — a keystroke
  // must not mint a new query key and refetch the counts).
  const completedIds = useMemo(() => all.map((i) => i.id), [all]);
  const { data: certCounts = {} } = useCertificateCounts(completedIds);

  const onDelete = useCallback(
    (q: Inspection) => {
      Alert.alert(t('history.deleteTitle'), t('history.deleteBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await inspectionsApi.remove(q.id);
              invalidateRecordLists(qc);
              toast.success(t('history.deleted'));
            } catch (e) {
              toast.error(friendlyError(e, t('history.deleteError')));
            }
          },
        },
      ]);
    },
    [t, qc, toast],
  );

  return (
    <RecordHistoryList
      query={inspQ}
      items={items}
      totalCount={all.length}
      keyOf={(q) => q.id}
      refreshQueries={[inspQ, templatesQ]}
      paging={feedPaging(inspQ)}
      emptyText={t('records.emptyInspections')}
      renderRow={(q, isLast) => {
        const tpl = templateById.get(q.template_id);
        const proj = projectNames.get(q.project_id) ?? '';
        const n = certCounts[q.id] ?? 0;
        return (
          <Swipeable
            renderRightActions={() => (
              <Pressable
                onPress={() => onDelete(q)}
                style={{
                  width: 72,
                  backgroundColor: theme.colors.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                  borderRadius: 12,
                }}
                {...a11y(t('common.delete'), undefined, 'button')}
              >
                <Trash2 size={18} color={theme.colors.white} strokeWidth={1.5} />
              </Pressable>
            )}
            overshootRight={false}
          >
            <InspectionRow
              category={tpl?.category}
              title={inspectionDisplayName(tpl?.name)}
              subtitle={`${proj ? `${proj} · ` : ''}${formatShortDateTime(q.created_at)}`}
              showBorder={!isLast}
              onPress={() => router.push(routeForInspection(tpl?.category, q.id, true) as never)}
              trailing={
                n > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      backgroundColor: theme.colors.accentSoft,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      borderRadius: 16,
                    }}
                  >
                    <FileText size={11} color={theme.colors.accent} strokeWidth={1.5} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.accent }}>{n}</Text>
                  </View>
                ) : undefined
              }
            />
          </Swipeable>
        );
      }}
    />
  );
}
