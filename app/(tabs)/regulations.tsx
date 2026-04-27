import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Path, Rect, G } from 'react-native-svg';
import { Card } from '../../components/ui';
import { Badge } from '../../components/primitives/Badge';
import { theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import {
  REGULATIONS,
  RegulationState,
  loadRegulationStates,
  markRegulationSeen,
  maybeRefreshRegulations,
} from '../../lib/regulations';

function HeaderIllustration() {
  return (
    <Svg width={200} height={120} viewBox="0 0 200 120">
      <Circle cx={100} cy={60} r={50} fill={theme.colors.regsSoft} opacity={0.5} />
      <Line x1={100} y1={30} x2={100} y2={80} stroke={theme.colors.regsTint} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={70} y1={40} x2={130} y2={40} stroke={theme.colors.regsTint} strokeWidth={2} strokeLinecap="round" />
      <Path d="M70 40 L60 55 L80 55 Z" fill={theme.colors.regsSoft} stroke={theme.colors.regsTint} strokeWidth={1.5} />
      <Line x1={60} y1={55} x2={80} y2={55} stroke={theme.colors.regsTint} strokeWidth={1.5} />
      <Path d="M130 40 L120 55 L140 55 Z" fill={theme.colors.regsSoft} stroke={theme.colors.regsTint} strokeWidth={1.5} />
      <Line x1={120} y1={55} x2={140} y2={55} stroke={theme.colors.regsTint} strokeWidth={1.5} />
      <Rect x={88} y={80} width={24} height={6} rx={3} fill={theme.colors.regsTint} />
      <Rect x={80} y={86} width={40} height={5} rx={2.5} fill={theme.colors.regsTint} opacity={0.6} />
      <G opacity={0.8}>
        <Rect x={64} y={46} width={10} height={12} rx={1} fill="#fff" stroke={theme.colors.regsTint} strokeWidth={0.8} />
        <Path d="M66 52l2 2 4-4" stroke={theme.colors.regsTint} strokeWidth={1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      <G opacity={0.8}>
        <Path d="M125 48c-3 0-5 2-5 4h10c0-2-2-4-5-4z" fill={theme.colors.warnSoft} stroke={theme.colors.warn} strokeWidth={0.8} />
        <Rect x={124} y={51} width={4} height={1.5} rx={0.75} fill={theme.colors.warn} />
      </G>
      <Path d="M40 35l1 2 2 0-1.5 1.5 0.5 2-2-1-2 1 0.5-2-1.5-1.5 2 0z" fill={theme.colors.regsTint} opacity={0.3} />
      <Path d="M160 45l1 2 2 0-1.5 1.5 0.5 2-2-1-2 1 0.5-2-1.5-1.5 2 0z" fill={theme.colors.regsTint} opacity={0.3} />
    </Svg>
  );
}

function formatLastFetch(iso: string | null): string {
  if (!iso) return 'არასდროს';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'არასდროს';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `დღეს, ${hh}:${mm}`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo}/${d.getFullYear()}, ${hh}:${mm}`;
}

export default function RegulationsScreen() {
  const insets = useSafeAreaInsets();
  const [states, setStates] = useState<RegulationState[]>([]);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refreshing = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (refreshing.current) return;
    refreshing.current = true;
    setLoading(true);
    try {
      const initial = await loadRegulationStates();
      setStates(initial);
      const result = await maybeRefreshRegulations(force);
      setStates(result.states);
      setLastFetch(result.lastFetch);
    } finally {
      setLoading(false);
      refreshing.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh(false);
    }, [refresh])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') refresh(false);
    });
    return () => sub.remove();
  }, [refresh]);

  const stateById = (id: string) => states.find((s) => s.id === id);

  const handleOpen = async (id: string, url: string) => {
    setStates((prev) => prev.map((s) => (s.id === id ? { ...s, isUpdated: false } : s)));
    await markRegulationSeen(id);
    Linking.openURL(url);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      contentInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: 40,
      }}
    >
      <View style={styles.header}>
        <HeaderIllustration />
        <Text style={styles.headerTitle}>რეგულაციები</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.headerSubtitle}>ბოლო განახლება: {formatLastFetch(lastFetch)}</Text>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.regsTint} style={{ marginLeft: 8 }} />
          ) : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {REGULATIONS.map((item, index) => {
          const st = stateById(item.id);
          return (
            <Card
              key={item.id}
              padding="none"
              style={{ overflow: 'hidden' }}
              onPress={() => handleOpen(item.id, item.url)}
            >
              <View style={styles.cardAccent} />
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={[styles.cardTitle, { flex: 1 }]}>{item.title}</Text>
                      {st?.isUpdated ? <Badge variant="success">განახლდა</Badge> : null}
                    </View>
                    <Text style={styles.cardDescription}>{item.description}</Text>
                    {st?.lastUpdated ? (
                      <Text style={styles.cardMeta}>განახლდა: {st.lastUpdated}</Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.inkSoft}
                    style={{ marginTop: 4 }}
                    {...a11y(`${item.title} — გახსნა`, 'matsne.gov.ge', 'link')}
                  />
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.ink,
    marginTop: 4,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    lineHeight: 18,
  },
  cardAccent: {
    height: 3,
    backgroundColor: theme.colors.regsTint,
    opacity: 0.8,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.regsSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numberText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.regsTint,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 15,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  cardDescription: {
    color: theme.colors.inkSoft,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  cardMeta: {
    color: theme.colors.inkSoft,
    marginTop: 8,
    fontSize: 12,
  },
});
