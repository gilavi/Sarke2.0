import { describe, it, expect } from 'vitest';
import {
  MAX_SLIDE_PHOTOS,
  defaultSlideLayout,
  layoutsForCount,
  slideImagePath,
  slideImagePaths,
  slideImages,
  slideLayout,
  slidePhotoCount,
  withSlideImages,
} from '../../lib/reportSlides';
import type { ReportSlide, SlideImage } from '../../types/models';

function mockSlide(over: Partial<ReportSlide> = {}): ReportSlide {
  return {
    id: 's1',
    order: 0,
    title: 'სათაური',
    description: '',
    image_path: null,
    annotated_image_path: null,
    ...over,
  };
}

const img = (p: string | null, a: string | null = null): SlideImage => ({
  image_path: p,
  annotated_image_path: a,
});

describe('slideImages — legacy fold + canonical read', () => {
  it('folds a legacy single-photo slide into a 1-element array', () => {
    const s = mockSlide({ image_path: 'a.jpg' });
    expect(slideImages(s)).toEqual([{ image_path: 'a.jpg', annotated_image_path: null }]);
  });

  it('returns [] for a slide with no photos', () => {
    expect(slideImages(mockSlide())).toEqual([]);
  });

  it('reads the canonical images array when present', () => {
    const s = mockSlide({ images: [img('a.jpg'), img('b.jpg')] });
    expect(slideImages(s)).toHaveLength(2);
  });

  it('falls back to legacy fields when images is an empty array', () => {
    const s = mockSlide({ image_path: 'a.jpg', images: [] });
    expect(slideImages(s)).toEqual([{ image_path: 'a.jpg', annotated_image_path: null }]);
  });

  it('drops all-null image entries', () => {
    const s = mockSlide({ images: [img(null, null), img('b.jpg')] });
    expect(slideImages(s)).toEqual([{ image_path: 'b.jpg', annotated_image_path: null }]);
  });

  it('caps a too-long images array at MAX_SLIDE_PHOTOS', () => {
    const s = mockSlide({ images: [img('a.jpg'), img('b.jpg'), img('c.jpg')] });
    expect(slideImages(s)).toHaveLength(MAX_SLIDE_PHOTOS);
    expect(slidePhotoCount(s)).toBe(2);
  });
});

describe('slideImagePath / slideImagePaths', () => {
  it('prefers the annotated variant', () => {
    expect(slideImagePath(img('raw.jpg', 'annotated.jpg'))).toBe('annotated.jpg');
    expect(slideImagePath(img('raw.jpg', null))).toBe('raw.jpg');
  });

  it('collects every path on a slide, empties dropped', () => {
    const s = mockSlide({ images: [img('a.jpg', 'a-note.jpg'), img('b.jpg')] });
    expect(slideImagePaths(s)).toEqual(['a-note.jpg', 'b.jpg']);
  });
});

describe('layout helpers', () => {
  it('exposes the valid layouts per photo count', () => {
    expect(layoutsForCount(0)).toEqual([]);
    expect(layoutsForCount(1)).toEqual(['text-photo', 'photo-full']);
    expect(layoutsForCount(2)).toEqual(['two-side', 'two-stacked']);
  });

  it('defaults sensibly per count', () => {
    expect(defaultSlideLayout(0)).toBe('text-photo');
    expect(defaultSlideLayout(1)).toBe('text-photo');
    expect(defaultSlideLayout(2)).toBe('two-side');
  });

  it('honors a stored layout valid for the photo count', () => {
    const s = mockSlide({ images: [img('a.jpg')], layout: 'photo-full' });
    expect(slideLayout(s)).toBe('photo-full');
  });

  it('overrides a stored layout that is invalid for the photo count', () => {
    // 'two-side' is a 2-photo layout; on a 1-photo slide it must fall back.
    const s = mockSlide({ images: [img('a.jpg')], layout: 'two-side' });
    expect(slideLayout(s)).toBe('text-photo');
  });

  it('returns the default for a slide with no photos', () => {
    expect(slideLayout(mockSlide({ layout: 'two-stacked' }))).toBe('text-photo');
  });
});

describe('withSlideImages — write + legacy mirror', () => {
  it('mirrors images[0] into the legacy fields', () => {
    const next = withSlideImages(mockSlide(), [img('a.jpg', 'a-note.jpg'), img('b.jpg')], 'two-side');
    expect(next.images).toHaveLength(2);
    expect(next.image_path).toBe('a.jpg');
    expect(next.annotated_image_path).toBe('a-note.jpg');
    expect(next.layout).toBe('two-side');
  });

  it('caps at MAX_SLIDE_PHOTOS and drops empties', () => {
    const next = withSlideImages(mockSlide(), [img('a.jpg'), img(null), img('b.jpg'), img('c.jpg')]);
    expect(next.images).toEqual([
      { image_path: 'a.jpg', annotated_image_path: null },
      { image_path: 'b.jpg', annotated_image_path: null },
    ]);
  });

  it('clears the legacy mirror and layout when no photos remain', () => {
    const prev = mockSlide({ image_path: 'a.jpg', images: [img('a.jpg')], layout: 'two-stacked' });
    const next = withSlideImages(prev, [], 'two-stacked');
    expect(next.images).toEqual([]);
    expect(next.image_path).toBeNull();
    expect(next.annotated_image_path).toBeNull();
    expect(next.layout).toBeUndefined();
  });

  it('keeps the existing layout when none is passed', () => {
    const prev = mockSlide({ images: [img('a.jpg')], layout: 'photo-full' });
    const next = withSlideImages(prev, [img('a.jpg')]);
    expect(next.layout).toBe('photo-full');
  });
});
