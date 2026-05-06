import { useEffect, useState } from 'react';

interface PhotoGalleryProps {
  /** signed URLs — empty strings are rendered as placeholder tiles */
  urls: string[];
  /** label shown in the lightbox caption, e.g. "სლაიდი 2" */
  captions?: string[];
}

export default function PhotoGallery({ urls, captions = [] }: PhotoGalleryProps) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i !== null ? Math.min(i + 1, urls.length - 1) : null));
      if (e.key === 'ArrowLeft') setOpen((i) => (i !== null ? Math.max(i - 1, 0) : null));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, urls.length]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {urls.map((url, i) =>
          url ? (
            <button
              key={i}
              type="button"
              onClick={() => setOpen(i)}
              className="aspect-square w-full overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <img
                src={url}
                alt={captions[i] ?? `Photo ${i + 1}`}
                className="h-full w-full object-cover transition-transform hover:scale-105"
                loading="lazy"
              />
            </button>
          ) : (
            <div key={i} className="aspect-square w-full rounded-lg bg-neutral-100" />
          ),
        )}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setOpen(null)}
        >
          {/* prev */}
          {open > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(open - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25"
              aria-label="წინა"
            >
              ‹
            </button>
          )}

          <div
            className="flex max-h-screen max-w-5xl flex-col items-center px-16"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={urls[open]}
              alt={captions[open] ?? `Photo ${open + 1}`}
              className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <div className="mt-3 text-sm text-white/70">
              {captions[open] ?? `${open + 1} / ${urls.length}`}
              {captions[open] && (
                <span className="ml-2 text-white/40">{open + 1} / {urls.length}</span>
              )}
            </div>
          </div>

          {/* next */}
          {open < urls.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(open + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25"
              aria-label="შემდეგი"
            >
              ›
            </button>
          )}

          {/* close */}
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
            aria-label="დახურვა"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
