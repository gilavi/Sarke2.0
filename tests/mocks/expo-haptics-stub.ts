/**
 * Test-env stand-in for `expo-haptics`.
 *
 * The real module pulls in ExpoModulesCore, which throws under jsdom/node (it
 * expects React Native's native bridge + `__DEV__`). Anything that reaches
 * haptics transitively (e.g. PressBounce → lib/haptics) would fail to import
 * a component under test. Aliased in vitest.config.ts; every call is an inert
 * resolved promise.
 */
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

export const impactAsync = async () => {};
export const notificationAsync = async () => {};
export const selectionAsync = async () => {};
