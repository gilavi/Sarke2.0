import type { ReportSlide, ReportSlideLayout, SlideImage } from '../types/models';

/**
 * Canonical helpers for reading and writing a report slide's photos + layout.
 *
 * A slide may carry 1–2 photos (`MAX_SLIDE_PHOTOS`). The canonical store is
 * `ReportSlide.images`, but older reports persisted a single photo in the
 * `image_path` / `annotated_image_path` fields. This module is the ONE place
 * that knows about that legacy shape — every reader (slide editor, slide list,
 * report detail, PDF builder) must go through `slideImages()` rather than
 * touching the raw fields, and every writer must go through `withSlideImages()`
 * so the legacy mirror stays in sync.
 *
 * See `docs/primitives.md` (Report slide photos).
 */

/** Hard cap on photos per slide. Enforced in the editor (by hiding the add affordance). */
export const MAX_SLIDE_PHOTOS = 2;

/** True when this image actually points at a stored file. */
function hasImage(img: SlideImage): boolean {
  return !!(img.image_path || img.annotated_image_path);
}

/**
 * The photos on a slide, in order, 0–2 entries, empties dropped. Reads the
 * canonical `images` array when present, else folds the legacy single-photo
 * fields into a one-element array. This is the only sanctioned way to read a
 * slide's photos.
 */
export function slideImages(slide: ReportSlide): SlideImage[] {
  if (slide.images && slide.images.length > 0) {
    return slide.images.filter(hasImage).slice(0, MAX_SLIDE_PHOTOS);
  }
  const legacy: SlideImage = {
    image_path: slide.image_path,
    annotated_image_path: slide.annotated_image_path,
  };
  return hasImage(legacy) ? [legacy] : [];
}

/** Best display/PDF path for one image (annotated variant preferred). */
export function slideImagePath(img: SlideImage): string | null {
  return img.annotated_image_path ?? img.image_path;
}

/** Every best-path on a slide, in order, empties dropped — for PDF photo prefetch. */
export function slideImagePaths(slide: ReportSlide): string[] {
  return slideImages(slide)
    .map(slideImagePath)
    .filter((p): p is string => !!p);
}

/**
 * The report's cover photo: the first photo across its slides (walked in slide
 * order, annotated variant preferred), or null when the report has no photos
 * yet. Canonical accessor for the list/card thumbnail "sneak peek" — don't
 * re-walk slides by hand. Consumed by `features/records` (`ReportThumb`,
 * `ReportCard`).
 */
export function reportCoverPath(slides: ReportSlide[] | undefined): string | null {
  const ordered = [...(slides ?? [])].sort((a, b) => a.order - b.order);
  for (const s of ordered) {
    for (const img of slideImages(s)) {
      const p = slideImagePath(img);
      if (p) return p;
    }
  }
  return null;
}

/** Number of photos currently on a slide (0–2). */
export function slidePhotoCount(slide: ReportSlide): number {
  return slideImages(slide).length;
}

/**
 * The layout options the editor offers for a given photo count. Only the
 * two-photo case has a real choice (side-by-side vs stacked); a single photo
 * renders automatically (big photo when there's no description, text+photo when
 * there is — see `SlideCanvas` / the PDF), so it offers no chooser.
 */
export function layoutsForCount(count: number): ReportSlideLayout[] {
  if (count >= 2) return ['two-side', 'two-stacked'];
  return [];
}

/** Sensible auto-default layout for a photo count (used when none is chosen). */
export function defaultSlideLayout(count: number): ReportSlideLayout {
  return count >= 2 ? 'two-side' : 'text-photo';
}

/**
 * The layout to actually render. Honors `slide.layout` only when it is valid for
 * the current photo count, otherwise falls back to the auto-default. This keeps a
 * slide from rendering broken if its photo count changed (e.g. 2→1) after a layout
 * was chosen.
 */
export function slideLayout(slide: ReportSlide): ReportSlideLayout {
  const count = slidePhotoCount(slide);
  const valid = layoutsForCount(count);
  if (slide.layout && valid.includes(slide.layout)) return slide.layout;
  return defaultSlideLayout(count);
}

/**
 * Produce a slide with its photos updated. Writes the canonical `images` array
 * (capped at `MAX_SLIDE_PHOTOS`, empties dropped) AND mirrors `images[0]` back
 * into the legacy `image_path` / `annotated_image_path` fields so anything still
 * reading the old shape keeps working. Pass `layout` to set the chosen layout in
 * the same write.
 */
export function withSlideImages(
  slide: ReportSlide,
  images: SlideImage[],
  layout?: ReportSlideLayout,
): ReportSlide {
  const clean = images.filter(hasImage).slice(0, MAX_SLIDE_PHOTOS);
  const first = clean[0];
  return {
    ...slide,
    images: clean,
    image_path: first?.image_path ?? null,
    annotated_image_path: first?.annotated_image_path ?? null,
    // A slide with no photos has no layout to render; clear it so the persisted
    // field never diverges from what slideLayout() derives.
    layout: clean.length > 0 ? layout ?? slide.layout : undefined,
  };
}
