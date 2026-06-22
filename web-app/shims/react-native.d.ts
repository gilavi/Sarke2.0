/**
 * Type shim for 'react-native' in the web-app TypeScript context.
 *
 * Vite aliases react-native → react-native-web at build time, so the runtime
 * behaviour is correct. This file exists solely so tsc can resolve types when
 * checking the shared ../components/primitives + ../lib code in CI, where the
 * root node_modules (which contain react-native's bundled types) are not
 * installed.
 *
 * Only the symbols actually imported by the shared primitives are declared here.
 * Add more as needed, but keep it minimal to avoid drift with the real package.
 */
import type React from 'react';

declare module 'react-native' {
  // ── Style types ────────────────────────────────────────────────────────────
  type ColorValue = string | null | undefined;
  type DimensionValue = number | string | null | undefined;

  interface FlexStyle {
    flex?: number;
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    flexWrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    padding?: DimensionValue;
    paddingTop?: DimensionValue;
    paddingBottom?: DimensionValue;
    paddingLeft?: DimensionValue;
    paddingRight?: DimensionValue;
    paddingHorizontal?: DimensionValue;
    paddingVertical?: DimensionValue;
    margin?: DimensionValue;
    marginTop?: DimensionValue;
    marginBottom?: DimensionValue;
    marginLeft?: DimensionValue;
    marginRight?: DimensionValue;
    marginHorizontal?: DimensionValue;
    marginVertical?: DimensionValue;
    width?: DimensionValue;
    height?: DimensionValue;
    minWidth?: DimensionValue;
    minHeight?: DimensionValue;
    maxWidth?: DimensionValue;
    maxHeight?: DimensionValue;
    position?: 'absolute' | 'relative';
    top?: DimensionValue;
    bottom?: DimensionValue;
    left?: DimensionValue;
    right?: DimensionValue;
    zIndex?: number;
    overflow?: 'visible' | 'hidden' | 'scroll';
    gap?: number;
    rowGap?: number;
    columnGap?: number;
    aspectRatio?: number;
  }

  interface ShadowStyle {
    shadowColor?: ColorValue;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
    elevation?: number;
  }

  type TransformValue =
    | { perspective: number }
    | { rotate: string }
    | { rotateX: string }
    | { rotateY: string }
    | { rotateZ: string }
    | { scale: number }
    | { scaleX: number }
    | { scaleY: number }
    | { translateX: number }
    | { translateY: number }
    | { skewX: string }
    | { skewY: string };

  interface TransformStyle {
    // Accept both the RN array-of-objects format and the CSS string format
    // (react-native-reanimated's AnimateStyle resolves to CSS types on web).
    transform?: TransformValue[] | string | any;
  }

  export interface ViewStyle extends FlexStyle, ShadowStyle, TransformStyle {
    // CSS shorthand not in RN but used in web-app src:
    inset?: DimensionValue;
    backgroundColor?: ColorValue;
    borderColor?: ColorValue;
    borderTopColor?: ColorValue;
    borderBottomColor?: ColorValue;
    borderLeftColor?: ColorValue;
    borderRightColor?: ColorValue;
    borderWidth?: number;
    borderTopWidth?: number;
    borderBottomWidth?: number;
    borderLeftWidth?: number;
    borderRightWidth?: number;
    borderRadius?: number;
    borderTopLeftRadius?: number;
    borderTopRightRadius?: number;
    borderBottomLeftRadius?: number;
    borderBottomRightRadius?: number;
    opacity?: number;
    display?: 'flex' | 'none';
    cursor?: string;
    pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  }

  export interface TextStyle extends ViewStyle {
    color?: ColorValue;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    fontFamily?: string;
    fontStyle?: 'normal' | 'italic';
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
    textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through';
    textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
    includeFontPadding?: boolean;
  }

  export interface ImageStyle extends FlexStyle, ShadowStyle, TransformStyle {
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    tintColor?: ColorValue;
    overlayColor?: ColorValue;
    opacity?: number;
    backgroundColor?: ColorValue;
    borderRadius?: number;
  }

  export type StyleProp<T> = T | null | undefined | false | StyleProp<T>[] | readonly StyleProp<T>[];

  // ── StyleSheet ─────────────────────────────────────────────────────────────
  export const StyleSheet: {
    create<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(styles: T): T;
    flatten<T>(style: StyleProp<T>): T;
    compose<T>(s1: StyleProp<T>, s2: StyleProp<T>): StyleProp<T>;
    hairlineWidth: number;
    absoluteFill: ViewStyle;
    absoluteFillObject: ViewStyle;
  };

