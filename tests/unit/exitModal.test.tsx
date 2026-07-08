/**
 * Unit tests for ExitConfirmationModal's copy contract (audit fix: the shared
 * exit dialog must never promise a save that doesn't happen):
 *   - with no override it falls back to the DESTRUCTIVE body
 *     (`wizard.exitBodyDiscard`) — a flow must opt in to reassuring copy,
 *   - per-flow `title`/`body` overrides render verbatim,
 *   - the leave/stay buttons resolve to onExit/onStay through the sheet's
 *     dismiss callback.
 * The BottomSheet host is faked with a synchronous imperative stub.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

interface FakeSheet {
  options: { content: () => React.ReactElement; dismissable?: boolean };
  callback?: (idx: number | undefined) => void;
}
const sheets = vi.hoisted(() => [] as FakeSheet[]);

vi.mock('react-native', () => ({
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
vi.mock('../../lib/haptics', async () => (await import('../mocks/rn-ui')).hapticsMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('../../components/BottomSheet', () => ({
  useBottomSheet:
    () =>
    (options: FakeSheet['options'], callback?: FakeSheet['callback']) => {
      const sheet: FakeSheet = { options, callback };
      sheets.push(sheet);
      return { dismiss: () => callback?.(undefined) };
    },
}));

import { ExitConfirmationModal } from '../../components/wizard/ExitModal';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  sheets.length = 0;
});

function show(props: Partial<React.ComponentProps<typeof ExitConfirmationModal>> = {}) {
  const onStay = vi.fn();
  const onExit = vi.fn();
  render(<ExitConfirmationModal visible onStay={onStay} onExit={onExit} {...props} />);
  expect(sheets.length).toBe(1);
  // The sheet content is rendered by the (faked) imperative host — mount it so
  // the copy and buttons can be asserted/pressed.
  const utils = render(sheets[0].options.content());
  return { ...utils, onStay, onExit };
}

describe('ExitConfirmationModal copy + actions', () => {
  // i18n isn't initialised here, so t(key) returns the raw key — asserting on
  // keys pins WHICH string each branch uses.
  it('defaults to the destructive discard body, not a saved-progress promise', () => {
    const { getByText, queryByText } = show();
    expect(getByText('wizard.exitTitle')).toBeTruthy();
    expect(getByText('wizard.exitBodyDiscard')).toBeTruthy();
    expect(queryByText('wizard.exitBody')).toBeNull();
  });

  it('renders per-flow title/body overrides verbatim', () => {
    const { getByText, queryByText } = show({
      title: 'გასვლა?',
      body: 'ინციდენტი დრაფტად შეინახება',
    });
    expect(getByText('გასვლა?')).toBeTruthy();
    expect(getByText('ინციდენტი დრაფტად შეინახება')).toBeTruthy();
    expect(queryByText('wizard.exitBodyDiscard')).toBeNull();
  });

  it('leave resolves to onExit, stay to onStay', () => {
    const leave = show();
    fireEvent.click(leave.getByText('wizard.exitLeave'));
    expect(leave.onExit).toHaveBeenCalledTimes(1);
    expect(leave.onStay).not.toHaveBeenCalled();
    cleanup();
    sheets.length = 0;

    const stay = show();
    fireEvent.click(stay.getByText('wizard.exitContinue'));
    expect(stay.onStay).toHaveBeenCalledTimes(1);
    expect(stay.onExit).not.toHaveBeenCalled();
  });
});
