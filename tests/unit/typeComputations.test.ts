import { describe, it, expect } from 'vitest';

import {
  computeVerdictSuggestion as bobcatVerdict,
  categoryCounts,
  BOBCAT_ITEMS,
  LARGE_LOADER_ITEMS,
  buildDefaultItems,
} from '../../types/bobcat';

import {
  computeCPVerdictSuggestion,
  cpTotalWeight,
  buildDefaultCargoRow,
  buildDefaultCPItems,
} from '../../types/cargoPlatform';

import {
  computeForkliftVerdictSuggestion,
  forkliftSubcategoryCounts,
  buildDefaultForkliftItems,
} from '../../types/forklift';

import {
  computeMLVerdictSuggestion,
  buildDefaultMLItems,
} from '../../types/mobileLadder';

import {
  computeSNVerdictSuggestion,
  snTotalWeight,
  buildDefaultSNItems,
  buildDefaultSNPostTestItems,
  buildDefaultSNLoadTestRow,
} from '../../types/safetyNet';

import {
  computeFPTabState,
  computeFPVerdictSuggestion,
  renumberDevices,
  syncDeviceData,
  buildDefaultFPDeviceData,
  buildDefaultFPDeviceRow,
  buildDefaultFPCustomItem,
} from '../../types/fallProtection';

// ── bobcat ───────────────────────────────────────────────────────────────────

describe('bobcat computeVerdictSuggestion', () => {
  it('returns null when nothing filled', () => {
    expect(bobcatVerdict(buildDefaultItems(BOBCAT_ITEMS))).toBeNull();
  });

  it('returns approved when all good', () => {
    const items = buildDefaultItems(BOBCAT_ITEMS).map((it) => ({ ...it, result: 'good' as const }));
    expect(bobcatVerdict(items, BOBCAT_ITEMS)).toBe('approved');
  });

  it('returns limited on any deficient', () => {
    const items = buildDefaultItems(BOBCAT_ITEMS).map((it, i) =>
      i === 0 ? { ...it, result: 'deficient' as const } : { ...it, result: 'good' as const },
    );
    expect(bobcatVerdict(items, BOBCAT_ITEMS)).toBe('limited');
  });

  it('returns rejected on any non-neutral unusable', () => {
    const items = buildDefaultItems(BOBCAT_ITEMS).map((it, i) =>
      i === 0 ? { ...it, result: 'unusable' as const } : { ...it, result: 'good' as const },
    );
    expect(bobcatVerdict(items, BOBCAT_ITEMS)).toBe('rejected');
  });

  it('uses LARGE_LOADER_ITEMS catalog when supplied', () => {
    const items = buildDefaultItems(LARGE_LOADER_ITEMS).map((it) => ({ ...it, result: 'good' as const }));
    expect(bobcatVerdict(items, LARGE_LOADER_ITEMS)).toBe('approved');
  });
});

describe('bobcat categoryCounts', () => {
  it('counts items in category A only', () => {
    const items = buildDefaultItems(BOBCAT_ITEMS).map((it) => ({ ...it, result: 'good' as const }));
    const counts = categoryCounts(items, 'A', BOBCAT_ITEMS);
    expect(counts.good).toBeGreaterThan(0);
    expect(counts.deficient).toBe(0);
    expect(counts.unusable).toBe(0);
  });

  it('returns zero counts for empty items', () => {
    expect(categoryCounts([], 'A', BOBCAT_ITEMS)).toEqual({ good: 0, deficient: 0, unusable: 0 });
  });
});

// ── cargoPlatform ────────────────────────────────────────────────────────────

describe('cargoPlatform computeCPVerdictSuggestion', () => {
  it('returns null when nothing filled', () => {
    expect(computeCPVerdictSuggestion(buildDefaultCPItems())).toBeNull();
  });

  it('returns conditional on any fix', () => {
    const items = buildDefaultCPItems().map((it, i) =>
      i === 0 ? { ...it, result: 'fix' as const } : { ...it, result: 'good' as const },
    );
    expect(computeCPVerdictSuggestion(items)).toBe('conditional');
  });

  it('returns approved if every filled is good or na', () => {
    const items = buildDefaultCPItems().map((it, i) =>
      i % 2 === 0 ? { ...it, result: 'good' as const } : { ...it, result: 'na' as const },
    );
    expect(computeCPVerdictSuggestion(items)).toBe('approved');
  });
});

