import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  slideDisplayPaths,
  slideLayout,
  type Report,
  type ReportSlide,
} from '@/lib/data/reports';
import { useSlideSignedUrls } from './useSlideSignedUrls';

/**
 * ReportPreview — the presentation-style rendering of a photo report: one
 * A4-landscape sheet per slide (title header on the first), each laying out
 * its 1–2 photos per the slide's chosen layout + the description. Used both
 * as the SplitWizard live preview (updates as slides change) and as the body
 * of the read-only completed-report view.
 */
export function ReportPreview({ report, projectName }: { report: Report; projectName?: string | null }) {
  const slides = report.slides ?? [];
  const urls = useSlideSignedUrls(slides);
  const date = new Date(report.created_at).toLocaleDateString('ka-GE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-4">
      <Sheet>
        <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">ფოტო-რეპორტი</p>
          <h2 className="text-xl font-bold text-neutral-900">{report.title || 'ფოტო-რეპორტი'}</h2>
          <p className="text-xs text-neutral-500">
            {[projectName, date].filter(Boolean).join(' · ')}
          </p>
          <p className="text-[11px] text-neutral-400">{slides.length} სლაიდი</p>
        </div>
      </Sheet>
      {slides.map((slide, i) => (
        <Sheet key={slide.id}>
          <SlideSheet slide={slide} index={i} urls={urls} />
        </Sheet>
      ))}
    </div>
  );
}

/** A4-landscape "sheet" — white page, border separation (no shadows). */
function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="aspect-[297/210] w-full overflow-hidden rounded border border-[var(--border-strong,var(--border-default))] bg-white text-neutral-900">
      {children}
    </div>
  );
}

function Photo({ url, className }: { url?: string; className?: string }) {
  if (!url) {
    return (
      <div className={cn('flex items-center justify-center bg-neutral-100 text-neutral-300', className)}>
        <ImageOff size={22} />
      </div>
    );
  }
  return <img src={url} alt="" className={cn('object-cover', className)} />;
}

function SlideSheet({
  slide,
  index,
  urls,
}: {
  slide: ReportSlide;
  index: number;
  urls: Record<string, string>;
}) {
  const photos = slideDisplayPaths(slide).map((p) => urls[p]);
  // Normalize a stored layout that no longer matches the photo count
  // (e.g. 'two-side' left over after a photo was removed).
  const stored = slideLayout(slide);
  const twoPhoto = stored === 'two-side' || stored === 'two-stacked';
  const layout =
    photos.length >= 2 ? (twoPhoto ? stored : 'two-side') : twoPhoto ? 'text-photo' : stored;
  const heading = (
    <div className="flex items-baseline gap-2 border-b border-neutral-200 px-5 py-2.5">
      <span className="text-[10px] font-bold tabular-nums text-neutral-400">{index + 1}</span>
      <span className="truncate text-[13px] font-bold">{slide.title || `სლაიდი ${index + 1}`}</span>
    </div>
  );
  const description = slide.description ? (
    <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-neutral-700">{slide.description}</p>
  ) : null;

  if (photos.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {heading}
        <div className="flex-1 overflow-hidden p-5">{description}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {heading}
      <div className="min-h-0 flex-1 p-4">
        {layout === 'photo-full' ? (
          <div className="flex h-full flex-col gap-2">
            <Photo url={photos[0]} className="min-h-0 w-full flex-1 rounded" />
            {description}
          </div>
        ) : layout === 'two-side' ? (
          <div className="flex h-full flex-col gap-2">
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
              {photos.slice(0, 2).map((u, i) => (
                <Photo key={i} url={u} className="h-full w-full rounded" />
              ))}
            </div>
            {description}
          </div>
        ) : layout === 'two-stacked' ? (
          <div className="grid h-full grid-cols-[1.2fr_1fr] gap-3">
            <div className="grid min-h-0 grid-rows-2 gap-2">
              {photos.slice(0, 2).map((u, i) => (
                <Photo key={i} url={u} className="h-full w-full rounded" />
              ))}
            </div>
            <div className="min-h-0 overflow-hidden">{description}</div>
          </div>
        ) : (
          /* text-photo: description left, photo right */
          <div className="grid h-full grid-cols-2 gap-3">
            <div className="min-h-0 overflow-hidden">{description}</div>
            <Photo url={photos[0]} className="h-full w-full rounded" />
          </div>
        )}
      </div>
    </div>
  );
}
