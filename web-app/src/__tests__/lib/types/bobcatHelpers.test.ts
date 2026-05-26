/**
 * Helpers in lib/types/bobcat.ts — buildDefaultItems, computeVerdictSuggestion,
 * categoryCounts. These are pure functions; testing them directly covers the
 * lines + branches.
 */
import { describe, it, expect } from 'vitest';
import {
  buildDefaultItems, computeVerdictSuggestion, categoryCounts, BOBCAT_ITEMS,
  type BobcatItemState,
} from '@/lib/types/bobcat';

describe('buildDefaultItems', () => {
  it('returns an item with result=null for each catalog entry', () => {
    const items = buildDefaultItems();
    expect(items.length).toBe(BOBCAT_ITEMS.length);
    expect(items.every((i) => i.result === null && i.comment === null && i.photo_paths.length === 0)).toBe(true);
  });

  it('builds from a custom catalog', () => {
    const custom = BOBCAT_ITEMS.slice(0, 2);
    const items = buildDefaultItems(custom);
    expect(items.length).toBe(2);
  });
});

describe('computeVerdictSuggestion', () => {
  it('returns null when no items are filled', () => {
    const items: BobcatItemState[] = buildDefaultItems();
    expect(computeVerdictSuggestion(items)).toBeNull();
  });

  it('returns "approved" when all filled items are good', () => {
    const items: BobcatItemState[] = buildDefaultItems().slice(0, 3).map((i) => ({
      ...i, result: 'good',
    }));
    expect(computeVerdictSuggestion(items)).toBe('approved');
  });

  it('returns "limited" when at least one item is deficient', () => {
    const items: BobcatItemState[] = buildDefaultItems().slice(0, 3).map((i, idx) => ({
      ...i, result: idx === 0 ? 'deficient' : 'good',
    }));
    expect(computeVerdictSuggestion(items)).toBe('limited');
  });

  it('returns "rejected" when at least one item is unusable (non-neutral)', () => {
    // Find a catalog entry that's NOT unusableIsNeutral.
    const nonNeutralEntry = BOBCAT_ITEMS.find((e) => !e.unusableIsNeutral)!;
    const items: BobcatItemState[] = [{
      id: nonNeutralEntry.id, result: 'unusable', comment: null, photo_paths: [],
    }];
    expect(computeVerdictSuggestion(items)).toBe('rejected');
  });
});

describe('categoryCounts', () => {
  it('counts good/deficient/unusable per category', () => {
    // Get all category-A entries.
    const aEntries = BOBCAT_ITEMS.filter((e) => e.category === 'A');
    expect(aEntries.length).toBeGreaterThan(0);
    const items: BobcatItemState[] = aEntries.map((e, idx) => ({
      id: e.id,
      result: idx % 3 === 0 ? 'good' : idx % 3 === 1 ? 'deficient' : 'unusable',
      comment: null,
      photo_paths: [],
    }));
    const counts = categoryCounts(items, 'A');
    expect(counts.good + counts.deficient + counts.unusable).toBe(aEntries.length);
  });
});
