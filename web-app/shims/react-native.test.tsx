// Minimal react-native stub for Vitest's jsdom environment.
// react-native-web works in browsers but causes StyleSheet proxy errors in
// jsdom. This stub replaces every RN component with a plain HTML equivalent
// so tests can render and assert on content without the full RNW stack.
import React from 'react';

// React Native supports array style props; DOM does not. Flatten any
// array/falsy/nested style to a plain object before passing to the DOM.
function flattenStyle(style: unknown): React.CSSProperties {
  if (!style || style === true) return {};
  if (Array.isArray(style)) {
    return style.reduce<React.CSSProperties>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {});
  }
  if (typeof style === 'object') return { ...style as object } as React.CSSProperties;
  return {};
}

type RNProps = { style?: unknown; children?: React.ReactNode; [k: string]: unknown };

export const View = React.forwardRef<HTMLDivElement, RNProps>(
  ({ style, ...props }, ref) => <div {...props as object} style={flattenStyle(style)} ref={ref} />
);
View.displayName = 'View';

export const Text = React.forwardRef<HTMLSpanElement, RNProps>(
  ({ style, ...props }, ref) => <span {...props as object} style={flattenStyle(style)} ref={ref} />
);
Text.displayName = 'Text';

export const TextInput = React.forwardRef<HTMLInputElement, RNProps>(
  ({ style, ...props }, ref) => <input {...props as object} style={flattenStyle(style)} ref={ref} />
);
TextInput.displayName = 'TextInput';

export const Pressable = React.forwardRef<HTMLButtonElement, RNProps & { onPress?: () => void }>(
  ({ style, onPress, ...props }, ref) =>
    <button {...props as object} style={flattenStyle(style)} onClick={onPress} ref={ref} />
);
Pressable.displayName = 'Pressable';

export const ScrollView = React.forwardRef<HTMLDivElement, RNProps & { contentContainerStyle?: unknown }>(
  ({ style, contentContainerStyle: _ignored, ...props }, ref) =>
    <div {...props as object} style={{ overflow: 'auto', ...flattenStyle(style) }} ref={ref} />
);
ScrollView.displayName = 'ScrollView';

export const Image = React.forwardRef<HTMLImageElement, RNProps & { source?: { uri?: string } | number }>(
  ({ style, source, ...props }, ref) =>
    <img
      src={typeof source === 'object' && source !== null ? (source as { uri?: string }).uri : undefined}
      {...props as object}
      style={flattenStyle(style)}
      ref={ref}
    />
);
Image.displayName = 'Image';

export const RefreshControl = ({ children }: { children?: React.ReactNode }) =>
  <div data-testid="refresh-control">{children}</div>;

export const StyleSheet = {
  create: <T extends Record<string, object>>(styles: T): T => styles,
  flatten: (style: unknown) => style,
  compose: (s1: unknown, s2: unknown) => [s1, s2],
  hairlineWidth: 1,
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
};

export const Platform = {
  OS: 'web' as const,
  Version: 0,
  isPad: false,
  isTV: false,
  isTesting: true,
  select: function select<T>(specifics: { ios?: T; android?: T; web?: T; default?: T }): T {
    return (specifics.web ?? specifics.default) as T;
  },
};

export const Appearance = {
  getColorScheme: (): 'light' | 'dark' => 'light',
  addChangeListener: () => ({ remove: () => {} }),
  setColorScheme: () => {},
};

export const useWindowDimensions = () => ({ width: 1024, height: 768, scale: 1, fontScale: 1 });
export const useColorScheme = () => 'light' as const;

export const AccessibilityInfo = {
  isReduceMotionEnabled: () => Promise.resolve(false),
  isScreenReaderEnabled: () => Promise.resolve(false),
  isBoldTextEnabled: () => Promise.resolve(false),
  addEventListener: () => ({ remove: () => {} }),
  announceForAccessibility: () => {},
  setAccessibilityFocus: () => {},
};
