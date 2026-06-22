export function SearchBar({
  query,
  onQuery,
  resultLabel,
}: {
  query: string;
  onQuery: (q: string) => void;
  resultLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1">
        <input
          type="search"
          value={query}
          autoFocus
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search key, English or Georgian…"
          className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <span className="shrink-0 text-xs text-neutral-500">{resultLabel}</span>
    </div>
  );
}
