/**
 * Unit tests for BreathalyzerSection.
 * Covers Bug 2: empty state was showing the wrong subtitle ("ფაილები არ არის ატვირთული")
 * instead of breathalyzer-specific copy ("ალკოტესტი ჩაწერილი არ არის").
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) =>
    React.createElement('span', { 'data-icon': name }),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../lib/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        inkSoft: '#666',
        inkFaint: '#999',
        ink: '#000',
        accent: '#007aff',
        accentSoft: '#e8f0fe',
        certTint: '#00c07c',
        borderStrong: '#ccc',
        semantic: {
          successSoft: '#e6f9f0',
          success: '#00c07c',
          warningSoft: '#fff3e0',
        },
      },
    },
  }),
}));

vi.mock('../../components/projects/ProjectRowHelpers', () => ({
  ViewMoreRow: () => null,
}));

vi.mock('../../components/Skeleton', () => ({
  SkeletonRow: () => null,
}));

let lastSectionEmptyProps: Record<string, any> = {};
vi.mock('../../components/EmptyState', () => ({
  SectionEmptyState: (props: Record<string, any>) => {
    lastSectionEmptyProps = props;
    return React.createElement(
      'div',
      { 'data-testid': 'section-empty', 'data-subtitle': props.subtitle },
      props.subtitle,
    );
  },
}));

vi.mock('../../components/primitives/A11yText', () => ({
  A11yText: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', null, children),
}));

// ── Component under test ───────────────────────────────────────────────────

import { BreathalyzerSection } from '../../features/project-detail/sections/BreathalyzerSection';

const PROJECT_ID = 'proj-abc';

afterEach(() => {
  cleanup();
  lastSectionEmptyProps = {};
});

describe('BreathalyzerSection — empty state', () => {
  it('shows the breathalyzer-specific subtitle when logs are empty', () => {
    const { getByTestId } = render(
      React.createElement(BreathalyzerSection, {
        id: PROJECT_ID,
        breathalyzerLogs: [],
        loading: false,
      }),
    );
    const empty = getByTestId('section-empty');
    expect(empty).toBeTruthy();
    expect(empty.getAttribute('data-subtitle')).toBe('ალკოტესტი ჩაწერილი არ არის');
  });

  it('passes subtitle prop to SectionEmptyState (not undefined)', () => {
    render(
      React.createElement(BreathalyzerSection, {
        id: PROJECT_ID,
        breathalyzerLogs: [],
        loading: false,
      }),
    );
    expect(lastSectionEmptyProps.subtitle).toBe('ალკოტესტი ჩაწერილი არ არის');
  });

  it('does NOT render the empty state while loading', () => {
    const { queryByTestId } = render(
      React.createElement(BreathalyzerSection, {
        id: PROJECT_ID,
        breathalyzerLogs: [],
        loading: true,
      }),
    );
    expect(queryByTestId('section-empty')).toBeNull();
  });

  it('does NOT render the empty state when logs are present', () => {
    const log = {
      id: 'log1',
      date: '2026-05-26',
      status: 'open' as const,
      entries: [],
    };
    const { queryByTestId } = render(
      React.createElement(BreathalyzerSection, {
        id: PROJECT_ID,
        breathalyzerLogs: [log],
        loading: false,
      }),
    );
    expect(queryByTestId('section-empty')).toBeNull();
  });
});

describe('BreathalyzerSection — section header', () => {
  it('renders the "ჟურნალები" section title', () => {
    const { getByText } = render(
      React.createElement(BreathalyzerSection, {
        id: PROJECT_ID,
        breathalyzerLogs: [],
        loading: false,
      }),
    );
    expect(getByText('ჟურნალები')).toBeTruthy();
  });

  it('shows the add-link button', () => {
    const { getByText } = render(
      React.createElement(BreathalyzerSection, {
        id: PROJECT_ID,
        breathalyzerLogs: [],
        loading: false,
      }),
    );
    expect(getByText('+ ალკოტესტი')).toBeTruthy();
  });

  it('renders log count when logs are present', () => {
    const logs = [
      { id: 'l1', date: '2026-05-26', status: 'open' as const, entries: [] },
      { id: 'l2', date: '2026-05-25', status: 'closed' as const, entries: [] },
    ];
    const { getByText } = render(
      React.createElement(BreathalyzerSection, {
        id: PROJECT_ID,
        breathalyzerLogs: logs,
        loading: false,
      }),
    );
    expect(getByText('2')).toBeTruthy();
  });
});
