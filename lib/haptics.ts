import * as Haptics from 'expo-haptics';

export const haptic = {
  // ── Navigation ──
  navigate: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  back: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  tabSwitch: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),

  // ── Form Interactions ──
  select: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  deselect: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  confirm: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
  toggleOn: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  toggleOff: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),

  // ── Wizard / Inspection ──
  stepForward: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  stepBack: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  stepComplete: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  answerYes: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  answerNo: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),

  // ── Photo ──
  shutter: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  uploadStart: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  uploadComplete: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  deletePhoto: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),

  // ── Errors ──
  validationError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  networkError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  deleteConfirm: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),

  // ── Success Milestones ──
  inspectionComplete: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 200);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 400);
  },
  pdfGenerated: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 150);
  },
  projectCreated: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  signerAdded: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),

  // ── Legacy aliases (keep for backward compatibility) ──
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
