import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (declared FIRST, before the dynamic import) ──────────────────────
//
// The module imports expo-linking (canOpenURL + openURL), react-native
// (Platform.OS), and expo-constants (extra.signWebUrl). None are auto-mocked
// under jsdom, so we stub all three. Platform is a mutable object so tests can
// flip OS between iOS and Android.

const canOpenURL = vi.fn<(url: string) => Promise<boolean>>();
const openURL = vi.fn<(url: string) => Promise<unknown>>();

vi.mock('expo-linking', () => ({
  canOpenURL: (url: string) => canOpenURL(url),
  openURL: (url: string) => openURL(url),
}));

// Mutable Platform so we can toggle OS per-test.
const Platform = { OS: 'ios' as 'ios' | 'android' };
vi.mock('react-native', () => ({
  Platform,
}));

// expoConfig.extra.signWebUrl is undefined here so the hardcoded fallback URL
// is exercised. A separate describe re-mocks this with a custom value.
vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

const { buildSigningUrl, openSigningSMS } = await import('../../lib/sms');

const FALLBACK_BASE = 'https://gilavi.github.io/Sarke2.0';

beforeEach(() => {
  canOpenURL.mockReset();
  openURL.mockReset();
  Platform.OS = 'ios';
});

describe('buildSigningUrl', () => {
  it('builds the hash-routed sign URL against the fallback base', () => {
    expect(buildSigningUrl('abc123')).toBe(`${FALLBACK_BASE}/#/sign/abc123`);
  });

  it('embeds the token verbatim (no encoding)', () => {
    expect(buildSigningUrl('tok-with-dashes_AND_caps')).toBe(
      `${FALLBACK_BASE}/#/sign/tok-with-dashes_AND_caps`,
    );
  });

  it('handles an empty token by producing a trailing slash path', () => {
    expect(buildSigningUrl('')).toBe(`${FALLBACK_BASE}/#/sign/`);
  });
});

describe('openSigningSMS — URL construction', () => {
  it('uses "&" separator on iOS', async () => {
    canOpenURL.mockResolvedValue(true);
    openURL.mockResolvedValue(undefined);
    Platform.OS = 'ios';

    await openSigningSMS({ phone: '+995555000111', name: 'გიორგი', token: 'tok' });

    const sms = canOpenURL.mock.calls[0][0];
    expect(sms.startsWith('sms:+995555000111&body=')).toBe(true);
  });

  it('uses "?" separator on Android', async () => {
    canOpenURL.mockResolvedValue(true);
    openURL.mockResolvedValue(undefined);
    Platform.OS = 'android';

    await openSigningSMS({ phone: '+995555000111', name: 'გიორგი', token: 'tok' });

    const sms = canOpenURL.mock.calls[0][0];
    expect(sms.startsWith('sms:+995555000111?body=')).toBe(true);
  });

  it('passes the same URL to canOpenURL and openURL', async () => {
    canOpenURL.mockResolvedValue(true);
    openURL.mockResolvedValue(undefined);

    await openSigningSMS({ phone: '555', name: 'X', token: 'tok' });

    expect(canOpenURL.mock.calls[0][0]).toBe(openURL.mock.calls[0][0]);
  });

  it('percent-encodes the body so the decoded body contains name, url and expiry line', async () => {
    canOpenURL.mockResolvedValue(true);
    openURL.mockResolvedValue(undefined);

    await openSigningSMS({ phone: '555', name: 'ნინო', token: 'mytoken' });

    const sms = canOpenURL.mock.calls[0][0];
    const encoded = sms.split('body=')[1];
    const body = decodeURIComponent(encoded);

    const url = buildSigningUrl('mytoken');
    const expected =
      `ნინო, გთხოვთ ხელი მოაწეროთ სარკეს შემოწმების აქტის რეპორტს:\n` +
      `${url}\n` +
      `(ლინკი 14 დღეში იწურება)`;
    expect(body).toBe(expected);
  });

  it('embeds the signer name verbatim in the body', async () => {
    canOpenURL.mockResolvedValue(true);
    openURL.mockResolvedValue(undefined);

    await openSigningSMS({ phone: '555', name: 'Acme Co', token: 'tok' });

    const body = decodeURIComponent(canOpenURL.mock.calls[0][0].split('body=')[1]);
    expect(body.startsWith('Acme Co, ')).toBe(true);
  });

  it('includes the 14-day expiry line verbatim', async () => {
    canOpenURL.mockResolvedValue(true);
    openURL.mockResolvedValue(undefined);

    await openSigningSMS({ phone: '555', name: 'X', token: 'tok' });

    const body = decodeURIComponent(canOpenURL.mock.calls[0][0].split('body=')[1]);
    expect(body.endsWith('(ლინკი 14 დღეში იწურება)')).toBe(true);
  });

  it('includes the built signing URL on its own line in the body', async () => {
    canOpenURL.mockResolvedValue(true);
    openURL.mockResolvedValue(undefined);

    await openSigningSMS({ phone: '555', name: 'X', token: 'the-token' });

    const body = decodeURIComponent(canOpenURL.mock.calls[0][0].split('body=')[1]);
    expect(body).toContain(`\n${buildSigningUrl('the-token')}\n`);
  });

  it('actually percent-encodes — the raw sms string has no literal newline', async () => {
    canOpenURL.mockResolvedValue(true);
    openURL.mockResolvedValue(undefined);

    await openSigningSMS({ phone: '555', name: 'X', token: 'tok' });

    const sms = canOpenURL.mock.calls[0][0];
    expect(sms).not.toContain('\n');
    expect(sms).toContain('%0A'); // encoded newline present
  });
});

