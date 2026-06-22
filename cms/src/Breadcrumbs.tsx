/** Renders a dotted i18n key as a breadcrumb trail: common › save. */
export function Breadcrumbs({ path }: { path: string }) {
  const segs = path.split('.');
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-neutral-500">
      {segs.map((seg, i) => {
        const isLeaf = i === segs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-neutral-300">›</span>}
            <span className={isLeaf ? 'font-semibold text-neutral-800' : ''}>
              {/^\d+$/.test(seg) ? `[${seg}]` : seg}
            </span>
          </span>
        );
      })}
    </div>
  );
}
