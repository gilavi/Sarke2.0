/**
 * Unit tests for FlowHeader's exit-confirmation wiring — the fix for the
 * "exit dialog promises 'progress will be saved' in flows that discard
 * everything" audit finding:
 *   - the ✕ close goes through the confirmation and forwards per-flow copy
 *     (`exitCopy`) to the dialog,
 *   - the back button is only confirmed when it actually leaves the flow
 *     (`backIsExit`), otherwise it steps back freely,
 *   - Android hardware back mirrors the back button (step back mid-flow,
 *     confirm at the exit boundary; falls through to the close when the back
 *     button is absent/disabled) and is only intercepted while the flow
 *     reports unsaved state (`confirmExit`).
 * The ExitConfirmationModal itself is faked; its copy defaults are covered in
 * exitModal.test.tsx.
 */
import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const backSubs = vi.hoisted(() => [] as Array<() => boolean>);
/** Fire a hardware back press like Android does: last-registered first. */
function pressHardwareBack(): boolean {
  for (let i = backSubs.length - 1; i >= 0; i--) {
    if (backSubs[i]()) return true;
  }
  return false;
}

vi.mock('react-native', () => ({
  BackHandler: {
    addEventListener: (_event: string, fn: () => boolean) => {
      backSubs.push(fn);
      return {
        remove: () => {
          const i = backSubs.indexOf(fn);
          if (i >= 0) backSubs.splice(i, 1);
        },
      };
    },
  },
  Pressable: ({ children, onPress, style: _s, ...rest }: Record<string, any>) =>
    React.createElement(
      'button',
      { onClick: onPress, ...rest },
      typeof children === 'function' ? children({ pressed: false }) : children,
    ),
  View: ({ children, style: _s, ...rest }: Record<string, any>) =>
    React.createElement('div', rest, children),
  StyleSheet: { create: (s: unknown) => s },
}));
vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));
vi.mock('../../components/HeaderBackButton', () => ({
  HeaderBackButton: ({ onPress, disabled }: { onPress?: () => void; disabled?: boolean }) =>
    React.createElement('button', { 'data-testid': 'back', disabled: !!disabled, onClick: onPress }),
}));
vi.mock('../../components/HeaderCloseButton', () => ({
  HeaderCloseButton: ({ onPress }: { onPress?: () => void }) =>
    React.createElement('button', { 'data-testid': 'close', onClick: onPress }),
}));
vi.mock('../../components/wizard/ExitModal', () => ({
  ExitConfirmationModal: ({ visible, title, body, onStay, onExit }: Record<string, any>) =>
    visible
      ? React.createElement(
          'div',
          { 'data-testid': 'exit-modal' },
          React.createElement('span', { 'data-testid': 'exit-title' }, title ?? ''),
          React.createElement('span', { 'data-testid': 'exit-body' }, body ?? ''),
          React.createElement('button', { 'data-testid': 'stay', onClick: onStay }),
          React.createElement('button', { 'data-testid': 'confirm-exit', onClick: onExit }),
        )
      : null,
}));

import { FlowHeader } from '../../components/FlowHeader';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  backSubs.length = 0;
});

function renderHeader(props: Partial<React.ComponentProps<typeof FlowHeader>> = {}) {
  const onBack = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <FlowHeader flowTitle="ინციდენტი" trailing="close" onBack={onBack} onClose={onClose} {...props} />,
  );
  return { ...utils, onBack, onClose };
}

describe('FlowHeader exit confirmation', () => {
  it('confirms the ✕ close with the per-flow copy before exiting', () => {
    const { getByTestId, queryByTestId, onClose } = renderHeader({
      confirmExit: true,
      exitCopy: { body: 'flow-specific-discard-copy' },
    });
    expect(queryByTestId('exit-modal')).toBeNull();

    fireEvent.click(getByTestId('close'));
    expect(onClose).not.toHaveBeenCalled();
    expect(getByTestId('exit-body').textContent).toBe('flow-specific-discard-copy');

    fireEvent.click(getByTestId('confirm-exit'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('staying in the dialog never invokes the exit callback', () => {
    const { getByTestId, onClose } = renderHeader({ confirmExit: true });
    fireEvent.click(getByTestId('close'));
    fireEvent.click(getByTestId('stay'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without a dialog when the flow has nothing to lose', () => {
    const { getByTestId, queryByTestId, onClose } = renderHeader({ confirmExit: false });
    fireEvent.click(getByTestId('close'));
    expect(queryByTestId('exit-modal')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('confirms the back button only when it exits the flow (backIsExit)', () => {
    const exiting = renderHeader({ confirmExit: true, backIsExit: true });
    fireEvent.click(exiting.getByTestId('back'));
    expect(exiting.onBack).not.toHaveBeenCalled();
    fireEvent.click(exiting.getByTestId('confirm-exit'));
    expect(exiting.onBack).toHaveBeenCalledTimes(1);
    cleanup();

    const stepping = renderHeader({ confirmExit: true, backIsExit: false });
    fireEvent.click(stepping.getByTestId('back'));
    expect(stepping.queryByTestId('exit-modal')).toBeNull();
    expect(stepping.onBack).toHaveBeenCalledTimes(1);
  });

  it('hardware back steps back mid-flow and confirms at the exit boundary', () => {
    const midFlow = renderHeader({ confirmExit: true, backIsExit: false });
    act(() => {
      expect(pressHardwareBack()).toBe(true);
    });
    expect(midFlow.onBack).toHaveBeenCalledTimes(1);
    expect(midFlow.queryByTestId('exit-modal')).toBeNull();
    cleanup();
    backSubs.length = 0;

    const boundary = renderHeader({ confirmExit: true, backIsExit: true });
    act(() => {
      expect(pressHardwareBack()).toBe(true);
    });
    expect(boundary.onBack).not.toHaveBeenCalled();
    expect(boundary.queryByTestId('exit-modal')).toBeTruthy();
    fireEvent.click(boundary.getByTestId('confirm-exit'));
    expect(boundary.onBack).toHaveBeenCalledTimes(1);
  });

  it('hardware back falls through to the confirmed close when back is absent or disabled', () => {
    const noBack = renderHeader({ confirmExit: true, leading: 'none' });
    act(() => {
      expect(pressHardwareBack()).toBe(true);
    });
    expect(noBack.queryByTestId('exit-modal')).toBeTruthy();
    expect(noBack.onClose).not.toHaveBeenCalled();
    cleanup();
    backSubs.length = 0;

    const disabledBack = renderHeader({ confirmExit: true, backDisabled: true });
    act(() => {
      expect(pressHardwareBack()).toBe(true);
    });
    expect(disabledBack.queryByTestId('exit-modal')).toBeTruthy();
  });

  it('does not intercept hardware back when confirmExit is off, and unregisters on unmount', () => {
    const { unmount } = renderHeader({ confirmExit: false });
    expect(backSubs.length).toBe(0);
    expect(pressHardwareBack()).toBe(false);
    unmount();
    cleanup();

    const confirmed = renderHeader({ confirmExit: true });
    expect(backSubs.length).toBe(1);
    confirmed.unmount();
    expect(backSubs.length).toBe(0);
  });
});
