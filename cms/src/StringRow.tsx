import { Breadcrumbs } from './Breadcrumbs';
import type { Row } from './types';

function Field({
  label,
  value,
  rtlHint,
  onChange,
}: {
  label: string;
  value: string | null;
  rtlHint?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <textarea
        value={value ?? ''}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm leading-snug text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
          rtlHint ? '' : ''
        }`}
      />
    </label>
  );
}

export function StringRow({
  row,
  dirty,
  onChange,
}: {
  row: Row;
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
        {dirty && <span className="shrink-0 text-xs font-semibold text-brand-600">edited</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="English" value={row.en} onChange={(v) => onChange('en', v)} />
        <Field label="ქართული" value={row.ka} onChange={(v) => onChange('ka', v)} />
      </div>
    </div>
  );
}
