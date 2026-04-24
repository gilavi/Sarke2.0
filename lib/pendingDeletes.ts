import { haptics } from './haptics';

type ToastLike = {
  info: (
    message: string,
    opts?: { duration?: number; action?: { label: string; onPress: () => void }; onHide?: () => void },
  ) => void;
  hide: () => void;
};

export interface ScheduleDeleteArgs {
  /** Toast body shown during the hold window, e.g. "პროექტი წაიშლება". */
  message: string;
  /** Label for the undo button. Defaults to "დაბრუნება". */
  undoLabel?: string;
  /** How long to wait before executing. Defaults to 5000ms. */
  holdMs?: number;
  /** Called after holdMs elapses AND user did not undo. */
  onExecute: () => void | Promise<void>;
  /** Called if user taps undo. Use to restore optimistic UI. */
  onUndo?: () => void;
  toast: ToastLike;
}

/**
 * Defers a destructive action for `holdMs` ms so the user can undo.
 * The caller is responsible for hiding the row from the local list immediately
 * (optimistic UI); this helper only manages the timer + toast.
 *
 * Calling scheduleDelete while a previous hold is still live causes the previous
 * operation to execute immediately — we never silently drop the user's intent.
 * If `unmount` is triggered externally via the returned handle, the pending
 * operation executes (safer than losing it — user already confirmed).
 */
export function scheduleDelete({
  message,
  undoLabel = 'დაბრუნება',
  holdMs = 5000,
  onExecute,
  onUndo,
  toast,
}: ScheduleDeleteArgs): { cancel: () => void } {
  let settled = false;

  const execute = () => {
    if (settled) return;
    settled = true;
    try {
      const r = onExecute();
      if (r && typeof (r as Promise<void>).then === 'function') {
        (r as Promise<void>).catch(() => {});
      }
    } catch {}
  };

  const undo = () => {
    if (settled) return;
    settled = true;
    haptics.tap();
    try {
      onUndo?.();
    } catch {}
  };

  toast.info(message, {
    duration: holdMs,
    action: { label: undoLabel, onPress: undo },
    onHide: execute,
  });

  return {
    cancel: () => {
      if (settled) return;
      settled = true;
      toast.hide();
    },
  };
}
