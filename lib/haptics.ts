import * as Haptics from 'expo-haptics';

/**
 * Canonical haptics vocabulary. Map intent → feel here; never call
 * `Haptics.*` directly from components. Intensities follow one rule set:
 *   Light  — toggles, selecting a chip/tab/option, opening a dropdown/sheet.
 *   Medium — primary buttons, confirming/advancing a step in a flow.
 *   Heavy  — destructive actions (delete/clear/reset), drag-and-drop drop.
 *   Success/Warning/Error — outcomes: saved/completed, validation/attention, hard failure.
 */
export const haptic = {
  // ── Navigation ──
  navigate: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  back: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  tabSwitch: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),

  // ── Form Interactions ──
  select: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  deselect: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  // Confirming / advancing a step in a wizard or flow → Medium (Heavy is for destructive only).
  confirm: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  // Toggling a switch/checkbox is a small, low-stakes interaction → Light.
  toggleOn: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  toggleOff: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),

  // ── Wizard / Inspection ──
  stepForward: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  stepBack: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  stepComplete: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  // Picking an answer is a selection, not a confirmation → Light (matches every
  // other answer / verdict / checklist surface in the app).
  answerYes: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  answerNo: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),

  // ── Photo ──
  shutter: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  uploadStart: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  uploadComplete: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  // Deleting a photo is a destructive action → Heavy.
  deletePhoto: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),

  // ── Errors ──
  // Validation error shown to the user (empty/invalid field) → Warning.
  validationError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  // Hard failure (network / request error, broken state) → Error.
  networkError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  // Initiating a destructive action (delete / clear / reset) → Heavy.
  deleteConfirm: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),

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
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
