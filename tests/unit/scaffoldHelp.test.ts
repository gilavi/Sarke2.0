import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock QuestionAvatar so the test never drags in react-native-svg + the
// illustration palette/native graph. We only need illustrationKeyFor, whose
// return value we drive per-test via the mock.
const illustrationKeyForMock = vi.fn();

vi.mock('../../components/QuestionAvatar', () => ({
  illustrationKeyFor: illustrationKeyForMock,
}));

const {
  helpForRow,
  SCAFFOLD_HELP,
  SECTION1_HELP,
  TOUR_SEEN_KEY,
} = await import('../../lib/scaffoldHelp');

// The exact fallback shape from the source (HARNESS_FALLBACK), minus name.
const FALLBACK_ONE_LINER =
  'შეამოწმეთ კომპონენტის მთლიანობა და მექანიკური დაზიანებები.';

beforeEach(() => {
  illustrationKeyForMock.mockReset();
});

describe('SCAFFOLD_HELP', () => {
  it('has exactly 9 entries', () => {
    expect(SCAFFOLD_HELP).toHaveLength(9);
  });

  it('lists the 9 scaffold component keys in order', () => {
    expect(SCAFFOLD_HELP.map((e) => e.key)).toEqual([
      'jack',
      'basePlate',
      'vertFrame',
      'hatchPlatform',
      'toeBoard',
      'topMidRail',
      'sideRail',
      'ladder',
      'anchor',
    ]);
  });

  it('every entry has a non-empty name and oneLiner', () => {
    for (const e of SCAFFOLD_HELP) {
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.oneLiner.length).toBeGreaterThan(0);
    }
  });

  it('exposes the jack entry verbatim', () => {
    const jack = SCAFFOLD_HELP.find((e) => e.key === 'jack');
    expect(jack).toEqual({
      key: 'jack',
      name: 'რეგულირებადი დომკრატი',
      oneLiner: 'შეამოწმეთ, რომ ხრახნი არ არის გადახრილი ან დაზიანებული.',
    });
  });

  it('exposes the anchor entry verbatim', () => {
    const anchor = SCAFFOLD_HELP.find((e) => e.key === 'anchor');
    expect(anchor).toEqual({
      key: 'anchor',
      name: 'ანკერული გამაგრება',
      oneLiner: 'გამაგრება უძრავად დამაგრებულია კედელზე/კონსტრუქციაზე.',
    });
  });
});

describe('SECTION1_HELP', () => {
  it('has exactly 5 entries', () => {
    expect(SECTION1_HELP).toHaveLength(5);
  });

  it('lists the 5 section-1 keys in order', () => {
    expect(SECTION1_HELP.map((e) => e.key)).toEqual([
      'passport',
      'certificate',
      'levelSurface',
      'distance25',
      'improvisedLadder',
    ]);
  });

  it('exposes the passport entry verbatim', () => {
    const passport = SECTION1_HELP.find((e) => e.key === 'passport');
    expect(passport).toEqual({
      key: 'passport',
      name: 'ხარაჩოს პასპორტი',
      oneLiner: 'შეამოწმეთ, რომ პასპორტი გაცემულია და მოქმედია.',
    });
  });

  it('exposes the improvisedLadder entry verbatim', () => {
    const ladder = SECTION1_HELP.find((e) => e.key === 'improvisedLadder');
    expect(ladder).toEqual({
      key: 'improvisedLadder',
      name: 'კუსტარული/თვითნაკეთი კიბე',
      oneLiner: 'არ გამოიყენოთ კუსტარული ან თვითნაკეთი კიბე.',
    });
  });
});

describe('combined key uniqueness', () => {
  it('every key across both lists is unique (14 total)', () => {
    const keys = [...SCAFFOLD_HELP, ...SECTION1_HELP].map((e) => e.key);
    expect(keys).toHaveLength(14);
    expect(new Set(keys).size).toBe(14);
  });

  it('SCAFFOLD_HELP and SECTION1_HELP key sets do not overlap', () => {
    const a = new Set(SCAFFOLD_HELP.map((e) => e.key));
    const b = new Set(SECTION1_HELP.map((e) => e.key));
    for (const k of b) expect(a.has(k)).toBe(false);
  });
});

describe('TOUR_SEEN_KEY', () => {
  it('is the exact storage key string', () => {
    expect(TOUR_SEEN_KEY).toBe('haraco_tour_seen');
  });
});

