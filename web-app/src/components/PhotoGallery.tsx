import { useEffect, useState } from 'react';
import { Modal, ActionIcon } from '@mantine/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
              key={url}
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
            <div key={`placeholder-${i}`} className="aspect-square w-full rounded-lg bg-neutral-100" />
          ),
        )}
      </div>

      <Modal
        opened={open !== null}
        onClose={() => setOpen(null)}
        size="xl"
        centered
        withCloseButton
        radius="md"
        styles={{ body: { padding: 0 }, content: { background: '#000' } }}
      >
        {open !== null && (
          <div className="relative flex items-center justify-center" style={{ minHeight: 400 }}>
            <img
              src={urls[open]}
              alt={captions[open] ?? `Photo ${open + 1}`}
              className="max-h-[70vh] max-w-full rounded-md object-contain"
            />
            <div className="mt-3 absolute bottom-3 left-1/2 -translate-x-1/2 text-sm text-white/70">
              {captions[open] ?? `${open + 1} / ${urls.length}`}
              {captions[open] && (
                <span className="ml-2 text-white/40">{open + 1} / {urls.length}</span>
              )}
            </div>
            {open > 0 && (
              <ActionIcon
                variant="filled"
                color="dark"
                radius="xl"
                className="absolute left-3"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setOpen(i => Math.max((i ?? 0) - 1, 0))}
                aria-label="წინა"
              >
                <ChevronLeft size={16} />
              </ActionIcon>
            )}
            {open < urls.length - 1 && (
              <ActionIcon
                variant="filled"
                color="dark"
                radius="xl"
                className="absolute right-3"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setOpen(i => Math.min((i ?? 0) + 1, urls.length - 1))}
                aria-label="შემდეგი"
              >
                <ChevronRight size={16} />
              </ActionIcon>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
