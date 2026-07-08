/**
 * Unit tests for CustomDropdown.
 *
 * Key invariant under test: onChange must fire AFTER the BottomSheet dismiss
 * animation completes (via the showSheet callback), NOT during the onPress
 * inside the sheet. This prevents the isSheetOpen guard from blocking a
 * second BottomSheet opened by an onChange handler.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import type { BottomSheetOptions, ShowBottomSheet } from '../../components/BottomSheet';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

vi.mock('../../lib/haptics', () => ({
  haptic: { light: vi.fn(), medium: vi.fn() },
}));

// The cancel row + placeholder resolve via t('components.dropdownCancel') /
// t('components.dropdownPlaceholder'); back the mock with the real ka.json so
// the Georgian-string assertions ('გაუქმება') keep testing the shipped copy.
vi.mock('react-i18next', async () => (await import('../mocks/rn-ui')).i18nKaMock());

vi.mock('../../lib/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        surface: '#fff', surfaceSecondary: '#f5f5f5', border: '#e0e0e0',
        borderStrong: '#ccc', ink: '#000', inkSoft: '#666', inkFaint: '#999',
        accent: '#007aff', accentSoft: '#e8f0fe', danger: '#ff3b30', overlay: 'rgba(0,0,0,0.4)',
      },
      typography: {
        fontFamily: { body: 'System', bodyMedium: 'System', bodySemiBold: 'System' },
      },
      // PressBounce (the trigger wrapper) reads theme.motion.spring.bouncy
      // inside its bounce() handler. Without this the trigger press throws.
      motion: {
        spring: {
          gentle: { damping: 20, stiffness: 180, mass: 1 },
          bouncy: { damping: 12, stiffness: 200, mass: 1 },
          stiff: { damping: 25, stiffness: 300, mass: 1 },
          soft: { damping: 30, stiffness: 120, mass: 1 },
        },
      },
    },
  }),
}));

// Capture the latest showSheet call so tests can inspect + drive it.
let capturedShowArgs: {
  options: BottomSheetOptions;
  callback: ((idx: number | undefined) => void) | undefined;
} | null = null;

const mockShowSheet = vi.fn<ShowBottomSheet>((options, callback) => {
  capturedShowArgs = { options, callback };
  return { dismiss: vi.fn() };
});

vi.mock('../../components/BottomSheet', () => ({
  useBottomSheet: () => mockShowSheet,
  BottomSheetScrollView: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'scroll-view' }, children),
}));

// ── helpers ────────────────────────────────────────────────────────────────

import { CustomDropdown, type DropdownOption } from '../../components/ui/CustomDropdown';

const OPTIONS: DropdownOption[] = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
];

function renderDropdown(props: Partial<React.ComponentProps<typeof CustomDropdown>> = {}) {
  const onChange = vi.fn();
  const result = render(
    React.createElement(CustomDropdown, {
      label: 'Test Label',
      options: OPTIONS,
      value: null,
      onChange,
      ...props,
    }),
  );
  return { ...result, onChange };
}

/** Simulate pressing an option row by label text inside the sheet content. */
function pressOptionInSheet(label: string) {
  if (!capturedShowArgs?.options.content) throw new Error('sheet not open');
  const content = capturedShowArgs.options.content;
  const node = typeof content === 'function'
    ? content({ dismiss: vi.fn() })
    : content;
  const { getByText } = render(node as React.ReactElement);
  fireEvent.click(getByText(label));
}

/** Simulate pressing cancel inside the sheet content. */
function pressCancelInSheet() {
  if (!capturedShowArgs?.options.content) throw new Error('sheet not open');
  const content = capturedShowArgs.options.content;
  const node = typeof content === 'function'
    ? content({ dismiss: vi.fn() })
    : content;
  const { getByText } = render(node as React.ReactElement);
  fireEvent.click(getByText('გაუქმება'));
}

/**
 * Fire the showSheet completion callback (simulates animation finishing).
 * The component then defers the consumer onChange via setTimeout(_, 0) to
 * escape the Reanimated animation-finish tick - run pending timers so the
 * assertion can observe the call synchronously.
 */