describe('cargoPlatform cpTotalWeight', () => {
  it('sums total_weight_kg, ignoring nulls', () => {
    const rows = [
      { ...buildDefaultCargoRow(), total_weight_kg: 500 },
      { ...buildDefaultCargoRow(), total_weight_kg: 300 },
      { ...buildDefaultCargoRow(), total_weight_kg: null },
    ];
    expect(cpTotalWeight(rows)).toBe(800);
  });

  it('returns 0 for empty cargo', () => {
    expect(cpTotalWeight([])).toBe(0);
  });
});

// ── forklift ─────────────────────────────────────────────────────────────────

describe('forklift computeForkliftVerdictSuggestion', () => {
  it('returns null when nothing filled', () => {
    expect(computeForkliftVerdictSuggestion(buildDefaultForkliftItems())).toBeNull();
  });

  it('returns rejected on unusable', () => {
    const items = buildDefaultForkliftItems().map((it, i) =>
      i === 0 ? { ...it, result: 'unusable' as const } : { ...it, result: 'good' as const },
    );
    expect(computeForkliftVerdictSuggestion(items)).toBe('rejected');
  });

  it('returns limited on deficient', () => {
    const items = buildDefaultForkliftItems().map((it, i) =>
      i === 0 ? { ...it, result: 'deficient' as const } : { ...it, result: 'good' as const },
    );
    expect(computeForkliftVerdictSuggestion(items)).toBe('limited');
  });

  it('returns approved if every filled is good', () => {
    const items = buildDefaultForkliftItems().map((it) => ({ ...it, result: 'good' as const }));
    expect(computeForkliftVerdictSuggestion(items)).toBe('approved');
  });
});

describe('forklift forkliftSubcategoryCounts', () => {
  it('counts subset by ids', () => {
    const items = buildDefaultForkliftItems().map((it) => ({ ...it, result: 'good' as const }));
    const counts = forkliftSubcategoryCounts(items, [1, 2, 3]);
    expect(counts.good).toBe(3);
    expect(counts.deficient).toBe(0);
    expect(counts.unusable).toBe(0);
  });

  it('returns zeros for empty ids', () => {
    expect(forkliftSubcategoryCounts([], [])).toEqual({ good: 0, deficient: 0, unusable: 0 });
  });
});

// ── mobileLadder ─────────────────────────────────────────────────────────────

describe('mobileLadder computeMLVerdictSuggestion', () => {
  it('returns null when nothing filled', () => {
    expect(computeMLVerdictSuggestion(buildDefaultMLItems())).toBeNull();
  });

  it('returns banned on damaged', () => {
    const items = buildDefaultMLItems().map((it, i) =>
      i === 0 ? { ...it, result: 'damaged' as const } : { ...it, result: 'safe' as const },
    );
    expect(computeMLVerdictSuggestion(items)).toBe('banned');
  });

  it('returns safe when all filled non-damaged', () => {
    const items = buildDefaultMLItems().map((it) => ({ ...it, result: 'safe' as const }));
    expect(computeMLVerdictSuggestion(items)).toBe('safe');
  });
});

// ── safetyNet ────────────────────────────────────────────────────────────────

describe('safetyNet computeSNVerdictSuggestion', () => {
  it('returns null when nothing filled', () => {
    expect(computeSNVerdictSuggestion(buildDefaultSNItems(), buildDefaultSNPostTestItems())).toBeNull();
  });

  it('returns fail if any item is fix', () => {
    const items = buildDefaultSNItems().map((it, i) =>
      i === 0 ? { ...it, result: 'fix' as const } : { ...it, result: 'ok' as const },
    );
    expect(computeSNVerdictSuggestion(items, buildDefaultSNPostTestItems())).toBe('fail');
  });

  it('returns fail if any post-test is fail', () => {
    const post = buildDefaultSNPostTestItems().map((it, i) =>
      i === 0 ? { ...it, result: 'fail' as const } : { ...it, result: 'pass' as const },
    );
    expect(computeSNVerdictSuggestion(buildDefaultSNItems(), post)).toBe('fail');
  });

  it('returns pass when items filled and no failures', () => {
    const items = buildDefaultSNItems().map((it) => ({ ...it, result: 'ok' as const }));
    expect(computeSNVerdictSuggestion(items, buildDefaultSNPostTestItems())).toBe('pass');
  });
});

