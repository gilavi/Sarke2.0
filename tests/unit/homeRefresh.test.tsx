/**
 * Unit test for Home's pull-to-refresh wiring.
 *
 * Regression guard for the "not even 1 refresh works" half of the empty-Home
 * bug (see docs/reports/BUG_REPORT.md, "Home shows empty projects after first
 * login" → 2026-06-25 follow-up): Home's RefreshControl used to refetch only
 * `[certsQ, templatesQ, projectsQ]`, never the record-widget queries (which
 * live inside HomeRecordsSection), so pulling to refresh could never recover an
 * empty record list. It now also calls `invalidateRecordLists(qc)` — which
 * refetches every record namespace + projects — and refetches qualifications +
 * templates directly via the `queries` array.
 *
 * `react-native` is aliased to react-native-web (primitives render to DOM);
 * reanimated is overridden here so its ScrollView renders the `refreshControl`
 * prop, letting the capture-mock RefreshControl run. Heavy children that own
 * their own queries (HomeRecordsSection, ResumeDraftCard, …) are stubbed.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// vi.mock factories are hoisted above the module body, so any variable they
// close over must be created via vi.hoisted (which runs first).
const { invalidateRecordLists, refreshProps, qcSentinel } = vi.hoisted(() => ({
  invalidateRecordLists: vi.fn(() => Promise.resolve()),
  refreshProps: {} as { queries?: unknown[]; onRefresh?: () => void },
  qcSentinel: { __id: 'qc' },
}));

vi.mock('../../lib/theme', async () => {
  const { themeMock } = await import('../mocks/rn-ui');
  return { ...themeMock(), withOpacity: (c: string) => c };
});
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());

// reanimated: ScrollView must render its `refreshControl` prop so the capture
// mock below actually executes (the aliased stub renders an inert <div> that
// would swallow the prop).
vi.mock('react-native-reanimated', () => {
  const R = require('react') as typeof import('react');
  const View = ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children);
  const ScrollView = ({ children, refreshControl }: { children?: React.ReactNode; refreshControl?: React.ReactNode }) =>
    R.createElement('div', null, refreshControl ?? null, children);
  return {
    __esModule: true,
    default: { createAnimatedComponent: <T,>(C: T) => C, View, ScrollView, Text: 'span' },
    useSharedValue: <T,>(v: T) => ({ value: v }),
    useAnimatedStyle: () => ({}),
  };
});

// Capture RefreshControl props; render a button that invokes onRefresh.
vi.mock('../../components/primitives', () => ({
  RefreshControl: (props: { queries?: unknown[]; onRefresh?: () => void }) => {
    refreshProps.queries = props.queries;
    refreshProps.onRefresh = props.onRefresh;
    const R = require('react') as typeof import('react');
    return R.createElement(
      'button',
      { 'data-testid': 'refresh', onClick: () => props.onRefresh?.() },
      'refresh',
    );
  },
}));

vi.mock('../../lib/apiHooks', () => ({
  useProjects: () => ({ data: [{ id: 'p1', name: 'P1' }], isFetched: true, isFetching: false, isError: false }),
  useQualifications: () => ({ data: [], isFetched: true, isFetching: false, isError: false }),
  useTemplates: () => ({ data: [], isFetched: true, isFetching: false, isError: false }),
  invalidateRecordLists,
}));

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => qcSentinel }));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ state: { status: 'signedIn', user: { first_name: 'Gio' } } }),
}));
vi.mock('../../lib/services', () => ({ isExpiringSoon: () => false }));
vi.mock('../../lib/toast', () => ({ useToast: () => ({ error: vi.fn() }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ka' } }),
}));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../components/animations', () => ({
  useScrollHeader: () => ({
    scrollHandler: vi.fn(),
    containerStyle: {},
    heroStyle: {},
    compactStyle: {},
    backdropStyle: {},
  }),
  NumberPop: () => null,
}));
vi.mock('../../components/QuickActions', () => ({ QuickActions: () => null }));
vi.mock('../../components/Skeleton', () => ({ Skeleton: () => null }));
vi.mock('../../components/ui', () => ({ Card: ({ children }: { children?: React.ReactNode }) => children }));
vi.mock('../../components/InspectionTypeAvatar', () => ({ InspectionTypeAvatar: () => null }));
vi.mock('../../components/ui/CustomDropdown', () => ({ CustomDropdown: () => null }));
vi.mock('../../components/home/ProjectCard', () => ({ ProjectCard: () => null }));
vi.mock('../../components/home/ProjectPickerSheet', () => ({ ProjectPickerSheet: () => null }));
vi.mock('../../features/home-records/ResumeDraftCard', () => ({ ResumeDraftCard: () => null }));
vi.mock('../../features/home-records/HomeRecordsSection', () => ({ HomeRecordsSection: () => null }));

import HomeScreen from '../../app/(tabs)/home';

afterEach(cleanup);
beforeEach(() => {
  invalidateRecordLists.mockClear();
  refreshProps.queries = undefined;
  refreshProps.onRefresh = undefined;
});

describe('HomeScreen pull-to-refresh', () => {
  it('reloads the record widgets via invalidateRecordLists(qc)', () => {
    const { getByTestId } = render(React.createElement(HomeScreen));
    fireEvent.click(getByTestId('refresh'));
    expect(invalidateRecordLists).toHaveBeenCalledTimes(1);
    expect(invalidateRecordLists).toHaveBeenCalledWith(qcSentinel);
  });

  it('still refetches qualifications + templates directly (projects now covered by invalidate)', () => {
    render(React.createElement(HomeScreen));
    // queries = [certsQ, templatesQ] — projects dropped because invalidateRecordLists
    // already covers the 'projects' namespace.
    expect(refreshProps.queries).toHaveLength(2);
  });
});
