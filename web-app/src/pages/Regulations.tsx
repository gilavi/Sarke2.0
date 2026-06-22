import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { ExternalLink, RefreshCw } from 'lucide-react-native';
import { Card, Badge, Button } from '@root/components/primitives';
import { useTheme } from '@root/lib/theme';
import {
  REGULATIONS,
  type RegulationState,
  loadRegulationStates,
  maybeRefreshRegulations,
  markRegulationSeen,
  getLastFetchAt,
} from '@/lib/data/regulations';

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

export default function Regulations() {
  const { theme } = useTheme();
  const [states, setStates] = useState<RegulationState[]>(() => loadRegulationStates());
  const [lastFetch, setLastFetch] = useState<string | null>(() => getLastFetchAt());
  const [loading, setLoading] = useState(false);
  const refreshing = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (refreshing.current) return;
    refreshing.current = true;
    setLoading(true);
    try {
      const result = await maybeRefreshRegulations(force);
      setStates(result.states);
      setLastFetch(result.lastFetch);
    } finally {
      setLoading(false);
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refresh]);

  const stateById = (id: string) => states.find((s) => s.id === id);

  const handleOpen = (id: string, url: string) => {
    setStates((prev) => prev.map((s) => (s.id === id ? { ...s, isUpdated: false } : s)));
    markRegulationSeen(id);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">რეგულაციები</h1>
          <p className="mt-1 text-sm text-neutral-500">ბოლო განახლება: {formatLastFetch(lastFetch)}</p>
        </div>
        <Button title="განახლება" variant="ghost" size="sm" leftIcon={RefreshCw} onPress={() => refresh(true)} disabled={loading} />
      </header>

      <div className="space-y-3">
        {REGULATIONS.map((item, index) => {
          const st = stateById(item.id);
          return (
            <Card key={item.id} padding="none" onPress={() => handleOpen(item.id, item.url)} style={{ overflow: 'hidden' }}>
              <View style={{ height: 2, backgroundColor: theme.colors.accent, opacity: 0.7 }} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, padding: 16 }}>
                <View
                  style={{
                    height: 28,
                    width: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.accentSoft,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.accent }}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20, color: theme.colors.ink }}>
                      {item.title}
                    </Text>
                    {st?.isUpdated && <Badge variant="primary">განახლდა</Badge>}
                  </View>
                  <Text style={{ marginTop: 4, fontSize: 12, color: theme.colors.inkSoft }}>{item.description}</Text>
                  {st?.lastUpdated && (
                    <Text style={{ marginTop: 6, fontSize: 11, color: theme.colors.inkFaint }}>განახლდა: {st.lastUpdated}</Text>
                  )}
                </View>
                <ExternalLink size={16} color={theme.colors.inkFaint} style={{ marginTop: 2 }} />
              </View>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
