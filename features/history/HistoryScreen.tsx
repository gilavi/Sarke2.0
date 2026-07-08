import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useProjects } from '../../lib/apiHooks';
import {
  RECORD_TYPES,
  DEFAULT_RECORD_TYPE,
  isRecordTypeKey,
  type RecordTypeKey,
} from '../records';
import { HistorySearchBar } from './HistorySearchBar';
import { InspectionHistoryTab } from './InspectionHistoryTab';
import { BriefingsTab, IncidentsTab, OrdersTab, ReportsTab } from './HistoryTabs';

const indexOfKey = (key: RecordTypeKey) => RECORD_TYPES.findIndex((r) => r.key === key);

/**
 * Global History. The five record types live side by side in a horizontal
 * pager that is synced to the chip strip: swiping between lists moves the
 * active tab, tapping a tab pages to its list — scroll + tab, one navigation.
 * Each list is COMPLETED-only (drafts live in the Drafts screen). Deep-linkable
 * via `?type=<key>`; the default landing tab is Inspections.
 *
 * Tab bodies mount LAZILY: only the active tab (plus its neighbours once a
 * swipe starts, so the incoming page isn't blank mid-gesture) — visited tabs
 * stay mounted so paging back is instant. Opening History therefore subscribes
 * 1 query, not 5; each type's feed first fires when its tab is first shown.
 *
 * The search field + project chip row filter ALL tabs client-side over their
 * loaded rows (HistoryTabs); each tab pages past the 50-row first page via
 * useHistoryFeed, so older documents are reachable by scrolling or "load more".
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
  const [mounted, setMounted] = useState<ReadonlySet<RecordTypeKey>>(
    () => new Set([isRecordTypeKey(params.type) ? params.type : DEFAULT_RECORD_TYPE]),
  );
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const { data: projects = [] } = useProjects();

  const mountKeys = useCallback((keys: RecordTypeKey[]) => {
    setMounted((prev) => {
      if (keys.every((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      for (const k of keys) next.add(k);
      return next;
    });
  }, []);

  const activate = useCallback(
    (key: RecordTypeKey) => {
      setActive(key);
      mountKeys([key]);
    },
    [mountKeys],
  );

  // Deep-link / back: when the route param changes externally, page to it.
  useEffect(() => {
    if (!isRecordTypeKey(params.type) || params.type === active) return;
    activate(params.type);
    pagerRef.current?.scrollTo({ x: indexOfKey(params.type) * width, animated: false });
  }, [params.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const chipItems = useMemo(
    () => RECORD_TYPES.map((rt) => ({ key: rt.key, label: t(rt.labelKey), icon: rt.icon })),
    [t],
  );
  const projectChips = useMemo(
    () => [
      { key: 'all', label: t('history.allProjects') },
      ...projects.map((p) => ({ key: p.id, label: p.company_name || p.name })),
    ],
    [projects, t],
  );

  const onChange = (key: string) => {
    const k = key as RecordTypeKey;
    activate(k);
    router.setParams({ type: k });
    pagerRef.current?.scrollTo({ x: indexOfKey(k) * width, animated: true });
  };

  // A swipe is starting — mount the neighbours so the incoming page has
  // content (skeleton or cached rows) during the gesture, not after it.
  const onScrollBeginDrag = () => {
    const i = indexOfKey(active);
    const neighbours = [RECORD_TYPES[i - 1]?.key, RECORD_TYPES[i + 1]?.key].filter(
      (k): k is RecordTypeKey => !!k,
    );
    if (neighbours.length) mountKeys(neighbours);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    const key = RECORD_TYPES[i]?.key;
    if (key && key !== active) {
      activate(key);
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

  const filters = { search, projectId: projectFilter === 'all' ? null : projectFilter };

  return (
    <Screen edgeToEdge edges={[]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('history.title')} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 10 }}>
        <HistorySearchBar value={search} onChange={setSearch} />
        <FilterChipRow items={chipItems} activeKey={active} onChange={onChange} variant="square" />
        {projects.length > 1 ? (
          <FilterChipRow items={projectChips} activeKey={projectFilter} onChange={setProjectFilter} />
        ) : null}
      </View>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumEnd}
        onLayout={onPagerLayout}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {RECORD_TYPES.map((rt) => (
          <View key={rt.key} style={{ width, height: pagerH }}>
            {!mounted.has(rt.key) ? null : rt.key === 'inspections' ? (
              <InspectionHistoryTab {...filters} />
            ) : rt.key === 'reports' ? (
              <ReportsTab {...filters} />
            ) : rt.key === 'orders' ? (
              <OrdersTab {...filters} />
            ) : rt.key === 'incidents' ? (
              <IncidentsTab {...filters} />
            ) : (
              <BriefingsTab {...filters} />
            )}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
