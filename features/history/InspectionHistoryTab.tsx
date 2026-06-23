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
  useRecentInspections,
  useTemplates,
  useProjects,
  useCertificateCounts,
  invalidateRecordLists,
} from '../../lib/apiHooks';
import { inspectionsApi } from '../../lib/services';
import { RECENT_COMPLETED_LIMIT } from '../records';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { friendlyError } from '../../lib/errorMap';
import { useToast } from '../../lib/toast';
import { formatShortDateTime } from '../../lib/formatDate';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { routeForInspection } from '../../lib/inspectionRouting';
import type { Inspection } from '../../types/models';
import { RecordHistoryList } from './RecordHistoryList';

/**
 * Inspections tab of the History screen. Completed-only (no draft/completed
 * status dot — `InspectionRow` omits the badge when `status` is undefined),
 * keeps the per-row certificate-count badge and swipe-to-delete that the old
 * single-type History had.
 */
export function InspectionHistoryTab() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const inspQ = useRecentInspections({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const templatesQ = useTemplates();
  const { data: projects = [] } = useProjects();

  const items = inspQ.data ?? [];
  const templates = templatesQ.data ?? [];
  const completedIds = useMemo(() => items.map((i) => i.id), [items]);
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
      keyOf={(q) => q.id}
      refreshQueries={[inspQ, templatesQ]}
      emptyText={t('records.emptyInspections')}
      renderRow={(q, isLast) => {
        const tpl = templates.find((x) => x.id === q.template_id);
        const p = projects.find((pr) => pr.id === q.project_id);
        const proj = p ? p.company_name || p.name : '';
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
