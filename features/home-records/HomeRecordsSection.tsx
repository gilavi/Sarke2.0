import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, FileText, Award, TriangleAlert, Megaphone } from 'lucide-react-native';
import { InspectionRow } from '../../components/InspectionRow';
import { IncidentRow } from '../../components/projects/ProjectRowHelpers';
import {
  useRecentInspections,
  useRecentReports,
  useRecentOrders,
  useRecentIncidents,
  useRecentBriefings,
  useTemplates,
} from '../../lib/apiHooks';
import {
  RecordWidget,
  ReportRow,
  OrderRow,
  BriefingRow,
  RECENT_COMPLETED_LIMIT,
  historyHref,
} from '../records';
import { formatShortDateTime } from '../../lib/formatDate';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { routeForInspection } from '../../lib/inspectionRouting';

const PREVIEW = 4;

/**
 * Home's per-type record widgets, matching the project-detail screen. One
 * `RecordWidget` per type showing the 4 most-recent COMPLETED records, with a
 * "view all" link to the History screen filtered to that type. The Inspections
 * widget is always rendered (it's the primary surface, with its own empty
 * state); the others appear only when they have records, to keep Home scannable.
 */
export function HomeRecordsSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const templates = useTemplates().data ?? [];

  const inspQ = useRecentInspections({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const reportsQ = useRecentReports({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const ordersQ = useRecentOrders({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const incidentsQ = useRecentIncidents({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const briefingsQ = useRecentBriefings({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });

  const insp = inspQ.data ?? [];
  const reports = reportsQ.data ?? [];
  const orders = ordersQ.data ?? [];
  const incidents = incidentsQ.data ?? [];
  const briefings = briefingsQ.data ?? [];

  const inspLoading = (inspQ.isFetching || !inspQ.isFetched) && insp.length === 0;

  return (
    <View style={{ gap: 12, paddingHorizontal: 20, paddingTop: 28 }}>
      <RecordWidget
        icon={ShieldCheck}
        title={t('records.inspections')}
        count={insp.length}
        viewAllHref={historyHref('inspections')}
        emptyText={t('records.emptyInspections')}
        loading={inspLoading}
      >
        {insp.slice(0, PREVIEW).map((q, i, arr) => {
          const tpl = templates.find((x) => x.id === q.template_id);
          return (
            <InspectionRow
              key={q.id}
              category={tpl?.category}
              title={inspectionDisplayName(tpl?.name)}
              subtitle={formatShortDateTime(q.created_at)}
              showBorder={i < arr.length - 1}
              inset={0}
              onPress={() => router.push(routeForInspection(tpl?.category, q.id, true) as never)}
            />
          );
        })}
      </RecordWidget>

      {reports.length > 0 ? (
        <RecordWidget
          icon={FileText}
          title={t('records.reports')}
          count={reports.length}
          viewAllHref={historyHref('reports')}
          emptyText={t('records.emptyReports')}
        >
          {reports.slice(0, PREVIEW).map((r, i, arr) => (
            <ReportRow key={r.id} report={r} showBorder={i < arr.length - 1} onPress={() => router.push(`/reports/${r.id}` as never)} />
          ))}
        </RecordWidget>
      ) : null}

      {orders.length > 0 ? (
        <RecordWidget
          icon={Award}
          title={t('records.orders')}
          count={orders.length}
          viewAllHref={historyHref('orders')}
          emptyText={t('records.emptyOrders')}
        >
          {orders.slice(0, PREVIEW).map((o, i, arr) => (
            <OrderRow key={o.id} order={o} showBorder={i < arr.length - 1} />
          ))}
        </RecordWidget>
      ) : null}

      {incidents.length > 0 ? (
        <RecordWidget
          icon={TriangleAlert}
          title={t('records.incidents')}
          count={incidents.length}
          viewAllHref={historyHref('incidents')}
          emptyText={t('records.emptyIncidents')}
        >
          {incidents.slice(0, PREVIEW).map((inc, i, arr) => (
            <IncidentRow key={inc.id} incident={inc} showBorder={i < arr.length - 1} onPress={() => router.push(`/incidents/${inc.id}` as never)} />
          ))}
        </RecordWidget>
      ) : null}

      {briefings.length > 0 ? (
        <RecordWidget
          icon={Megaphone}
          title={t('records.briefings')}
          count={briefings.length}
          viewAllHref={historyHref('briefings')}
          emptyText={t('records.emptyBriefings')}
        >
          {briefings.slice(0, PREVIEW).map((b, i, arr) => (
            <BriefingRow key={b.id} briefing={b} showBorder={i < arr.length - 1} onPress={() => router.push(`/briefings/${b.id}` as never)} />
          ))}
        </RecordWidget>
      ) : null}
    </View>
  );
}
