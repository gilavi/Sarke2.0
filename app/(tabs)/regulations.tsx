import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui';
import { Badge } from '../../components/primitives/Badge';
import { useTheme } from '../../lib/theme';

import { a11y } from '../../lib/accessibility';
import {
  REGULATIONS,
  RegulationState,
  loadRegulationStates,
  markRegulationSeen,
  maybeRefreshRegulations,
} from '../../lib/regulations';

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
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
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

  const stateById = (id: string) => states.find((s) => s.id === id);

  const handleOpen = async (id: string, url: string) => {
    setStates((prev) => prev.map((s) => (s.id === id ? { ...s, isUpdated: false } : s)));
    await markRegulationSeen(id);
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>რეგულაციები</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>ბოლო განახლება: {formatLastFetch(lastFetch)}</Text>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.regsTint} style={{ marginLeft: 6 }} />
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 12 }}
      >
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
      </ScrollView>
    </SafeAreaView>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      fontFamily: theme.typography?.fontFamily?.display ?? undefined,
      color: theme.colors.ink,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.inkSoft,
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
}
