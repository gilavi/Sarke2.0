import { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, FileText, Award, TriangleAlert, Megaphone } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { InspectionRow } from '../../components/InspectionRow';
import { InspectionListAvatar } from '../../components/InspectionListAvatar';
import { RecordAvatar } from '../../components/RecordAvatar';
import { IncidentRow } from '../../components/projects/ProjectRowHelpers';
import { useTheme } from '../../lib/theme';
import { incidentColors } from '../../lib/statusColors';
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
  OrderRow,
  BriefingRow,
  ReportCardRail,
  BriefingTopicAvatar,
  getRecordStyles,
  RECENT_COMPLETED_LIMIT,
  historyHref,
  useReportDelete,
} from '../records';
import { formatShortDateTime } from '../../lib/formatDate';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { routeForInspection } from '../../lib/inspectionRouting';

// Avatar size used in the "view all" stack — matches the list rows' shape.
const STACK = 40;

/**
 * Home's per-type record widgets, matching the project-detail screen. Each
 * `RecordWidget` shows the 4 most-recent COMPLETED records; the overflow is a
 * bottom "ყველას ნახვა" row whose stacked avatars mirror the list's own
 * avatars and deep-links to the type-filtered History. The Inspections widget
 * always renders; the others appear only when they have records.
 */
export function HomeRecordsSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const recordStyles = useMemo(() => getRecordStyles(theme), [theme]);
  const templates = useTemplates().data ?? [];
  const incidentPalette = incidentColors(isDark);
  const confirmDeleteReport = useReportDelete();

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
  const catOf = (q: (typeof insp)[number]) =>
    templates.find((x) => x.id === q.template_id)?.category ?? null;

  return (
    <View style={{ gap: 16, paddingHorizontal: 20, paddingTop: 28 }}>
      <RecordWidget
        icon={ShieldCheck}
        title={t('records.inspections')}
        items={insp}
        loading={inspLoading}
        emptyText={t('records.emptyInspections')}
        viewAllHref={historyHref('inspections')}
        keyOf={(q) => q.id}
        renderAvatar={(q) => <InspectionListAvatar category={catOf(q)} size={STACK} />}
        renderRow={(q, isLast) => {
          const tpl = templates.find((x) => x.id === q.template_id);
          return (
            <InspectionRow
              category={tpl?.category}
              title={inspectionDisplayName(tpl?.name)}
              subtitle={formatShortDateTime(q.created_at)}
              showBorder={!isLast}
              inset={0}
              onPress={() => router.push(routeForInspection(tpl?.category, q.id, true) as never)}
            />
          );
        }}
      />

      {reports.length > 0 ? (
        // Full-bleed carousel: the rail escapes the 20px screen gutter so cards
        // scroll edge to edge, then rests its first card back at the gutter so
        // it lines up flush with the other widgets' titles and rows.
        <View>
          <View style={recordStyles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FileText size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
              <Text style={recordStyles.sectionTitle}>{t('records.reports')}</Text>
            </View>
          </View>
          <ReportCardRail
            reports={reports}
            onPressReport={(r) => router.push(`/reports/${r.id}` as never)}
            onDeleteReport={(r) => confirmDeleteReport(r)}
            emptyText={t('records.emptyReports')}
            onViewAll={() => router.push(historyHref('reports') as never)}
            bleed={20}
            gutter={20}
          />
        </View>
      ) : null}

      {orders.length > 0 ? (
        <RecordWidget
          icon={Award}
          title={t('records.orders')}
          items={orders}
          emptyText={t('records.emptyOrders')}
          viewAllHref={historyHref('orders')}
          keyOf={(o) => o.id}
          renderAvatar={() => <RecordAvatar icon={FileText} tint={theme.colors.certTint} bg={theme.colors.certSoft} size={STACK} />}
          renderRow={(o, isLast) => <OrderRow order={o} showBorder={!isLast} onPress={() => router.push(`/orders/${o.id}` as never)} />}
        />
      ) : null}

      {incidents.length > 0 ? (
        <RecordWidget
          icon={TriangleAlert}
          title={t('records.incidents')}
          items={incidents}
          emptyText={t('records.emptyIncidents')}
          viewAllHref={historyHref('incidents')}
          keyOf={(i) => i.id}
          renderAvatar={(inc) => {
            const b = incidentPalette[inc.type] ?? incidentPalette.minor;
            return <RecordAvatar icon={TriangleAlert} tint={b.text} bg={b.bg} size={STACK} />;
          }}
          renderRow={(inc, isLast) => (
            <IncidentRow incident={inc} showBorder={!isLast} onPress={() => router.push(`/incidents/${inc.id}` as never)} />
          )}
        />
      ) : null}

      {briefings.length > 0 ? (
        <RecordWidget
          icon={Megaphone}
          title={t('records.briefings')}
          items={briefings}
          emptyText={t('records.emptyBriefings')}
          viewAllHref={historyHref('briefings')}
          keyOf={(b) => b.id}
          renderAvatar={(b) => <BriefingTopicAvatar topics={b.topics} size={STACK} />}
          renderRow={(b, isLast) => (
            <BriefingRow briefing={b} showBorder={!isLast} onPress={() => router.push(`/briefings/${b.id}` as never)} />
          )}
        />
      ) : null}
    </View>
  );
}
