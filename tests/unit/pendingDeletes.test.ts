import { describe, it, expect, vi, beforeEach } from 'vitest';

const lightMock = vi.fn();

vi.mock('../../lib/haptics', () => ({
  haptic: { light: lightMock },
}));

const { scheduleDelete } = await import('../../lib/pendingDeletes');

type ToastOpts = {
  duration?: number;
  action?: { label: string; onPress: () => void };
  onHide?: () => void;
};

function createMockToast() {
  let lastMessage = '';
  let lastOpts: ToastOpts | undefined;
  return {
    info: vi.fn((message: string, opts?: ToastOpts) => {
      lastMessage = message;
      lastOpts = opts;
    }),
    hide: vi.fn(),
    get lastMessage() {
      return lastMessage;
    },
    get lastOpts() {
      return lastOpts;
    },
  };
}

beforeEach(() => {
  lightMock.mockClear();
});

describe('scheduleDelete', () => {
  it('shows the toast with default undo label and 5s duration', () => {
    const toast = createMockToast();
    scheduleDelete({
      message: 'Will be deleted',
      onExecute: () => {},
      toast,
    });
    expect(toast.info).toHaveBeenCalled();
    expect(toast.lastMessage).toBe('Will be deleted');
    expect(toast.lastOpts!.duration).toBe(5000);
    expect(toast.lastOpts!.action!.label).toBe('დაბრუნება');
  });

  it('honors a custom undoLabel and holdMs', () => {
    const toast = createMockToast();
    scheduleDelete({
      message: 'X',
      undoLabel: 'Revert',
      holdMs: 1234,
      onExecute: () => {},
      toast,
    });
    expect(toast.lastOpts!.duration).toBe(1234);
    expect(toast.lastOpts!.action!.label).toBe('Revert');
  });

  it('calls onExecute when toast hides without undo', () => {
    const toast = createMockToast();
    const onExecute = vi.fn();
    scheduleDelete({ message: 'X', onExecute, toast });
    toast.lastOpts!.onHide!();
    expect(onExecute).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onExecute when undo is pressed', () => {
    const toast = createMockToast();
    const onExecute = vi.fn();
    const onUndo = vi.fn();
    scheduleDelete({ message: 'X', onExecute, onUndo, toast });
    toast.lastOpts!.action!.onPress();
    expect(onExecute).not.toHaveBeenCalled();
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(lightMock).toHaveBeenCalledTimes(1);
  });

  it('does not double-execute if onHide fires after undo settled', () => {
    const toast = createMockToast();
    const onExecute = vi.fn();
    scheduleDelete({ message: 'X', onExecute, toast });
    toast.lastOpts!.action!.onPress();
    toast.lastOpts!.onHide!();
    expect(onExecute).not.toHaveBeenCalled();
  });

  it('does not call onUndo twice if pressed after undo settled', () => {
    const toast = createMockToast();
    const onUndo = vi.fn();
    scheduleDelete({ message: 'X', onExecute: () => {}, onUndo, toast });
    toast.lastOpts!.action!.onPress();
    toast.lastOpts!.action!.onPress();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('cancel() hides the toast and prevents execution', () => {
    const toast = createMockToast();
    const onExecute = vi.fn();
    const handle = scheduleDelete({ message: 'X', onExecute, toast });
    handle.cancel();
    expect(toast.hide).toHaveBeenCalledTimes(1);
    toast.lastOpts!.onHide!();
    expect(onExecute).not.toHaveBeenCalled();
  });

  it('cancel() after settled is a no-op', () => {
    const toast = createMockToast();
    const handle = scheduleDelete({ message: 'X', onExecute: () => {}, toast });
    toast.lastOpts!.onHide!();
    handle.cancel();
    expect(toast.hide).not.toHaveBeenCalled();
  });

  it('swallows sync throws inside onExecute', () => {
    const toast = createMockToast();
    const onExecute = vi.fn(() => {
      throw new Error('boom');
    });
    scheduleDelete({ message: 'X', onExecute, toast });
    expect(() => toast.lastOpts!.onHide!()).not.toThrow();
    expect(onExecute).toHaveBeenCalled();
  });

  it('swallows promise rejections from onExecute', async () => {
    const toast = createMockToast();
    const onExecute = vi.fn(() => Promise.reject(new Error('async boom')));
    scheduleDelete({ message: 'X', onExecute, toast });
    expect(() => toast.lastOpts!.onHide!()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(onExecute).toHaveBeenCalled();
  });

  it('swallows sync throws inside onUndo', () => {
    const toast = createMockToast();
    const onUndo = vi.fn(() => {
      throw new Error('undo boom');
    });
    scheduleDelete({ message: 'X', onExecute: () => {}, onUndo, toast });
    expect(() => toast.lastOpts!.action!.onPress()).not.toThrow();
  });
});
