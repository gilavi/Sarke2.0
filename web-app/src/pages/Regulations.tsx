import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
          <h1 className="font-display text-3xl font-bold text-neutral-900">რეგულაციები</h1>
          <p className="mt-1 text-sm text-neutral-500">
            ბოლო განახლება: {formatLastFetch(lastFetch)}
          </p>
        </div>
        <button
          onClick={() => refresh(true)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
          title="განახლება"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          განახლება
        </button>
      </header>

      <div className="space-y-3">
        {REGULATIONS.map((item, index) => {
          const st = stateById(item.id);
          return (
            <Card
              key={item.id}
              className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
              onClick={() => handleOpen(item.id, item.url)}
            >
              <div className="h-0.5 bg-emerald-600 opacity-70" />
              <CardContent className="flex items-start gap-4 py-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span className="flex-1 text-sm font-semibold leading-snug text-neutral-900">
                      {item.title}
                    </span>
                    {st?.isUpdated && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        განახლდა
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{item.description}</p>
                  {st?.lastUpdated && (
                    <p className="mt-1.5 text-[11px] text-neutral-400">
                      განახლდა: {st.lastUpdated}
                    </p>
                  )}
                </div>
                <ExternalLink size={16} className="mt-0.5 shrink-0 text-neutral-400" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