describe('openSigningSMS — return value & side effects', () => {
  it('returns true and calls openURL when canOpenURL resolves true', async () => {
    canOpenURL.mockResolvedValue(true);
    openURL.mockResolvedValue(undefined);

    const result = await openSigningSMS({ phone: '555', name: 'X', token: 'tok' });

    expect(result).toBe(true);
    expect(openURL).toHaveBeenCalledTimes(1);
  });

  it('returns false and does NOT call openURL when canOpenURL resolves false', async () => {
    canOpenURL.mockResolvedValue(false);

    const result = await openSigningSMS({ phone: '555', name: 'X', token: 'tok' });

    expect(result).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('returns false when canOpenURL rejects (throw path)', async () => {
    canOpenURL.mockRejectedValue(new Error('no handler'));

    const result = await openSigningSMS({ phone: '555', name: 'X', token: 'tok' });

    expect(result).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('returns false when openURL rejects after canOpenURL succeeded', async () => {
    canOpenURL.mockResolvedValue(true);
    openURL.mockRejectedValue(new Error('open failed'));

    const result = await openSigningSMS({ phone: '555', name: 'X', token: 'tok' });

    expect(result).toBe(false);
    expect(openURL).toHaveBeenCalledTimes(1);
  });

  it('does not call openURL before checking canOpenURL', async () => {
    canOpenURL.mockResolvedValue(false);

    await openSigningSMS({ phone: '555', name: 'X', token: 'tok' });

    expect(canOpenURL).toHaveBeenCalledTimes(1);
    expect(openURL).not.toHaveBeenCalled();
  });
});

describe('SIGN_WEB_URL override via expoConfig.extra.signWebUrl', () => {
  it('uses the configured signWebUrl instead of the fallback', async () => {
    vi.resetModules();

    vi.doMock('expo-linking', () => ({
      canOpenURL: (url: string) => canOpenURL(url),
      openURL: (url: string) => openURL(url),
    }));
    vi.doMock('react-native', () => ({ Platform }));
    vi.doMock('expo-constants', () => ({
      default: { expoConfig: { extra: { signWebUrl: 'https://preview.example.com' } } },
    }));

    const mod = await import('../../lib/sms');
    expect(mod.buildSigningUrl('zzz')).toBe('https://preview.example.com/#/sign/zzz');
  });

  it('falls back to the GitHub Pages URL when extra is missing entirely', async () => {
    vi.resetModules();

    vi.doMock('expo-linking', () => ({
      canOpenURL: (url: string) => canOpenURL(url),
      openURL: (url: string) => openURL(url),
    }));
    vi.doMock('react-native', () => ({ Platform }));
    vi.doMock('expo-constants', () => ({
      default: { expoConfig: {} },
    }));

    const mod = await import('../../lib/sms');
    expect(mod.buildSigningUrl('zzz')).toBe(`${FALLBACK_BASE}/#/sign/zzz`);
  });
});