describe('helpForRow', () => {
  it('passes the rowLabel through to illustrationKeyFor', () => {
    illustrationKeyForMock.mockReturnValue('jack');
    helpForRow('some row label');
    expect(illustrationKeyForMock).toHaveBeenCalledTimes(1);
    expect(illustrationKeyForMock).toHaveBeenCalledWith('some row label');
  });

  it('returns the matching SCAFFOLD_HELP entry when key resolves to "jack"', () => {
    illustrationKeyForMock.mockReturnValue('jack');
    const result = helpForRow('დომკრატის რიგი');
    expect(result).toEqual({
      key: 'jack',
      name: 'რეგულირებადი დომკრატი',
      oneLiner: 'შეამოწმეთ, რომ ხრახნი არ არის გადახრილი ან დაზიანებული.',
    });
  });

  it('returns the matching SECTION1_HELP entry when key resolves to "passport"', () => {
    illustrationKeyForMock.mockReturnValue('passport');
    const result = helpForRow('პასპორტის რიგი');
    expect(result).toEqual({
      key: 'passport',
      name: 'ხარაჩოს პასპორტი',
      oneLiner: 'შეამოწმეთ, რომ პასპორტი გაცემულია და მოქმედია.',
    });
  });

  it('returns the matching entry for another scaffold key ("anchor")', () => {
    illustrationKeyForMock.mockReturnValue('anchor');
    const result = helpForRow('ანკერი');
    expect(result.key).toBe('anchor');
    expect(result.name).toBe('ანკერული გამაგრება');
    expect(result.oneLiner).toBe('გამაგრება უძრავად დამაგრებულია კედელზე/კონსტრუქციაზე.');
  });

  it('returns the SAME object reference from BY_KEY on a hit', () => {
    illustrationKeyForMock.mockReturnValue('jack');
    const result = helpForRow('x');
    const expected = SCAFFOLD_HELP.find((e) => e.key === 'jack');
    expect(result).toBe(expected);
  });

  it('falls back with name = rowLabel when illustrationKeyFor returns null', () => {
    illustrationKeyForMock.mockReturnValue(null);
    const result = helpForRow('ღვედის რიგი');
    expect(result).toEqual({
      key: 'certificate',
      name: 'ღვედის რიგი',
      oneLiner: FALLBACK_ONE_LINER,
    });
  });

  it('falls back with name = rowLabel when illustrationKeyFor returns undefined', () => {
    illustrationKeyForMock.mockReturnValue(undefined);
    const result = helpForRow('სხვა რიგი');
    expect(result).toEqual({
      key: 'certificate',
      name: 'სხვა რიგი',
      oneLiner: FALLBACK_ONE_LINER,
    });
  });

  it('falls back with name = "" when rowLabel is null and key is null', () => {
    illustrationKeyForMock.mockReturnValue(null);
    const result = helpForRow(null);
    expect(result).toEqual({
      key: 'certificate',
      name: '',
      oneLiner: FALLBACK_ONE_LINER,
    });
  });

  it('falls back with name = "" when rowLabel is undefined and key is null', () => {
    illustrationKeyForMock.mockReturnValue(null);
    const result = helpForRow(undefined);
    expect(result).toEqual({
      key: 'certificate',
      name: '',
      oneLiner: FALLBACK_ONE_LINER,
    });
  });

  it('falls back when illustrationKeyFor returns a key NOT present in BY_KEY ("photo")', () => {
    // 'photo' is a valid IllustrationKey but has no help entry, so BY_KEY misses it.
    illustrationKeyForMock.mockReturnValue('photo');
    const result = helpForRow('ფოტოს რიგი');
    expect(result).toEqual({
      key: 'certificate',
      name: 'ფოტოს რიგი',
      oneLiner: FALLBACK_ONE_LINER,
    });
  });

  it('falls back when illustrationKeyFor returns "conclusion" (also absent from BY_KEY)', () => {
    illustrationKeyForMock.mockReturnValue('conclusion');
    const result = helpForRow('დასკვნა');
    expect(result.key).toBe('certificate');
    expect(result.name).toBe('დასკვნა');
    expect(result.oneLiner).toBe(FALLBACK_ONE_LINER);
  });

  it('falls back when illustrationKeyFor returns a totally unknown key', () => {
    illustrationKeyForMock.mockReturnValue('not-a-real-key' as never);
    const result = helpForRow('მონაცემი');
    expect(result.key).toBe('certificate');
    expect(result.name).toBe('მონაცემი');
  });

  it('returns a FRESH object (not the shared HARNESS_FALLBACK) on the fallback path', () => {
    illustrationKeyForMock.mockReturnValue(null);
    const a = helpForRow('A');
    const b = helpForRow('B');
    // distinct objects, distinct names — confirms the spread copy, not a shared ref
    expect(a).not.toBe(b);
    expect(a.name).toBe('A');
    expect(b.name).toBe('B');
  });

  it('preserves an empty-string rowLabel verbatim on the fallback path', () => {
    illustrationKeyForMock.mockReturnValue(null);
    const result = helpForRow('');
    // '' ?? '' === '' — the nullish-coalescing keeps the empty string
    expect(result.name).toBe('');
    expect(result.key).toBe('certificate');
  });
});