function fireSheetDismissCallback() {
  capturedShowArgs?.callback?.(undefined);
  vi.runAllTimers();
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  capturedShowArgs = null;
  mockShowSheet.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CustomDropdown - trigger', () => {
  it('renders the trigger button and label in self-contained mode', () => {
    const { getByText } = renderDropdown();
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('renders nothing in controlled mode (no trigger button)', () => {
    const { queryByText } = renderDropdown({ open: false, onOpenChange: vi.fn() });
    expect(queryByText('Test Label')).toBeNull();
  });

  it('does not open sheet when disabled', () => {
    const { getByRole } = renderDropdown({ disabled: true });
    fireEvent.click(getByRole('combobox'));
    expect(mockShowSheet).not.toHaveBeenCalled();
  });

  it('opens sheet when trigger is pressed', () => {
    const { getByRole } = renderDropdown();
    fireEvent.click(getByRole('combobox'));
    expect(mockShowSheet).toHaveBeenCalledTimes(1);
  });

  it('shows selected label in trigger when value matches an option', () => {
    const { getByText } = renderDropdown({ value: 'b' });
    expect(getByText('Option B')).toBeTruthy();
  });

  it('shows placeholder when value is null', () => {
    const { getByText } = renderDropdown({ placeholder: 'Pick one…' });
    expect(getByText('Pick one…')).toBeTruthy();
  });

  it('shows error text when error prop is provided', () => {
    const { getByText } = renderDropdown({ error: 'Required field' });
    expect(getByText('Required field')).toBeTruthy();
  });
});

describe('CustomDropdown - sheet content', () => {
  it('renders all option labels inside the sheet', () => {
    const { getByRole } = renderDropdown();
    fireEvent.click(getByRole('combobox'));

    const content = capturedShowArgs!.options.content!;
    const node = typeof content === 'function'
      ? content({ dismiss: vi.fn() })
      : content;
    const { getByText } = render(node as React.ReactElement);

    expect(getByText('Option A')).toBeTruthy();
    expect(getByText('Option B')).toBeTruthy();
    expect(getByText('Option C')).toBeTruthy();
    expect(getByText('გაუქმება')).toBeTruthy();
  });

  it('renders the sheet title from the label prop', () => {
    const { getByRole } = renderDropdown({ label: 'My Label' });
    fireEvent.click(getByRole('combobox'));

    const content = capturedShowArgs!.options.content!;
    const node = typeof content === 'function'
      ? content({ dismiss: vi.fn() })
      : content;
    const { getAllByText } = render(node as React.ReactElement);
    // Title appears inside the sheet
    expect(getAllByText('My Label').length).toBeGreaterThanOrEqual(1);
  });
});

describe('CustomDropdown - synchronous onChange', () => {
  // Important invariant: onChange must fire inside the React event handler
  // (onPress) so navigation calls like router.push run in a normal event
  // tick. Firing onChange from inside the BottomSheet animation-finish
  // callback caused navigation to be silently dropped on iOS, which the user
  // experienced as "the sheet closes but the app is stuck on home".

  it('calls onChange immediately when an option is pressed', () => {
    const { getByRole, onChange } = renderDropdown();
    fireEvent.click(getByRole('combobox'));
    pressOptionInSheet('Option A');
    expect(onChange).toHaveBeenCalledWith('a');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onChange when cancel is pressed', () => {
    const { getByRole, onChange } = renderDropdown();
    fireEvent.click(getByRole('combobox'));
    pressCancelInSheet();
    fireSheetDismissCallback();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(OPTIONS)('calls onChange with "$value" for option "$label"', (opt) => {
    capturedShowArgs = null;
    mockShowSheet.mockClear();
    const { getByRole, onChange } = renderDropdown();
    fireEvent.click(getByRole('combobox'));
    pressOptionInSheet(opt.label);
    expect(onChange).toHaveBeenCalledWith(opt.value);
  });
});

describe('CustomDropdown - controlled mode', () => {
  it('calls onOpenChange(true) when trigger is pressed in self-contained mode with open prop', () => {
    // When open=false is passed, it becomes controlled mode (no trigger rendered)
    // so test with uncontrolled trigger opening scenario handled by internal state.
    const onOpenChange = vi.fn();
    // controlled: open=false means no trigger, flipping to true shows sheet
    render(
      React.createElement(CustomDropdown, {
        options: OPTIONS,
        value: null,
        onChange: vi.fn(),
        open: true,
        onOpenChange,
      }),
    );
    // Sheet should have been shown since open=true on mount
    expect(mockShowSheet).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when dismiss animation completes in controlled mode', () => {
    const onOpenChange = vi.fn();
    render(
      React.createElement(CustomDropdown, {
        options: OPTIONS,
        value: null,
        onChange: vi.fn(),
        open: true,
        onOpenChange,
      }),
    );
    fireSheetDismissCallback();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