  // ── Accessibility ──────────────────────────────────────────────────────────
  type AccessibilityRole =
    | 'none' | 'button' | 'link' | 'search' | 'image' | 'keyboardkey'
    | 'text' | 'adjustable' | 'imagebutton' | 'header' | 'summary'
    | 'alert' | 'checkbox' | 'combobox' | 'menu' | 'menubar' | 'menuitem'
    | 'progressbar' | 'radio' | 'radiogroup' | 'scrollbar' | 'spinbutton'
    | 'switch' | 'tab' | 'tablist' | 'timer' | 'toolbar';

  interface AccessibilityProps {
    accessible?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: AccessibilityRole;
    accessibilityState?: {
      disabled?: boolean;
      selected?: boolean;
      checked?: boolean | 'mixed';
      busy?: boolean;
      expanded?: boolean;
    };
    accessibilityValue?: { min?: number; max?: number; now?: number; text?: string };
    importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-hidden'?: boolean;
    'aria-live'?: 'polite' | 'assertive' | 'off';
    'aria-disabled'?: boolean;
    'aria-selected'?: boolean;
    'aria-checked'?: boolean | 'mixed';
    'aria-expanded'?: boolean;
    'aria-busy'?: boolean;
    role?: AccessibilityRole;
  }

  // ── Event types ────────────────────────────────────────────────────────────
  export interface GestureResponderEvent {
    nativeEvent: {
      changedTouches: any[];
      identifier: string;
      locationX: number;
      locationY: number;
      pageX: number;
      pageY: number;
      target: string;
      timestamp: number;
      touches: any[];
    };
  }

  export interface LayoutChangeEvent {
    nativeEvent: { layout: { x: number; y: number; width: number; height: number } };
  }

  export type NativeSyntheticEvent<T> = {
    nativeEvent: T;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean;
    eventPhase: number;
    isTrusted: boolean;
    preventDefault(): void;
    isDefaultPrevented(): boolean;
    stopPropagation(): void;
    isPropagationStopped(): boolean;
    persist(): void;
    currentTarget: any;
    target: any;
    timeStamp: number;
    type: string;
  };

  // ── ViewProps ──────────────────────────────────────────────────────────────
  export interface ViewProps extends AccessibilityProps {
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
    testID?: string;
    nativeID?: string;
    onLayout?: (event: LayoutChangeEvent) => void;
    pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
    removeClippedSubviews?: boolean;
    collapsable?: boolean;
  }

  // Declared as a class so it can be used as a type in React.RefObject<View>
  // and React.forwardRef<View, Props>.
  export class View extends React.Component<ViewProps> {
    measure(callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void): void;
    measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
    focus(): void;
    blur(): void;
  }

  // ── TextProps ──────────────────────────────────────────────────────────────
  export interface TextProps extends AccessibilityProps {
    style?: StyleProp<TextStyle>;
    children?: React.ReactNode;
    testID?: string;
    numberOfLines?: number;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
    allowFontScaling?: boolean;
    adjustsFontSizeToFit?: boolean;
    minimumFontScale?: number;
    maxFontSizeMultiplier?: number;
    selectable?: boolean;
    onPress?: (event: GestureResponderEvent) => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    onLayout?: (event: LayoutChangeEvent) => void;
    suppressHighlighting?: boolean;
  }

  export const Text: React.ComponentType<TextProps>;

  // ── Pressable ──────────────────────────────────────────────────────────────
  export interface PressableStateCallbackType {
    pressed: boolean;
  }

  export interface PressableProps extends AccessibilityProps {
    children?: React.ReactNode | ((state: PressableStateCallbackType) => React.ReactNode);
    style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
    onPress?: (event: GestureResponderEvent) => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    onPressIn?: (event: GestureResponderEvent) => void;
    onPressOut?: (event: GestureResponderEvent) => void;
    disabled?: boolean;
    hitSlop?: number | { top?: number; left?: number; bottom?: number; right?: number };
    testID?: string;
    android_ripple?: { color?: ColorValue; borderless?: boolean; radius?: number };
    android_disableSound?: boolean;
  }

  export const Pressable: React.ForwardRefExoticComponent<PressableProps & React.RefAttributes<any>>;

  // ── ScrollView ─────────────────────────────────────────────────────────────
  export interface ScrollViewProps extends ViewProps {
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    scrollEnabled?: boolean;
    onScroll?: (event: NativeSyntheticEvent<{ contentOffset: { x: number; y: number } }>) => void;
    scrollEventThrottle?: number;
    keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
    contentContainerStyle?: StyleProp<ViewStyle>;
    refreshControl?: React.ReactElement;
    bounces?: boolean;
    bouncesZoom?: boolean;
    onContentSizeChange?: (w: number, h: number) => void;
    onMomentumScrollEnd?: (event: any) => void;
    pagingEnabled?: boolean;
    snapToInterval?: number;
    snapToOffsets?: number[];
    snapToAlignment?: 'start' | 'center' | 'end';
    decelerationRate?: 'fast' | 'normal' | number;
    overScrollMode?: 'auto' | 'always' | 'never';
  }

