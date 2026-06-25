/**
 * Regression guard for the app theme default (lib/ThemeContext.tsx).
 *
 * The app must default to LIGHT (toggle OFF) unless the user explicitly stored a
 * dark preference. This was repeatedly reported as "won't switch to light":
 * changing only the initial useState didn't help because `resolveMode` (run by
 * the post-mount AsyncStorage effect) still returned 'dark' for the no-pref
 * case. Lock the resolver here.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));

import { resolveMode } from '../../lib/ThemeContext';

describe('resolveMode — theme default', () => {
  it('defaults to light when nothing is stored', () => {
    expect(resolveMode(null)).toBe('light');
  });

  it('returns dark only when explicitly stored as "true"', () => {
    expect(resolveMode('true')).toBe('dark');
  });

  it('returns light when explicitly stored as "false"', () => {
    expect(resolveMode('false')).toBe('light');
  });

  it('treats any unrecognized value as the light default', () => {
    expect(resolveMode('garbage')).toBe('light');
    expect(resolveMode('')).toBe('light');
  });
});
