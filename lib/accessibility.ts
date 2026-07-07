import { AccessibilityInfo, useWindowDimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';

export function useAccessibilitySettings() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [boldText, setBoldText] = useState(false);
  const { fontScale } = useWindowDimensions();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
    AccessibilityInfo.isScreenReaderEnabled?.().then(setScreenReaderEnabled).catch(() => {});
    // isBoldTextEnabled is iOS-only - guard so web/Android don't crash.
    AccessibilityInfo.isBoldTextEnabled?.().then(setBoldText).catch(() => {});

    const subs: any[] = [];
    try { subs.push(AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)); } catch {}
    try { subs.push(AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderEnabled)); } catch {}
    try { subs.push(AccessibilityInfo.addEventListener('boldTextChanged', setBoldText)); } catch {}

    return () => subs.forEach((s) => s?.remove?.());
  }, []);

  return {
    reduceMotion,
    screenReaderEnabled,
    boldText,
    fontScale: Math.min(fontScale, 1.5),
    isAccessibilityEnabled: screenReaderEnabled || fontScale > 1.2 || boldText,
  };
}

/**
 * Scale a NON-TEXT dimension (icon box, min tap target) by the OS font scale,
 * capped at 1.5×.
 *
 * NEVER use this for a <Text> fontSize: RN already multiplies fontSize by
 * fontScale natively, so pre-scaling double-applies Dynamic Type (fontScale²).
 * For text, rely on `maxFontSizeMultiplier={1.5}` instead — see
 * components/primitives/A11yText.tsx.
 */
export function useScaledSize(baseSize: number): number {
  const { fontScale } = useWindowDimensions();
  return baseSize * Math.min(fontScale, 1.5);
}

export function a11y(
  label: string,
  hint?: string,
  role?: string,
  state?: Record<string, boolean | 'mixed' | 'none' | 'polite' | 'assertive'>
) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role as any,
    accessibilityState: state,
  };
}

export function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}
