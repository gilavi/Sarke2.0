import { describe, it, expect, vi, beforeEach } from 'vitest';

// geocode.ts hits the public Nominatim HTTP API over the global `fetch`. We
// stub `fetch` so no network traffic happens and we can assert on the exact URL
// built + the parsed result. The only other import in the module is a
// `import type { LatLng } from '../components/MapPicker'`, which is erased at
// compile time — nothing to mock there.
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const { forwardGeocode, reverseGeocode, coordsLabel } = await import('../../lib/geocode');

const CONTACT_EMAIL = 'support@hubble.ge';

/** Build a fake `Response`-ish object for fetchMock to resolve with. */
function makeRes(ok: boolean, json: unknown) {
  return {
    ok,
    json: vi.fn(async () => json),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('forwardGeocode', () => {
  it('returns null and does NOT call fetch for an empty query', async () => {
    const result = await forwardGeocode('');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null and does NOT call fetch for a whitespace-only query', async () => {
    const result = await forwardGeocode('   \t  \n ');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds a Nominatim /search URL with the expected query parameters', async () => {
    fetchMock.mockResolvedValue(
      makeRes(true, [{ lat: '41.7', lon: '44.8', display_name: 'Tbilisi' }]),
    );
    await forwardGeocode('Tbilisi');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('https://nominatim.openstreetmap.org/search?');
    expect(url).toContain('format=json');
    expect(url).toContain('limit=1');
    expect(url).toContain('addressdetails=0');
    expect(url).toContain('countrycodes=ge');
    expect(url).toContain('accept-language=ka');
    expect(url).toContain(`email=${encodeURIComponent(CONTACT_EMAIL)}`);
    expect(url).toContain('q=Tbilisi');
    // The request identifies itself as wanting JSON.
    expect(opts).toEqual({ signal: undefined, headers: { Accept: 'application/json' } });
  });

  it('URL-encodes the query text (spaces, non-ASCII)', async () => {
    fetchMock.mockResolvedValue(
      makeRes(true, [{ lat: '41.7', lon: '44.8', display_name: 'X' }]),
    );
    const raw = 'რუსთაველის გამზირი 5';
    await forwardGeocode(raw);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(`q=${encodeURIComponent(raw)}`);
    // Trimmed value is encoded — no literal spaces leak into the URL.
    expect(url).not.toContain(' ');
  });

  it('trims the query before encoding it', async () => {
    fetchMock.mockResolvedValue(
      makeRes(true, [{ lat: '41.7', lon: '44.8', display_name: 'X' }]),
    );
    await forwardGeocode('  Batumi  ');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('q=Batumi');
    expect(url).not.toContain('q=%20%20Batumi');
  });

  it('passes the AbortSignal through to fetch', async () => {
    fetchMock.mockResolvedValue(
      makeRes(true, [{ lat: '41.7', lon: '44.8', display_name: 'X' }]),
    );
    const controller = new AbortController();
    await forwardGeocode('Tbilisi', controller.signal);
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.signal).toBe(controller.signal);
  });

  it('returns {latitude, longitude, displayName} from the first hit', async () => {
    fetchMock.mockResolvedValue(
      makeRes(true, [
        { lat: '41.71510', lon: '44.82710', display_name: 'Tbilisi, Georgia' },
        { lat: '0', lon: '0', display_name: 'second hit ignored' },
      ]),
    );
    const result = await forwardGeocode('Tbilisi');
    expect(result).toEqual({
      latitude: 41.7151,
      longitude: 44.8271,
      displayName: 'Tbilisi, Georgia',
    });
  });

  it('falls back to the query string when display_name is missing', async () => {
    fetchMock.mockResolvedValue(
      makeRes(true, [{ lat: '41.7', lon: '44.8' }]),
    );
    const result = await forwardGeocode('  Kutaisi  ');
    // Falls back to the *trimmed* query.
    expect(result).toEqual({ latitude: 41.7, longitude: 44.8, displayName: 'Kutaisi' });
  });

  it('falls back to the query string when display_name is null', async () => {
    fetchMock.mockResolvedValue(
      makeRes(true, [{ lat: '41.7', lon: '44.8', display_name: null }]),
    );
    const result = await forwardGeocode('Rustavi');
    expect(result?.displayName).toBe('Rustavi');
  });

  it('returns null when the response is not ok', async () => {
    fetchMock.mockResolvedValue(makeRes(false, [{ lat: '41.7', lon: '44.8', display_name: 'X' }]));
    const result = await forwardGeocode('Tbilisi');
    expect(result).toBeNull();
  });

  it('returns null when the result array is empty', async () => {
    fetchMock.mockResolvedValue(makeRes(true, []));
    const result = await forwardGeocode('NowhereLand');
    expect(result).toBeNull();
  });

  it('returns null when the parsed body is null', async () => {
    fetchMock.mockResolvedValue(makeRes(true, null));
    const result = await forwardGeocode('Tbilisi');
    expect(result).toBeNull();
  });

  it('returns null when latitude is non-finite', async () => {
    fetchMock.mockResolvedValue(
      makeRes(true, [{ lat: 'not-a-number', lon: '44.8', display_name: 'X' }]),
    );
    const result = await forwardGeocode('Tbilisi');
    expect(result).toBeNull();
  });

  it('returns null when longitude is non-finite', async () => {
    fetchMock.mockResolvedValue(
      makeRes(true, [{ lat: '41.7', lon: 'garbage', display_name: 'X' }]),
    );
    const result = await forwardGeocode('Tbilisi');
    expect(result).toBeNull();
  });

  it('returns null when fetch rejects (network error / abort)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await forwardGeocode('Tbilisi');
    expect(result).toBeNull();
  });

  it('returns null when res.json() throws', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn(async () => {
        throw new Error('bad json');
      }),
    });
    const result = await forwardGeocode('Tbilisi');
    expect(result).toBeNull();
  });
});

