import { sectionLabel } from './sections';

/**
 * Shows where a text lives: a Georgian section chip (e.g. „კალენდარი“) followed
 * by the remaining technical key path in muted text for disambiguation.
 */
export function Breadcrumbs({ path }: { path: string }) {
  const segs = path.split('.');
  const rest = segs.slice(1);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
        {sectionLabel(segs[0])}
      </span>
      {rest.map((seg, i) => (
        <span key={i} className="flex items-center gap-1 text-neutral-400">
          <span className="text-neutral-300">›</span>
          <span>{/^\d+$/.test(seg) ? `[${seg}]` : seg}</span>
        </span>
      ))}
    </div>
  );
}