  export const ScrollView: React.ComponentType<ScrollViewProps>;

  // ── RefreshControl ─────────────────────────────────────────────────────────
  export interface RefreshControlProps extends ViewProps {
    refreshing: boolean;
    onRefresh?: () => void;
    colors?: ColorValue[];
    tintColor?: ColorValue;
    title?: string;
    titleColor?: ColorValue;
    progressBackgroundColor?: ColorValue;
    progressViewOffset?: number;
    size?: 'default' | 'large';
  }

  export const RefreshControl: React.ComponentType<RefreshControlProps>;

  // ── TextInput ──────────────────────────────────────────────────────────────
  export interface TextInputProps extends ViewProps {
    value?: string;
    defaultValue?: string;
    onChangeText?: (text: string) => void;
    onChange?: (event: NativeSyntheticEvent<{ text: string }>) => void;
    onFocus?: (event: NativeSyntheticEvent<any>) => void;
    onBlur?: (event: NativeSyntheticEvent<any>) => void;
    placeholder?: string;
    placeholderTextColor?: ColorValue;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url' | 'decimal-pad' | 'number-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoComplete?: string;
    autoCorrect?: boolean;
    autoFocus?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    editable?: boolean;
    maxLength?: number;
    returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send' | 'default';
    onSubmitEditing?: (event: NativeSyntheticEvent<{ text: string }>) => void;
    onEndEditing?: (event: NativeSyntheticEvent<{ text: string }>) => void;
    blurOnSubmit?: boolean;
    clearButtonMode?: 'never' | 'while-editing' | 'unless-editing' | 'always';
    inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
    readOnly?: boolean;
  }

  export class TextInput extends React.Component<TextInputProps> {
    focus(): void;
    blur(): void;
    clear(): void;
    isFocused(): boolean;
  }

  // ── Image ──────────────────────────────────────────────────────────────────
  export interface ImageSourcePropType {
    uri?: string;
    width?: number;
    height?: number;
    scale?: number;
    headers?: { [key: string]: string };
  }

  export interface ImageProps extends ViewProps {
    source: ImageSourcePropType | number;
    style?: StyleProp<ImageStyle>;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    onLoad?: () => void;
    onError?: (event: { nativeEvent: { error: string } }) => void;
    onLoadStart?: () => void;
    onLoadEnd?: () => void;
    defaultSource?: ImageSourcePropType | number;
    blurRadius?: number;
    fadeDuration?: number;
    progressiveRenderingEnabled?: boolean;
    alt?: string;
  }

  export class Image extends React.Component<ImageProps> {
    static getSize(uri: string, success: (width: number, height: number) => void, failure?: (error: any) => void): void;
    static prefetch(url: string): Promise<boolean>;
  }

  // ── Platform ───────────────────────────────────────────────────────────────
  export const Platform: {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos';
    Version: number | string;
    isPad: boolean;
    isTV: boolean;
    select<T>(specifics: { ios?: T; android?: T; web?: T; windows?: T; macos?: T; default?: T }): T;
    isTesting: boolean;
  };

  // ── Appearance ─────────────────────────────────────────────────────────────
  export interface AppearancePreferences {
    colorScheme: 'light' | 'dark' | null;
  }

  export const Appearance: {
    getColorScheme(): 'light' | 'dark' | null;
    addChangeListener(listener: (pref: AppearancePreferences) => void): { remove: () => void };
    setColorScheme(scheme: 'light' | 'dark' | null): void;
  };

  // ── Hooks ──────────────────────────────────────────────────────────────────
  export function useWindowDimensions(): {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  };

  export function useColorScheme(): 'light' | 'dark' | null;

  // ── AccessibilityInfo ──────────────────────────────────────────────────────
  export const AccessibilityInfo: {
    isReduceMotionEnabled(): Promise<boolean>;
    isScreenReaderEnabled(): Promise<boolean>;
    isBoldTextEnabled(): Promise<boolean>;
    addEventListener(
      event: 'change' | 'reduceMotionChanged' | 'screenReaderChanged' | 'boldTextChanged' | 'grayscaleChanged' | 'invertColorsChanged' | 'reduceTransparencyChanged',
      handler: (isEnabled: boolean) => void,
    ): { remove: () => void };
    announceForAccessibility(announcement: string): void;
    setAccessibilityFocus(reactTag: number): void;
  };
}
