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
    // isBoldTextEnabled is iOS-only — guard so web/Android don't crash.
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
