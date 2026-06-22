import { useMemo, useState } from 'react';
import { AuthError, save, StaleError } from './api';
import { SearchBar } from './SearchBar';
import { StringRow } from './StringRow';
import type { Row } from './types';

const RENDER_LIMIT = 100; // keep the DOM light; search is the primary navigation

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
  const [editor, setEditor] = useState(() => sessionStorage.getItem('cms.editor') ?? '');
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.key.toLowerCase().includes(q) ||
        norm(r.en).toLowerCase().includes(q) ||
        norm(r.ka).toLowerCase().includes(q),
    );
  }, [rows, query]);

  const shown = filtered.slice(0, RENDER_LIMIT);

  function update(key: string, lang: 'en' | 'ka', value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [lang]: value } : r)));
    if (status !== 'idle') setStatus('idle');
  }

  async function onSave() {
    if (dirty.length === 0) return;
    setStatus('saving');
    setErrorMsg('');
    try {
      // Empty field → null: "no override", so the bundled value shows (a label
      // can't be blanked to nothing). The mobile overlay skips null values.
      const changes = dirty.map((r) => ({
        key: r.key,
        en: norm(r.en) === '' ? null : r.en,
        ka: norm(r.ka) === '' ? null : r.ka,
      }));
      await save(password, editor.trim(), changes);
      setBaseline((prev) => {
        const next = new Map(prev);
        for (const r of dirty) next.set(r.key, { en: r.en, ka: r.ka });
        return next;
      });
      sessionStorage.setItem('cms.editor', editor.trim());
      setStatus('saved');
    } catch (e) {
      if (e instanceof AuthError) {
        onAuthLost();
        return;
      }
      setStatus('error');
      setErrorMsg(
        e instanceof StaleError
          ? 'Texts changed on the server. Reload the page and re-apply your edits.'
          : 'Save failed. Check your connection and try again.',
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-6">
      <header className="mb-5">
        <h1 className="text-lg font-bold text-neutral-900">Hubble — Text CMS</h1>
        <p className="text-sm text-neutral-500">Correct the app's Georgian &amp; English texts.</p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-neutral-200 bg-[#fafafa] px-4 pb-3 pt-2">
        <SearchBar
          query={query}
          onQuery={setQuery}
          resultLabel={
            filtered.length > shown.length
              ? `Showing ${shown.length} of ${filtered.length} — refine your search`
              : `${filtered.length} ${filtered.length === 1 ? 'text' : 'texts'}`
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        {shown.map((row) => (
          <StringRow
            key={row.key}
            row={row}
            dirty={dirtyKeys.has(row.key)}
            onChange={(lang, value) => update(row.key, lang, value)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-neutral-400">No texts match “{query}”.</p>
        )}
      </div>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <input
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
            placeholder="Your name (optional)"
            className="hidden w-40 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-400 sm:block"
          />
          <div className="flex-1 text-sm">
            {status === 'error' ? (
              <span className="text-red-600">{errorMsg}</span>
            ) : status === 'saved' && dirty.length === 0 ? (
              <span className="text-green-600">Saved — live on the next app open.</span>
            ) : (
              <span className="text-neutral-500">
                {dirty.length === 0 ? 'No unsaved changes' : `${dirty.length} unsaved`}
              </span>
            )}
          </div>
          <button
            onClick={onSave}
            disabled={dirty.length === 0 || status === 'saving'}
            className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {status === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
