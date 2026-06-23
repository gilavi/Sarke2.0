import { useMemo, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { RefreshControl } from '../../components/primitives';
import { Screen } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { InspectionRow } from '../../components/InspectionRow';
import { IncidentRow } from '../../components/projects/ProjectRowHelpers';
import { getRecordStyles, ReportRow, OrderRow, BriefingRow } from '../records';
import { useTemplates } from '../../lib/apiHooks';
import { useTheme } from '../../lib/theme';
import { formatShortDateTime } from '../../lib/formatDate';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { routeForInspection } from '../../lib/inspectionRouting';
import { useDraftsData } from './useDraftsData';

/**
 * Drafts screen — every in-progress record (all types) across projects,
 * grouped by type, reached from the More tab. The ONLY place (besides Home's
 * single resume card) that drafts live; completed records never appear here.
 * Tapping a draft resumes/edits it.
 */
export default function DraftsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => getRecordStyles(theme), [theme]);
  const templates = useTemplates().data ?? [];
  const d = useDraftsData();

  return (
    <Screen edgeToEdge edges={[]}>
      <Stack.Screen options={{ headerShown: true, title: t('drafts.title') }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, flexGrow: 1 }}
        refreshControl={<RefreshControl queries={d.queries as never[]} />}
      >
        {d.loading ? (
          <View style={styles.sectionCard}>
            <View style={{ gap: 14, paddingVertical: 6 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Skeleton width={40} height={40} radius={10} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width={'65%'} height={14} />
                    <Skeleton width={'40%'} height={11} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : d.total === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <Text style={{ color: theme.colors.inkFaint, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
              {t('drafts.empty')}
            </Text>
          </View>
        ) : (
          <>
            {d.inspections.length > 0 ? (
              <DraftGroup title={t('records.inspections')} count={d.inspections.length} styles={styles}>
                {d.inspections.map((q, i, arr) => {
                  const tpl = templates.find((x) => x.id === q.template_id);
                  return (
                    <InspectionRow
                      key={q.id}
                      category={tpl?.category}
                      title={inspectionDisplayName(tpl?.name)}
                      subtitle={formatShortDateTime(q.created_at)}
                      showBorder={i < arr.length - 1}
                      inset={0}
                      onPress={() => router.push(routeForInspection(tpl?.category, q.id, false) as never)}
                    />
                  );
                })}
              </DraftGroup>
            ) : null}

            {d.reports.length > 0 ? (
              <DraftGroup title={t('records.reports')} count={d.reports.length} styles={styles}>
                {d.reports.map((r, i, arr) => (
                  <ReportRow key={r.id} report={r} showBorder={i < arr.length - 1} onPress={() => router.push(`/reports/${r.id}/edit` as never)} />
                ))}
              </DraftGroup>
            ) : null}

            {d.incidents.length > 0 ? (
              <DraftGroup title={t('records.incidents')} count={d.incidents.length} styles={styles}>
                {d.incidents.map((inc, i, arr) => (
                  <IncidentRow key={inc.id} incident={inc} showBorder={i < arr.length - 1} onPress={() => router.push(`/incidents/${inc.id}` as never)} />
                ))}
              </DraftGroup>
            ) : null}

            {d.briefings.length > 0 ? (
              <DraftGroup title={t('records.briefings')} count={d.briefings.length} styles={styles}>
                {d.briefings.map((b, i, arr) => (
                  <BriefingRow key={b.id} briefing={b} showBorder={i < arr.length - 1} onPress={() => router.push(`/briefings/${b.id}` as never)} />
                ))}
              </DraftGroup>
            ) : null}

            {d.orders.length > 0 ? (
              <DraftGroup title={t('records.orders')} count={d.orders.length} styles={styles}>
                {d.orders.map((o, i, arr) => (
                  <OrderRow key={o.id} order={o} showBorder={i < arr.length - 1} />
                ))}
              </DraftGroup>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function DraftGroup({
  title,
  count,
  styles,
  children,
}: {
  title: string;
  count: number;
  styles: ReturnType<typeof getRecordStyles>;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{count}</Text>
        </View>
      </View>
      <View style={{ marginTop: 4 }}>{children}</View>
    </View>
  );
}
