import { useMemo, useState } from 'react';
import { AuthError, save, StaleError } from './api';
import { FilterBar } from './FilterBar';
import { sameTokens } from './placeholders';
import { StringRow } from './StringRow';
import { T } from './strings';
import type { Row } from './types';

const RENDER_LIMIT = 100; // keep the DOM light; search/section are the navigation
const nsOf = (key: string) => key.split('.')[0];
const norm = (v: string | null) => v ?? '';

type Baseline = Map<string, { en: string | null; ka: string | null }>;

function toBaseline(rows: Row[]): Baseline {
  return new Map(rows.map((r) => [r.key, { en: r.en, ka: r.ka }]));
}

export function Editor({
  initialRows,
  password,
  onAuthLost,
}: {
  initialRows: Row[];
  password: string;
  onAuthLost: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [baseline, setBaseline] = useState<Baseline>(() => toBaseline(initialRows));
  const [query, setQuery] = useState('');
  const [namespace, setNamespace] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const dirty = useMemo(
    () =>
      rows.filter((r) => {
        const b = baseline.get(r.key);
        return b && (norm(b.en) !== norm(r.en) || norm(b.ka) !== norm(r.ka));
      }),
    [rows, baseline],
  );
  const dirtyKeys = useMemo(() => new Set(dirty.map((r) => r.key)), [dirty]);

  // Rows whose edit removed/changed a {{...}} placeholder — must be fixed first.
  const broken = useMemo(
    () =>
      dirty.filter((r) => {
        const b = baseline.get(r.key);
        return b && (!sameTokens(b.en, r.en) || !sameTokens(b.ka, r.ka));
      }),
    [dirty, baseline],
  );

  // Sections (top-level key segment) with counts, for the dropdown.
  const namespaces = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(nsOf(r.key), (counts.get(nsOf(r.key)) ?? 0) + 1);
    return [...counts.entries()].sort().map(([name, count]) => ({ name, count }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (namespace && nsOf(r.key) !== namespace) return false;
      if (missingOnly && norm(r.en) !== '' && norm(r.ka) !== '') return false;
      if (!q) return true;
      return (
        r.key.toLowerCase().includes(q) ||
        norm(r.en).toLowerCase().includes(q) ||
        norm(r.ka).toLowerCase().includes(q)
      );
    });
  }, [rows, query, namespace, missingOnly]);

  const shown = filtered.slice(0, RENDER_LIMIT);

  function update(key: string, lang: 'en' | 'ka', value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [lang]: value } : r)));
    if (status !== 'idle') setStatus('idle');
  }

  async function onSave() {
    if (dirty.length === 0 || broken.length > 0) return;
    setStatus('saving');
    setErrorMsg('');
    try {
      // Empty field → null: the bundled value shows (a label can't be blanked).
      const changes = dirty.map((r) => ({
        key: r.key,
        en: norm(r.en) === '' ? null : r.en,
        ka: norm(r.ka) === '' ? null : r.ka,
      }));
      await save(password, '', changes);
      setBaseline((prev) => {
        const next = new Map(prev);
        for (const r of dirty) next.set(r.key, { en: r.en, ka: r.ka });
        return next;
      });
      setStatus('saved');
    } catch (e) {
      if (e instanceof AuthError) {
        onAuthLost();
        return;
      }
      setStatus('error');
      setErrorMsg(e instanceof StaleError ? T.staleError : T.saveError);
    }
  }

  const canSave = dirty.length > 0 && broken.length === 0 && status !== 'saving';

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-6">
      <header className="mb-5">
        <h1 className="text-lg font-bold text-neutral-900">{T.title}</h1>
        <p className="text-sm text-neutral-500">{T.subtitle}</p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-neutral-200 bg-[#fafafa] px-4 pb-3 pt-2">
        <FilterBar
          query={query}
          onQuery={setQuery}
          namespace={namespace}
          onNamespace={setNamespace}
          namespaces={namespaces}
          total={rows.length}
          missingOnly={missingOnly}
          onMissingOnly={setMissingOnly}
          resultLabel={
            filtered.length > shown.length
              ? T.showingOf(shown.length, filtered.length)
              : T.count(filtered.length)
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        {shown.map((row) => (
          <StringRow
            key={row.key}
            row={row}
            base={baseline.get(row.key)}
            dirty={dirtyKeys.has(row.key)}
            onChange={(lang, value) => update(row.key, lang, value)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-neutral-400">{T.noMatch}</p>
        )}
      </div>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex-1 text-sm">
            {broken.length > 0 ? (
              <span className="text-red-600">{T.fixTokensFirst(broken.length)}</span>
            ) : status === 'error' ? (
              <span className="text-red-600">{errorMsg}</span>
            ) : status === 'saved' && dirty.length === 0 ? (
              <span className="text-green-600">{T.saved}</span>
            ) : (
              <span className="text-neutral-500">
                {dirty.length === 0 ? T.noUnsaved : T.unsaved(dirty.length)}
              </span>
            )}
          </div>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {status === 'saving' ? T.saving : T.saveBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
