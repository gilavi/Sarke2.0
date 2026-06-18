// Web no-op shim for expo-haptics.
//
// The universal primitives (e.g. components/primitives/Button.tsx) call
// `haptic.*` from lib/haptics.ts, which imports expo-haptics. There is no web
// haptics API, and the native module assumes the Expo runtime — so on web we
// alias the whole package to these no-ops. Mirrors the Metro WEB_SHIMS pattern
// in metro.config.js, but for the Vite/Storybook graph which never runs Metro.

export enum ImpactFeedbackStyle {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Soft = 'soft',
  Rigid = 'rigid',
}

export enum NotificationFeedbackType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export async function impactAsync(_style?: ImpactFeedbackStyle): Promise<void> {}
export async function notificationAsync(_type?: NotificationFeedbackType): Promise<void> {}
export async function selectionAsync(): Promise<void> {}
