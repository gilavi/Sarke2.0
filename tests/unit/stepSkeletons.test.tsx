/**
 * Unit tests for StepBodySkeleton + InspectionShellSkeleton. The shared Skeleton
 * atom, FlowHeader, and expo-router/safe-area are stubbed so we can count
 * placeholders per variant and assert the shell's progress-bar wiring.
 */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../components/Skeleton', () => ({
  Skeleton: () => React.createElement('div', { 'data-skel': true }),
  SkeletonCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'skeleton-card' }, children),
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 12, left: 0, right: 0 }),
}));
vi.mock('expo-router', () => ({ Stack: { Screen: () => null } }));

let flowHeaderProps: Record<string, unknown> | null = null;
vi.mock('../../components/FlowHeader', () => ({
  FlowHeader: (props: Record<string, unknown>) => {
    flowHeaderProps = props;
    return React.createElement('div', { 'data-testid': 'flow-header' });
  },
}));

import { StepBodySkeleton } from '../../components/inspection-steps/StepSkeletons';
import { InspectionShellSkeleton } from '../../components/inspection-steps/InspectionShellSkeleton';

afterEach(() => {
  cleanup();
  flowHeaderProps = null;
});

const count = (c: HTMLElement) => c.querySelectorAll('[data-skel]').length;

describe('StepBodySkeleton', () => {
  it('renders one bar per field for the form variant', () => {
    const { container } = render(<StepBodySkeleton variant="form" fields={4} />);
    expect(count(container)).toBe(4);
  });

  it('defaults to the form variant with 3 fields', () => {
    const { container } = render(<StepBodySkeleton />);
    expect(count(container)).toBe(3);
  });

  it('falls back to form for an unknown variant', () => {
    const { container } = render(<StepBodySkeleton variant={'mystery' as never} />);
    expect(count(container)).toBe(3);
  });

  it.each([
    ['keypad', 30], // plate + 2 chips + 27 keys
    ['checklist', 31], // legend + 6 rows × (2 text + 3 chips)
    ['conclusion', 8],
    ['table', 5],
    ['question', 9],
  ] as const)('renders the %s variant placeholders', (variant, n) => {
    const { container } = render(<StepBodySkeleton variant={variant} />);
    expect(count(container)).toBe(n);
  });
});

describe('InspectionShellSkeleton', () => {
  it('shows the header, a footer button placeholder, and the chosen body', () => {
    const { container, getByTestId } = render(
      <InspectionShellSkeleton title="ექსკავატორი" variant="form" fields={2} />,
    );
    expect(getByTestId('flow-header')).toBeTruthy();
    // 2 form bars + 1 footer skeleton.
    expect(count(container)).toBe(3);
  });

  it('passes step+1 and totalSteps to the header when totalSteps is set', () => {
    render(<InspectionShellSkeleton title="t" step={2} totalSteps={5} />);
    expect(flowHeaderProps?.step).toBe(3);
    expect(flowHeaderProps?.totalSteps).toBe(5);
  });

  it('hides the progress bar (step undefined) when totalSteps is omitted', () => {
    render(<InspectionShellSkeleton title="t" step={2} />);
    expect(flowHeaderProps?.step).toBeUndefined();
    expect(flowHeaderProps?.totalSteps).toBeUndefined();
  });
});
