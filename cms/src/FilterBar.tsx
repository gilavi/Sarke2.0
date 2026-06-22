import { sectionLabel } from './sections';
import { T } from './strings';

export type NsCount = { name: string; count: number };

export function FilterBar({
  query,
  onQuery,
  namespace,
  onNamespace,
  namespaces,
  total,
  missingOnly,
  onMissingOnly,
  resultLabel,
}: {
  query: string;
  onQuery: (q: string) => void;
  namespace: string;
  onNamespace: (n: string) => void;
  namespaces: NsCount[];
  total: number;
  missingOnly: boolean;
  onMissingOnly: (b: boolean) => void;
  resultLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={query}
        autoFocus
        onChange={(e) => onQuery(e.target.value)}
        placeholder={T.searchPlaceholder}
        className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={namespace}
          onChange={(e) => onNamespace(e.target.value)}
          className="max-w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-brand-400"
        >
          <option value="">
            {T.allSections} ({total})
          </option>
          {namespaces.map((n) => (
            <option key={n.name} value={n.name}>
              {sectionLabel(n.name)} ({n.count})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => onMissingOnly(e.target.checked)}
            className="h-4 w-4 accent-brand-500"
          />
          {T.missingOnly}
        </label>
        <span className="ml-auto text-xs text-neutral-500">{resultLabel}</span>
      </div>
    </div>
  );
}
