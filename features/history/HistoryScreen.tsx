import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, FilterChipRow } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
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
  ReportCardGrid,
  OrderRow,
  BriefingRow,
  useReportDelete,
  type RecordTypeKey,
} from '../records';
import { RecordHistoryList } from './RecordHistoryList';
import { InspectionHistoryTab } from './InspectionHistoryTab';

const indexOfKey = (key: RecordTypeKey) => RECORD_TYPES.findIndex((r) => r.key === key);

/**
 * Global History. The five record types live side by side in a horizontal
 * pager that is synced to the chip strip: swiping between lists moves the
 * active tab, tapping a tab pages to its list — scroll + tab, one navigation.
 * Each list is COMPLETED-only (drafts live in the Drafts screen). Deep-linkable
 * via `?type=<key>`; the default landing tab is Inspections.
 */
export default function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const inited = useRef(false);
  const [pagerH, setPagerH] = useState(0);

  const [active, setActive] = useState<RecordTypeKey>(
    isRecordTypeKey(params.type) ? params.type : DEFAULT_RECORD_TYPE,
  );

  // Deep-link / back: when the route param changes externally, page to it.
  useEffect(() => {
    if (!isRecordTypeKey(params.type) || params.type === active) return;
    setActive(params.type);
    pagerRef.current?.scrollTo({ x: indexOfKey(params.type) * width, animated: false });
  }, [params.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const chipItems = useMemo(
    () => RECORD_TYPES.map((rt) => ({ key: rt.key, label: t(rt.labelKey), icon: rt.icon })),
    [t],
  );

  const onChange = (key: string) => {
    const k = key as RecordTypeKey;
    setActive(k);
    router.setParams({ type: k });
    pagerRef.current?.scrollTo({ x: indexOfKey(k) * width, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    const key = RECORD_TYPES[i]?.key;
    if (key && key !== active) {
      setActive(key);
      router.setParams({ type: key });
    }
  };

  const onPagerLayout = (e: LayoutChangeEvent) => {
    setPagerH(e.nativeEvent.layout.height);
    if (!inited.current) {
      inited.current = true;
      const i = indexOfKey(active);
      if (i > 0) pagerRef.current?.scrollTo({ x: i * width, animated: false });
    }
  };

  return (
    <Screen edgeToEdge edges={[]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('history.title')} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
        <FilterChipRow items={chipItems} activeKey={active} onChange={onChange} variant="square" />
      </View>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        onLayout={onPagerLayout}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {RECORD_TYPES.map((rt) => (
          <View key={rt.key} style={{ width, height: pagerH }}>
            {rt.key === 'inspections' ? (
              <InspectionHistoryTab />
            ) : rt.key === 'reports' ? (
              <ReportsTab />
            ) : rt.key === 'orders' ? (
              <OrdersTab />
            ) : rt.key === 'incidents' ? (
              <IncidentsTab />
            ) : (
              <BriefingsTab />
            )}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

function ReportsTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const confirmDelete = useReportDelete();
  const q = useRecentReports({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const items = q.data ?? [];
  return (
    <ReportCardGrid
      query={q}
      reports={items}
      refreshQueries={[q]}
      emptyText={t('records.emptyReports')}
      onPressReport={(r) => router.push(`/reports/${r.id}` as never)}
      onDeleteReport={(r) => confirmDelete(r)}
    />
  );
}

function OrdersTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useRecentOrders({ status: 'completed', limit: RECENT_COMPLETED_LIMIT });
  const items = q.data ?? [];
  return (
    <RecordHistoryList
      query={q}
      items={items}
      keyOf={(o) => o.id}
      refreshQueries={[q]}
      emptyText={t('records.emptyOrders')}
      renderRow={(o, isLast) => <OrderRow order={o} showBorder={!isLast} onPress={() => router.push(`/orders/${o.id}` as never)} />}
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
