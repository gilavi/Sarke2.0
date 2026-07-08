import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DeleteButton from '@/components/DeleteButton';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import { toastError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import {
  MAX_SLIDE_PHOTOS,
  deleteReportPhotoObject,
  signedReportPhotoUrl,
  slideImages,
  slideLayout,
  uploadReportPhoto,
  type Report,
  type ReportSlide,
  type ReportSlideLayout,
} from '@/lib/data/reports';

interface Props {
  report: Report;
  slide: ReportSlide;
  index: number;
  /** Persist a slide patch. MUST reject on failure (text fields revert). */
  onSave: (patch: Partial<Pick<ReportSlide, 'title' | 'description' | 'images' | 'layout'>>) => Promise<unknown>;
  onRemove: () => void;
  isRemoving?: boolean;
}

const LAYOUTS_ONE: { key: ReportSlideLayout; label: string }[] = [
  { key: 'text-photo', label: 'ტექსტი + ფოტო' },
  { key: 'photo-full', label: 'დიდი ფოტო' },
];
const LAYOUTS_TWO: { key: ReportSlideLayout; label: string }[] = [
  { key: 'two-side', label: 'გვერდიგვერდ' },
  { key: 'two-stacked', label: 'დაწყობილი' },
];

/**
 * One editable report slide: title + description (controlled, commit-on-blur,
 * revert-on-failure — the SlideCard pattern), up to 2 photos via the canonical
 * PhotoUploadWidget (report-photos bucket), and layout chips once photos exist.
 */
export function SlideEditorCard({ report, slide, index, onSave, onRemove, isRemoving }: Props) {
  const [title, setTitle] = useState(slide.title);
  const [description, setDescription] = useState(slide.description);

  // Resync from the saved value when the server copy changes (refetch/reorder)
  // without clobbering an in-progress edit — "store previous value" pattern.
  const [synced, setSynced] = useState({ title: slide.title, description: slide.description });
  if (synced.title !== slide.title || synced.description !== slide.description) {
    setSynced({ title: slide.title, description: slide.description });
    setTitle(slide.title);
    setDescription(slide.description);
  }

  async function commit(patch: Parameters<Props['onSave']>[0], revert?: () => void) {
    try {
      await onSave(patch);
    } catch (e) {
      revert?.();
      toastError(e);
    }
  }

  const images = slideImages(slide);
  const paths = images.map((im) => im.image_path ?? im.annotated_image_path).filter((p): p is string => !!p);
  const layoutOptions = paths.length >= 2 ? LAYOUTS_TWO : paths.length === 1 ? LAYOUTS_ONE : null;
  // A stored layout from the other photo-count group (e.g. 'two-side' left over
  // after removing a photo) falls back to the group's first option.
  const stored = slideLayout(slide);
  const activeLayout = layoutOptions?.some((o) => o.key === stored) ? stored : layoutOptions?.[0]?.key;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
      <div className="flex items-start gap-2">
        <Input
          value={title}
          placeholder={`სლაიდი ${index + 1}`}
          className="font-semibold"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const v = title.trim();
            if (v !== slide.title) void commit({ title: v }, () => setTitle(slide.title));
          }}
        />
        <DeleteButton
          iconOnly
          onDelete={onRemove}
          isPending={isRemoving}
          description="სლაიდი და მისი ფოტოები სამუდამოდ წაიშლება."
        />
      </div>
      <Textarea
        rows={2}
        value={description}
        placeholder="აღწერა"
        className="mt-2"
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => {
          if (description !== slide.description)
            void commit({ description }, () => setDescription(slide.description));
        }}
      />
      <PhotoUploadWidget
        paths={paths}
        prefix="report"
        inspectionId={report.id}
        itemId={slide.id}
        uploadFn={(file) => {
          if (paths.length >= MAX_SLIDE_PHOTOS)
            return Promise.reject(new Error(`მაქსიმუმ ${MAX_SLIDE_PHOTOS} ფოტო თითო სლაიდზე`));
          return uploadReportPhoto(report, file);
        }}
        signedUrlFn={signedReportPhotoUrl}
        deleteFn={deleteReportPhotoObject}
        onAdd={(path) =>
          void commit({ images: [...images, { image_path: path, annotated_image_path: null }] })
        }
        onRemove={(path) =>
          void commit({
            images: images.filter((im) => (im.image_path ?? im.annotated_image_path) !== path),
          })
        }
      />
      {layoutOptions ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {layoutOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => activeLayout !== opt.key && void commit({ layout: opt.key })}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                activeLayout === opt.key
                  ? 'border-transparent bg-[var(--text-primary)] text-[var(--bg-card)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
