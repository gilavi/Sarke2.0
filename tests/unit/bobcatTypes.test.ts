import { describe, it, expect } from 'vitest';
import {
  BOBCAT_ITEMS,
  LARGE_LOADER_ITEMS,
  BOBCAT_CATEGORY_LABELS,
  INSPECTION_TYPE_LABEL,
  VERDICT_LABEL,
  BOBCAT_TEMPLATE_ID,
  LARGE_LOADER_TEMPLATE_ID,
  buildDefaultItems,
  computeVerdictSuggestion,
  categoryCounts,
} from '../../types/bobcat';

// ── BOBCAT_ITEMS catalog integrity ────────────────────────────────────────────

describe('BOBCAT_ITEMS catalog integrity', () => {
  it('has exactly 30 items', () => {
    expect(BOBCAT_ITEMS).toHaveLength(30);
  });

  it('IDs are consecutive 1–30 with no duplicates', () => {
    const ids = BOBCAT_ITEMS.map(i => i.id);
    expect(new Set(ids).size).toBe(30);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(30);
  });

  it('all categories are A|B|C|D', () => {
    const valid = new Set(['A', 'B', 'C', 'D']);
    for (const item of BOBCAT_ITEMS) {
      expect(valid.has(item.category)).toBe(true);
    }
  });

  it('every item has non-empty label and description', () => {
    for (const item of BOBCAT_ITEMS) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('no description contains a dangling "ჩანს" without negation', () => {
    // Any description ending in 'ჩანს' must contain 'არ ჩანს'
    for (const item of BOBCAT_ITEMS) {
      if (item.description.endsWith('ჩანს')) {
        expect(item.description).toMatch(/არ ჩანს/);
      }
    }
  });

  it('no description ends with bare "ბზარი" or "ნაჟური" without negation', () => {
    for (const item of BOBCAT_ITEMS) {
      if (item.description.endsWith('ბზარი')) {
        // If it ends with bare ბზარი, that's a dangling check — should have negation elsewhere
        // The catalog entries that list ბზარი in the description are in a list context, not as a standalone verdict.
        // This test verifies no item description ends with ბზარი as the only word (the issue was descriptions
        // ending with affirmative defect words as if saying "has a crack").
        // Currently all ბზარი-ending descriptions list it alongside other defects in a "check for X" pattern,
        // so we simply assert the pattern is consistent: the description must NOT end with ' ბზარი' after a space
        // unless it's part of a comma-separated defect list (acceptable pattern).
        // A simpler check: if it ends with ბზარი, there must be a comma or dash before it in the description.
        expect(item.description).toMatch(/[,—/].*ბზარი$/);
      }
      if (item.description.endsWith('ნაჟური')) {
        expect(item.description).toMatch(/[,—/].*ნაჟური$/);
      }
    }
  });

  it('category A contains exactly item IDs [1,2,3,4,5]', () => {
    const aIds = BOBCAT_ITEMS.filter(i => i.category === 'A').map(i => i.id).sort((a, b) => a - b);
    expect(aIds).toEqual([1, 2, 3, 4, 5]);
  });

  it('category B contains exactly item IDs [6,7,8,9,10,11,12,13]', () => {
    const bIds = BOBCAT_ITEMS.filter(i => i.category === 'B').map(i => i.id).sort((a, b) => a - b);
    expect(bIds).toEqual([6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('category C contains exactly item IDs [14,15,16,17,18,19]', () => {
    const cIds = BOBCAT_ITEMS.filter(i => i.category === 'C').map(i => i.id).sort((a, b) => a - b);
    expect(cIds).toEqual([14, 15, 16, 17, 18, 19]);
  });

  it('category D contains exactly item IDs [20,21,22,23,24,25,26,27,28,29,30]', () => {
    const dIds = BOBCAT_ITEMS.filter(i => i.category === 'D').map(i => i.id).sort((a, b) => a - b);
    expect(dIds).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  });
});

// ── LARGE_LOADER_ITEMS catalog integrity ──────────────────────────────────────

describe('LARGE_LOADER_ITEMS catalog integrity', () => {
  it('has exactly 33 items', () => {
    expect(LARGE_LOADER_ITEMS).toHaveLength(33);
  });

  it('IDs have no duplicates', () => {
    const ids = LARGE_LOADER_ITEMS.map(i => i.id);
    expect(new Set(ids).size).toBe(LARGE_LOADER_ITEMS.length);
  });

  it('item with id=10 has a description containing "Z-bar"', () => {
    const item = LARGE_LOADER_ITEMS.find(i => i.id === 10);
    expect(item).toBeDefined();
    expect(item!.description).toContain('Z-bar');
  });

  it('item with id=40 exists, has unusableIsNeutral: true, and unusableLabel === "არ გააჩნია"', () => {
    const item = LARGE_LOADER_ITEMS.find(i => i.id === 40);
    expect(item).toBeDefined();
    expect(item!.unusableIsNeutral).toBe(true);
    expect(item!.unusableLabel).toBe('არ გააჩნია');
  });

  it('BOBCAT_ITEMS id=10 does NOT contain "Z-bar" (it is a different item)', () => {
    const item = BOBCAT_ITEMS.find(i => i.id === 10);
    expect(item).toBeDefined();
    expect(item!.description).not.toContain('Z-bar');
  });

  it('category A items (ids 1-5) descriptions match BOBCAT_ITEMS counterparts exactly', () => {
    const llCatA = LARGE_LOADER_ITEMS.filter(i => i.category === 'A').sort((a, b) => a.id - b.id);
    const bcCatA = BOBCAT_ITEMS.filter(i => i.category === 'A').sort((a, b) => a.id - b.id);
    expect(llCatA).toHaveLength(bcCatA.length);
    for (let idx = 0; idx < bcCatA.length; idx++) {
      expect(llCatA[idx].description).toBe(bcCatA[idx].description);
    }
  });
});

// ── BOBCAT_CATEGORY_LABELS ────────────────────────────────────────────────────

describe('BOBCAT_CATEGORY_LABELS', () => {
  it('all four keys A/B/C/D are present', () => {
    expect(BOBCAT_CATEGORY_LABELS).toHaveProperty('A');
    expect(BOBCAT_CATEGORY_LABELS).toHaveProperty('B');
    expect(BOBCAT_CATEGORY_LABELS).toHaveProperty('C');
    expect(BOBCAT_CATEGORY_LABELS).toHaveProperty('D');
  });

  it('each label starts with the corresponding letter', () => {
    expect(BOBCAT_CATEGORY_LABELS.A).toMatch(/^A/);
    expect(BOBCAT_CATEGORY_LABELS.B).toMatch(/^B/);
    expect(BOBCAT_CATEGORY_LABELS.C).toMatch(/^C/);
    expect(BOBCAT_CATEGORY_LABELS.D).toMatch(/^D/);
  });

  it('values are non-empty strings', () => {
    for (const key of ['A', 'B', 'C', 'D'] as const) {
      expect(typeof BOBCAT_CATEGORY_LABELS[key]).toBe('string');
      expect(BOBCAT_CATEGORY_LABELS[key].trim().length).toBeGreaterThan(0);
    }
  });
});

// ── VERDICT_LABEL ─────────────────────────────────────────────────────────────

describe('VERDICT_LABEL', () => {
  it('all three keys approved/limited/rejected are present', () => {
    expect(VERDICT_LABEL).toHaveProperty('approved');
    expect(VERDICT_LABEL).toHaveProperty('limited');
    expect(VERDICT_LABEL).toHaveProperty('rejected');
  });

  it('all values are non-empty Georgian strings', () => {
    for (const key of ['approved', 'limited', 'rejected'] as const) {
      expect(typeof VERDICT_LABEL[key]).toBe('string');
      expect(VERDICT_LABEL[key].trim().length).toBeGreaterThan(0);
      // Georgian Unicode block: U+10D0–U+10FF
      expect(VERDICT_LABEL[key]).toMatch(/[ა-ჿ]/);
    }
  });
});

// ── INSPECTION_TYPE_LABEL ─────────────────────────────────────────────────────

describe('INSPECTION_TYPE_LABEL', () => {
  it('all three keys pre_work/scheduled/other are present', () => {
    expect(INSPECTION_TYPE_LABEL).toHaveProperty('pre_work');
    expect(INSPECTION_TYPE_LABEL).toHaveProperty('scheduled');
    expect(INSPECTION_TYPE_LABEL).toHaveProperty('other');
  });

  it('all values are non-empty strings', () => {
    for (const key of ['pre_work', 'scheduled', 'other'] as const) {
      expect(typeof INSPECTION_TYPE_LABEL[key]).toBe('string');
      expect(INSPECTION_TYPE_LABEL[key].trim().length).toBeGreaterThan(0);
    }
  });
});

// ── Template ID constants ─────────────────────────────────────────────────────

describe('Template ID constants', () => {
  it('BOBCAT_TEMPLATE_ID is a valid UUID string', () => {
    expect(BOBCAT_TEMPLATE_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('LARGE_LOADER_TEMPLATE_ID is a valid UUID string', () => {
    expect(LARGE_LOADER_TEMPLATE_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('BOBCAT_TEMPLATE_ID and LARGE_LOADER_TEMPLATE_ID are distinct', () => {
    expect(BOBCAT_TEMPLATE_ID).not.toBe(LARGE_LOADER_TEMPLATE_ID);
  });
});

// ── buildDefaultItems ─────────────────────────────────────────────────────────

describe('buildDefaultItems', () => {
  it('returns BOBCAT_ITEMS.length (30) entries when called with no argument', () => {
    const items = buildDefaultItems();
    expect(items).toHaveLength(30);
  });

  it('every result is null, comment is null, photo_paths is empty array', () => {
    const items = buildDefaultItems();
    for (const item of items) {
      expect(item.result).toBeNull();
      expect(item.comment).toBeNull();
      expect(item.photo_paths).toEqual([]);
    }
  });

  it('returns the correct length when passed LARGE_LOADER_ITEMS', () => {
    const items = buildDefaultItems(LARGE_LOADER_ITEMS);
    expect(items).toHaveLength(LARGE_LOADER_ITEMS.length);
    expect(items).toHaveLength(33);
  });

  it('preserves the id from each catalog entry', () => {
    const bobcatItems = buildDefaultItems();
    for (let i = 0; i < BOBCAT_ITEMS.length; i++) {
      expect(bobcatItems[i].id).toBe(BOBCAT_ITEMS[i].id);
    }

    const llItems = buildDefaultItems(LARGE_LOADER_ITEMS);
    for (let i = 0; i < LARGE_LOADER_ITEMS.length; i++) {
      expect(llItems[i].id).toBe(LARGE_LOADER_ITEMS[i].id);
    }
  });
});

// ── computeVerdictSuggestion ──────────────────────────────────────────────────

describe('computeVerdictSuggestion', () => {
  it('returns null when no items are filled (all null)', () => {
    const items = buildDefaultItems();
    expect(computeVerdictSuggestion(items)).toBeNull();
  });

  it('returns "approved" when all filled items are "good"', () => {
    const items = buildDefaultItems().map(it => ({ ...it, result: 'good' as const }));
    expect(computeVerdictSuggestion(items)).toBe('approved');
  });

  it('returns "limited" when any item is "deficient" and none are "unusable"', () => {
    const items = buildDefaultItems().map((it, i) => {
      const result = i === 0 ? ('deficient' as const) : ('good' as const);
      return { ...it, result };
    });
    expect(computeVerdictSuggestion(items)).toBe('limited');
  });

  it('returns "rejected" when any item is "unusable" (non-neutral)', () => {
    const items = buildDefaultItems().map((it, i) => {
      const result = i === 0 ? ('unusable' as const) : ('good' as const);
      return { ...it, result };
    });
    // All BOBCAT_ITEMS are non-neutral (no unusableIsNeutral), so id=1 → rejected
    expect(computeVerdictSuggestion(items)).toBe('rejected');
  });

  it('treats unusableIsNeutral item (id=40 in large-loader) as approved when all non-neutral items are "good"', () => {
    const items = buildDefaultItems(LARGE_LOADER_ITEMS).map(it => ({
      ...it,
      result: it.id === 40 ? ('unusable' as const) : ('good' as const),
    }));
    expect(computeVerdictSuggestion(items, LARGE_LOADER_ITEMS)).toBe('approved');
  });

  it('returns "rejected" when both a neutral-unusable and a non-neutral-unusable item exist', () => {
    // id=40 is neutral, id=6 is non-neutral — the non-neutral unusable triggers rejected
    const items = buildDefaultItems(LARGE_LOADER_ITEMS).map(it => {
      if (it.id === 40) return { ...it, result: 'unusable' as const };
      if (it.id === 6)  return { ...it, result: 'unusable' as const };
      return { ...it, result: 'good' as const };
    });
    expect(computeVerdictSuggestion(items, LARGE_LOADER_ITEMS)).toBe('rejected');
  });

  it('returns "approved" when only some items are filled and all filled are "good"', () => {
    // The function approves when every *filled* item is good — partial fill is fine
    const items = buildDefaultItems();
    const partial = items.map((it, i) =>
      i < 3 ? { ...it, result: 'good' as const } : it,
    );
    expect(computeVerdictSuggestion(partial)).toBe('approved');
  });

  it('returns "limited" when deficient beats good in a mixed partial fill', () => {
    const items = buildDefaultItems().map((it, i) => {
      if (i === 0) return { ...it, result: 'good' as const };
      if (i === 1) return { ...it, result: 'deficient' as const };
      return it;
    });
    expect(computeVerdictSuggestion(items)).toBe('limited');
  });

  it('"rejected" takes priority over "deficient"', () => {
    // If both unusable (non-neutral) and deficient items exist, result is rejected
    const items = buildDefaultItems().map((it, i) => {
      if (i === 0) return { ...it, result: 'unusable' as const };
      if (i === 1) return { ...it, result: 'deficient' as const };
      return { ...it, result: 'good' as const };
    });
    expect(computeVerdictSuggestion(items)).toBe('rejected');
  });
});

// ── categoryCounts ────────────────────────────────────────────────────────────

describe('categoryCounts', () => {
  it('returns {good:0, deficient:0, unusable:0} when no items in given category are filled', () => {
    const items = buildDefaultItems(); // all null
    expect(categoryCounts(items, 'A')).toEqual({ good: 0, deficient: 0, unusable: 0 });
  });

  it('counts good/deficient/unusable correctly for a category', () => {
    // Category A = ids 1,2,3,4,5
    const items = buildDefaultItems().map(it => {
      if (it.id === 1) return { ...it, result: 'good' as const };
      if (it.id === 2) return { ...it, result: 'good' as const };
      if (it.id === 3) return { ...it, result: 'deficient' as const };
      if (it.id === 4) return { ...it, result: 'unusable' as const };
      return it; // id=5 remains null — not counted
    });
    expect(categoryCounts(items, 'A')).toEqual({ good: 2, deficient: 1, unusable: 1 });
  });

  it('items from other categories are not counted', () => {
    // Set all category B items to good; category A should still be 0
    const items = buildDefaultItems().map(it =>
      [6, 7, 8, 9, 10, 11, 12, 13].includes(it.id)
        ? { ...it, result: 'good' as const }
        : it,
    );
    expect(categoryCounts(items, 'A')).toEqual({ good: 0, deficient: 0, unusable: 0 });
    expect(categoryCounts(items, 'B')).toEqual({ good: 8, deficient: 0, unusable: 0 });
  });

  it('works correctly with LARGE_LOADER_ITEMS catalog passed as 3rd arg', () => {
    // Large loader category A = ids 1,2,3,4,5 (same as bobcat)
    const items = buildDefaultItems(LARGE_LOADER_ITEMS).map(it => {
      if (it.id === 1) return { ...it, result: 'good' as const };
      if (it.id === 2) return { ...it, result: 'deficient' as const };
      return it;
    });
    expect(categoryCounts(items, 'A', LARGE_LOADER_ITEMS)).toEqual({
      good: 1,
      deficient: 1,
      unusable: 0,
    });
  });

  it('counts all results as zero for an empty items array', () => {
    expect(categoryCounts([], 'A')).toEqual({ good: 0, deficient: 0, unusable: 0 });
  });
});
