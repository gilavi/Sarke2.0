import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { RefreshControl } from '../../components/primitives';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { RefreshCw, ChevronRight } from 'lucide-react-native';
import { Card } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { useTranslation } from 'react-i18next';
import {
  REGULATIONS,
  loadRegulationStates,
  markRegulationSeen,
  maybeRefreshRegulations,
} from '../../lib/regulations';

export default function RegulationsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refreshing = useRef(false);

  function formatLastFetch(iso: string | null): string {
    if (!iso) return t('regulations.neverUpdated');
    const d = new Date(iso);
    if (isNaN(d.getTime())) return t('regulations.neverUpdated');
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (sameDay) return t('regulations.updatedToday', { time: `${hh}:${mm}` });
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return t('regulations.lastUpdate', { date: `${dd}/${mo}/${d.getFullYear()}, ${hh}:${mm}` });
  }

  const refresh = useCallback(async (force = false) => {
    if (refreshing.current) return;
    refreshing.current = true;
    setLoading(true);
    try {
      await loadRegulationStates();
      const result = await maybeRefreshRegulations(force);
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

  const handleOpen = async (id: string, url: string) => {
    await markRegulationSeen(id);
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40, gap: 16 }}
        refreshControl={<RefreshControl onRefresh={() => refresh(true)} />}
      >
        <Text style={{
          fontSize: 28,
          fontWeight: '800',
          fontFamily: theme.typography.fontFamily.display,
          color: theme.colors.ink,
          paddingHorizontal: 20,
        }}>
          {t('regulations.title')}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: -8 }}>
          <Text style={{ fontSize: 13, color: theme.colors.inkSoft, flex: 1 }}>
            {formatLastFetch(lastFetch)}
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginLeft: 6 }} />
          ) : (
            <Pressable
              onPress={() => refresh(true)}
              hitSlop={12}
              {...a11y(t('regulations.refresh'), t('regulations.refreshHint'), 'button')}
            >
              <RefreshCw size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
            </Pressable>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {REGULATIONS.map((item) => (
            <Card
              key={item.id}
              onPress={() => handleOpen(item.id, item.url)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: theme.colors.ink,
                    lineHeight: 20,
                    marginBottom: 3,
                  }}>
                    {item.title}
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: theme.colors.inkSoft,
                    lineHeight: 18,
                  }}>
                    {item.description}
                  </Text>
                </View>
                <ChevronRight
                  size={18}
                  color={theme.colors.inkFaint}
                  strokeWidth={1.5}
                  {...a11y(t('regulations.openLinkA11y', { title: item.title }), t('regulations.sourceLabel'), 'link')}
                />
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
