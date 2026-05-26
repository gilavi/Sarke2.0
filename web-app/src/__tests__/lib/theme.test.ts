import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/lib/theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('ThemeProvider / useTheme', () => {
  it('defaults to light mode', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.mode).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('toggles to dark, adds the dark class, and persists the choice', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.toggleMode());
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('sarke-theme')).toBe('dark');
  });

  it('setMode switches mode explicitly and clears the dark class', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.setMode('dark'));
    expect(result.current.mode).toBe('dark');
    act(() => result.current.setMode('light'));
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reads the initial mode from localStorage', () => {
    localStorage.setItem('sarke-theme', 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.mode).toBe('dark');
  });
});