describe('reverseGeocode', () => {
  it('builds a Nominatim /reverse URL with lat/lon and expected params', async () => {
    fetchMock.mockResolvedValue(makeRes(true, { display_name: 'Some Street' }));
    await reverseGeocode(41.7151, 44.8271);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('https://nominatim.openstreetmap.org/reverse?');
    expect(url).toContain('format=json');
    expect(url).toContain('accept-language=ka');
    expect(url).toContain(`email=${encodeURIComponent(CONTACT_EMAIL)}`);
    expect(url).toContain('lat=41.7151');
    expect(url).toContain('lon=44.8271');
    expect(opts).toEqual({ signal: undefined, headers: { Accept: 'application/json' } });
  });

  it('passes the AbortSignal through to fetch', async () => {
    fetchMock.mockResolvedValue(makeRes(true, { display_name: 'X' }));
    const controller = new AbortController();
    await reverseGeocode(41.7, 44.8, controller.signal);
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.signal).toBe(controller.signal);
  });

  it('returns the display_name from the parsed body', async () => {
    fetchMock.mockResolvedValue(makeRes(true, { display_name: 'რუსთაველის გამზირი, თბილისი' }));
    const result = await reverseGeocode(41.7, 44.8);
    expect(result).toBe('რუსთაველის გამზირი, თბილისი');
  });

  it('returns null when the response is not ok', async () => {
    fetchMock.mockResolvedValue(makeRes(false, { display_name: 'X' }));
    const result = await reverseGeocode(41.7, 44.8);
    expect(result).toBeNull();
  });

  it('returns null when display_name is missing from the body', async () => {
    fetchMock.mockResolvedValue(makeRes(true, {}));
    const result = await reverseGeocode(41.7, 44.8);
    expect(result).toBeNull();
  });

  it('returns null when the parsed body is null', async () => {
    fetchMock.mockResolvedValue(makeRes(true, null));
    const result = await reverseGeocode(41.7, 44.8);
    expect(result).toBeNull();
  });

  it('returns null when fetch rejects (network error / abort)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await reverseGeocode(41.7, 44.8);
    expect(result).toBeNull();
  });

  it('returns null when res.json() throws', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn(async () => {
        throw new Error('bad json');
      }),
    });
    const result = await reverseGeocode(41.7, 44.8);
    expect(result).toBeNull();
  });
});

describe('coordsLabel', () => {
  it('formats both coordinates to 5 decimal places joined by ", "', () => {
    expect(coordsLabel({ latitude: 41.7151, longitude: 44.8271 })).toBe('41.71510, 44.82710');
  });

  it('rounds to 5 decimals via toFixed', () => {
    expect(coordsLabel({ latitude: 41.123456789, longitude: 44.987654321 })).toBe(
      '41.12346, 44.98765',
    );
  });

  it('pads integers and handles negatives', () => {
    expect(coordsLabel({ latitude: -1, longitude: 0 })).toBe('-1.00000, 0.00000');
  });
});
