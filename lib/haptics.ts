import * as Haptics from 'expo-haptics';

export const haptic = {
  /** Button press, tap feedback — subtle */
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** Medium impact — e.g. toggles, selections */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  /** Success notification — completed action, saved */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** Error notification — validation failed, delete */
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  /** Warning notification — caution, pending */
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  /** Heavy impact — safety violations, final submit, delete confirmation */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
};
