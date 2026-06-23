import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, FilterChipRow } from '../../components/ui';
import { IncidentRow } from '../../components/projects/ProjectRowHelpers';
import {
  useRecentReports,
  useRecentOrders,
  useRecentIncidents,
  useRecentBriefings,
} from '../../lib/apiHooks';
import {
  RECORD_TYPES,
  RECENT_COMPLETED_LIMIT,
  DEFAULT_RECORD_TYPE,
  isRecordTypeKey,
  ReportRow,
  OrderRow,
  BriefingRow,
  type RecordTypeKey,
} from '../records';
import { RecordHistoryList } from './RecordHistoryList';
import { InspectionHistoryTab } from './InspectionHistoryTab';

/**
 * Global History. Exactly one record type is shown at a time, chosen by the
 * chip strip (default Inspections) — there is no "all" view. Each type renders
 * only its COMPLETED records (drafts live in the Drafts screen). Deep-linkable
 * via `?type=<key>` (Home widgets' "view all" links land here).
 */
export default function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();

  const [active, setActive] = useState<RecordTypeKey>(
    isRecordTypeKey(params.type) ? params.type : DEFAULT_RECORD_TYPE,
  );

  // Keep state in sync when the route param changes (deep link / back).
  useEffect(() => {
    if (isRecordTypeKey(params.type) && params.type !== active) setActive(params.type);
  }, [params.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const chipItems = useMemo(
    () => RECORD_TYPES.map((rt) => ({ key: rt.key, label: t(rt.labelKey), icon: rt.icon })),
    [t],
  );

  const onChange = (key: string) => {
    setActive(key as RecordTypeKey);
    router.setParams({ type: key });
  };

  return (
    <Screen edgeToEdge edges={[]}>
      <Stack.Screen options={{ headerShown: true, title: t('history.title') }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
        <FilterChipRow items={chipItems} activeKey={active} onChange={onChange} />
      </View>
      <View style={{ flex: 1 }}>
        {active === 'inspections' ? (
          <InspectionHistoryTab />
        ) : active === 'reports' ? (
          <ReportsTab />
        ) : active === 'orders' ? (
          <OrdersTab />
        ) : active === 'incidents' ? (
          <IncidentsTab />
        ) : (
          <BriefingsTab />
        )}
      </View>
    </Screen>
  );
}

function ReportsTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useRecentReports({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const items = q.data ?? [];
  return (
    <RecordHistoryList
      query={q}
      items={items}
      keyOf={(r) => r.id}
      refreshQueries={[q]}
      emptyText={t('records.emptyReports')}
      renderRow={(r, isLast) => (
        <ReportRow report={r} showBorder={!isLast} onPress={() => router.push(`/reports/${r.id}` as never)} />
      )}
    />
  );
}

function OrdersTab() {
  const { t } = useTranslation();
  const q = useRecentOrders({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const items = q.data ?? [];
  return (
    <RecordHistoryList
      query={q}
      items={items}
      keyOf={(o) => o.id}
      refreshQueries={[q]}
      emptyText={t('records.emptyOrders')}
      renderRow={(o, isLast) => <OrderRow order={o} showBorder={!isLast} />}
    />
  );
}

function IncidentsTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useRecentIncidents({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const items = q.data ?? [];
  return (
    <RecordHistoryList
      query={q}
      items={items}
      keyOf={(i) => i.id}
      refreshQueries={[q]}
      emptyText={t('records.emptyIncidents')}
      renderRow={(inc, isLast) => (
        <IncidentRow incident={inc} showBorder={!isLast} onPress={() => router.push(`/incidents/${inc.id}` as never)} />
      )}
    />
  );
}

function BriefingsTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useRecentBriefings({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const items = q.data ?? [];
  return (
    <RecordHistoryList
      query={q}
      items={items}
      keyOf={(b) => b.id}
      refreshQueries={[q]}
      emptyText={t('records.emptyBriefings')}
      renderRow={(b, isLast) => (
        <BriefingRow briefing={b} showBorder={!isLast} onPress={() => router.push(`/briefings/${b.id}` as never)} />
      )}
    />
  );
}
