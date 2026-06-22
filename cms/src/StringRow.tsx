import { Breadcrumbs } from './Breadcrumbs';
import { sameTokens, tokens } from './placeholders';
import { T } from './strings';
import type { Row } from './types';

function Field({
  label,
  value,
  base,
  onChange,
}: {
  label: string;
  value: string | null;
  base: string | null;
  onChange: (v: string) => void;
}) {
  const baseTokens = tokens(base);
  const broken = baseTokens.length > 0 && !sameTokens(base, value);
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <textarea
        value={value ?? ''}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm leading-snug text-neutral-900 outline-none focus:ring-2 ${
          broken
            ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
            : 'border-neutral-200 focus:border-brand-400 focus:ring-brand-100'
        }`}
      />
      {baseTokens.length > 0 && (
        <span
          className={`mt-1 block text-[11px] ${
            broken ? 'font-medium text-red-600' : 'text-neutral-400'
          }`}
        >
          {broken ? `⚠️ ${T.brokenTokens}` : `ℹ️ ${T.keepTokens}`}{' '}
          <code className="font-mono">{baseTokens.join('  ')}</code>
        </span>
      )}
    </label>
  );
}

export function StringRow({
  row,
  base,
  dirty,
  onChange,
}: {
  row: Row;
  base: { en: string | null; ka: string | null } | undefined;
  dirty: boolean;
  onChange: (lang: 'en' | 'ka', value: string) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        dirty ? 'border-brand-400 bg-brand-50' : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Breadcrumbs path={row.key} />
        {dirty && <span className="shrink-0 text-xs font-semibold text-brand-600">{T.edited}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={T.english} value={row.en} base={base?.en ?? null} onChange={(v) => onChange('en', v)} />
        <Field label={T.georgian} value={row.ka} base={base?.ka ?? null} onChange={(v) => onChange('ka', v)} />
      </div>
    </div>
  );
}
