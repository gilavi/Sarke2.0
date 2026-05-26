/**
 * Helpers in lib/types/excavator.ts — buildDefaultExcavatorItems +
 * computeExcavatorVerdictSuggestion.
 */
import { describe, it, expect } from 'vitest';
import {
  buildDefaultExcavatorItems, computeExcavatorVerdictSuggestion,
  ENGINE_ITEMS,
} from '@/lib/types/excavator';

describe('buildDefaultExcavatorItems', () => {
  it('returns null-initialized arrays for every section', () => {
    const items = buildDefaultExcavatorItems();
    expect(items.engineItems.every((i) => i.result === null)).toBe(true);
    expect(items.undercarriageItems.every((i) => i.result === null)).toBe(true);
    expect(items.cabinItems.every((i) => i.result === null)).toBe(true);
    expect(items.safetyItems.every((i) => i.result === null)).toBe(true);
    expect(items.maintenanceItems.every((i) => i.answer === null && i.date === null)).toBe(true);
  });
});

describe('computeExcavatorVerdictSuggestion', () => {
  it('returns null when no items are filled', () => {
    const items = buildDefaultExcavatorItems();
    expect(computeExcavatorVerdictSuggestion(items)).toBeNull();
  });

  it('returns "rejected" when any item is unusable', () => {
    const items = buildDefaultExcavatorItems();
    items.engineItems[0] = { ...items.engineItems[0], result: 'unusable' };
    expect(computeExcavatorVerdictSuggestion(items)).toBe('rejected');
  });

  it('returns "conditional" when at least one deficient and no unusable', () => {
    const items = buildDefaultExcavatorItems();
    items.engineItems[0] = { ...items.engineItems[0], result: 'deficient' };
    expect(computeExcavatorVerdictSuggestion(items)).toBe('conditional');
  });

  it('returns "approved" when all are good', () => {
    const goodify = (entries: Array<{ id: number; result: 'good' | 'deficient' | 'unusable' | null; comment: string | null; photo_paths: string[] }>) =>
      entries.map((e) => ({ ...e, result: 'good' as const }));
    const items = buildDefaultExcavatorItems();
    items.engineItems = goodify(items.engineItems);
    items.undercarriageItems = goodify(items.undercarriageItems);
    items.cabinItems = goodify(items.cabinItems);
    items.safetyItems = goodify(items.safetyItems);
    expect(computeExcavatorVerdictSuggestion(items)).toBe('approved');
  });

  it('uses ENGINE_ITEMS catalog', () => {
    expect(ENGINE_ITEMS.length).toBeGreaterThan(0);
  });
});