describe('safetyNet snTotalWeight', () => {
  it('sums totalWeightKg, ignoring nulls', () => {
    const rows = [
      { ...buildDefaultSNLoadTestRow(), totalWeightKg: 500 },
      { ...buildDefaultSNLoadTestRow(), totalWeightKg: 300 },
      { ...buildDefaultSNLoadTestRow(), totalWeightKg: null },
    ];
    expect(snTotalWeight(rows)).toBe(800);
  });

  it('returns 0 for empty array', () => {
    expect(snTotalWeight([])).toBe(0);
  });
});

// ── fallProtection ───────────────────────────────────────────────────────────

describe('fallProtection renumberDevices', () => {
  it('renumbers devices as N1, N2, …', () => {
    const devices = [
      { ...buildDefaultFPDeviceRow(99), id: 'N99' },
      { ...buildDefaultFPDeviceRow(50) },
      { ...buildDefaultFPDeviceRow(0) },
    ];
    const out = renumberDevices(devices);
    expect(out.map((d) => d.id)).toEqual(['N1', 'N2', 'N3']);
  });

  it('returns empty array for empty input', () => {
    expect(renumberDevices([])).toEqual([]);
  });
});

describe('fallProtection syncDeviceData', () => {
  it('preserves existing data for surviving rows', () => {
    const oldData = [buildDefaultFPDeviceData('N1'), buildDefaultFPDeviceData('N2')];
    oldData[0].verdictComment = 'preserved';
    const newDevices = [buildDefaultFPDeviceRow(0)]; // only one device remains
    const out = syncDeviceData(newDevices, oldData);
    expect(out).toHaveLength(1);
    expect(out[0].verdictComment).toBe('preserved');
    expect(out[0].deviceId).toBe(newDevices[0].id);
  });

  it('adds defaults for new rows', () => {
    const oldData: any[] = [];
    const newDevices = [buildDefaultFPDeviceRow(0), buildDefaultFPDeviceRow(1)];
    const out = syncDeviceData(newDevices, oldData);
    expect(out).toHaveLength(2);
    expect(out[0].verdict).toBeNull();
  });
});

describe('fallProtection computeFPVerdictSuggestion', () => {
  function dataWithItems(itemResults: Array<'safe' | 'critical' | 'minor' | 'na' | null>) {
    const base = buildDefaultFPDeviceData('N1');
    base.items = itemResults.map((r, i) => ({ id: i + 1, result: r, comment: null, photo_paths: [] }));
    return base;
  }

  it('returns null when nothing filled', () => {
    const data = dataWithItems([null, null, null]);
    data.customItem = buildDefaultFPCustomItem();
    expect(computeFPVerdictSuggestion(data)).toBeNull();
  });

  it('returns banned on critical', () => {
    const data = dataWithItems(['critical', 'safe', null]);
    expect(computeFPVerdictSuggestion(data)).toBe('banned');
  });

  it('returns minor on minor', () => {
    const data = dataWithItems(['minor', 'safe', null]);
    expect(computeFPVerdictSuggestion(data)).toBe('minor');
  });

  it('returns safe when filled and no critical/minor', () => {
    const data = dataWithItems(['safe', 'safe', 'na']);
    expect(computeFPVerdictSuggestion(data)).toBe('safe');
  });
});

describe('fallProtection computeFPTabState', () => {
  it('returns pending when empty and no verdict', () => {
    const data = buildDefaultFPDeviceData('N1');
    expect(computeFPTabState(data)).toBe('pending');
  });

  it('returns done when verdict set', () => {
    const data = buildDefaultFPDeviceData('N1');
    data.verdict = 'safe';
    expect(computeFPTabState(data)).toBe('done');
  });

  it('returns problem on a critical item', () => {
    const data = buildDefaultFPDeviceData('N1');
    data.items[0] = { id: 1, result: 'critical', comment: null, photo_paths: [] };
    expect(computeFPTabState(data)).toBe('problem');
  });

  it('returns warning on a minor item', () => {
    const data = buildDefaultFPDeviceData('N1');
    data.items[0] = { id: 1, result: 'minor', comment: null, photo_paths: [] };
    expect(computeFPTabState(data)).toBe('warning');
  });

  it('returns active for filled item with no issues', () => {
    const data = buildDefaultFPDeviceData('N1');
    data.items[0] = { id: 1, result: 'safe', comment: null, photo_paths: [] };
    expect(computeFPTabState(data)).toBe('active');
  });
});
