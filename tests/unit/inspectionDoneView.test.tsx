/**
 * Unit tests for InspectionDoneView — the shared "act saved" summary. We mock
 * SuccessScreen (capturing its primary/actions + rendering children), the Card
 * and Skeleton atoms, and the router. Covers the loading/loaded/empty branches,
 * conditional summary fields, every verdict tone, and the two CTAs.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());

const routerReplace = vi.fn();
vi.mock('expo-router', () => ({ useRouter: () => ({ replace: routerReplace }) }));

vi.mock('../../components/ui', () => ({
  Card: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'card' }, children),
}));
vi.mock('../../components/Skeleton', () => ({
  Skeleton: () => React.createElement('div', { 'data-skel': true }),
  SkeletonCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'skeleton-card' }, children),
}));

vi.mock('../../components/success/SuccessScreen', () => ({
  SuccessScreen: ({ title, primary, actions, children }: any) =>
    React.createElement(
      'div',
      null,
      React.createElement('span', null, title),
      React.createElement('button', { 'data-testid': 'primary', onClick: primary?.onPress }, primary?.title),
      ...(actions ?? []).map((a: any, i: number) =>
        React.createElement('button', { key: i, 'data-testid': `action-${i}`, onClick: a.onPress }, a.title),
      ),
      children,
    ),
}));

import { InspectionDoneView } from '../../components/success/InspectionDoneView';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const base = {
  loading: false,
  loaded: true,
  typeLabel: 'ექსკავატორის შემოწმების აქტი',
  onViewPdf: vi.fn(),
};

describe('InspectionDoneView', () => {
  it('shows the skeleton card while loading', () => {
    const { getByTestId, queryByTestId } = render(
      <InspectionDoneView {...base} loading loaded={false} />,
    );
    expect(getByTestId('skeleton-card')).toBeTruthy();
    expect(queryByTestId('card')).toBeNull();
  });

  it('renders the summary card with all provided fields once loaded', () => {
    const { getByTestId, getByText } = render(
      <InspectionDoneView
        {...base}
        projectName="ობიექტი X"
        dateText="18 ივნისი 2026"
        verdict={{ text: 'ვარგისია', tone: 'success' }}
        conclusion="ყველაფერი წესრიგშია"
      />,
    );
    expect(getByTestId('card')).toBeTruthy();
    expect(getByText('ექსკავატორის შემოწმების აქტი')).toBeTruthy();
    expect(getByText('ობიექტი X')).toBeTruthy();
    expect(getByText('18 ივნისი 2026')).toBeTruthy();
    expect(getByText('ვარგისია')).toBeTruthy();
    expect(getByText('ყველაფერი წესრიგშია')).toBeTruthy();
  });

  it('omits optional fields when they are absent', () => {
    const { queryByText } = render(<InspectionDoneView {...base} />);
    expect(queryByText('ობიექტი X')).toBeNull();
  });

  it('renders neither skeleton nor card when not loading and not loaded', () => {
    const { queryByTestId } = render(
      <InspectionDoneView {...base} loading={false} loaded={false} />,
    );
    expect(queryByTestId('skeleton-card')).toBeNull();
    expect(queryByTestId('card')).toBeNull();
  });

  it.each(['safe', 'success', 'warn', 'danger'] as const)(
    'renders the verdict line for the %s tone',
    (tone) => {
      const { getByText } = render(
        <InspectionDoneView {...base} verdict={{ text: `verdict-${tone}`, tone }} />,
      );
      expect(getByText(`verdict-${tone}`)).toBeTruthy();
    },
  );

  it('wires the primary CTA to onViewPdf', () => {
    const onViewPdf = vi.fn();
    const { getByTestId } = render(<InspectionDoneView {...base} onViewPdf={onViewPdf} />);
    fireEvent.click(getByTestId('primary'));
    expect(onViewPdf).toHaveBeenCalled();
  });

  it('wires the home action to router.replace(home)', () => {
    const { getByTestId } = render(<InspectionDoneView {...base} />);
    fireEvent.click(getByTestId('action-0'));
    expect(routerReplace).toHaveBeenCalledWith('/(tabs)/home');
  });
});
