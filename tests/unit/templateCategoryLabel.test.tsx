/**
 * Unit tests for the CATEGORY_LABEL map in app/templates.tsx.
 * Covers Bug 6: raw identifiers like "xaracho" / "bobcat" were showing instead
 * of human-readable Georgian category names.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: vi.fn() }),
}));

const mockUseTemplates = vi.fn();
vi.mock('../../lib/apiHooks', () => ({
  useTemplates: () => mockUseTemplates(),
}));

vi.mock('../../lib/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        ink: '#000', inkSoft: '#666', inkFaint: '#999',
        accent: '#007aff', regsTint: '#888',
      },
    },
  }),
}));

vi.mock('../../components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'card' }, children),
  Screen: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('../../components/primitives/A11yText', () => ({
  A11yText: ({ children, size: _s, weight: _w, color: _c, style: _st, ...rest }: any) =>
    React.createElement('span', rest, children),
}));

vi.mock('../../components/Skeleton', () => ({
  Skeleton: () => null,
}));

vi.mock('../../components/ScaffoldTour', () => ({
  ScaffoldTour: () => null,
}));

vi.mock('../../lib/shared/documentName', () => ({
  inspectionDisplayName: (name: string) => name ?? 'Template',
}));

vi.mock('../../types/models', () => ({
  SIGNER_ROLE_LABEL: {} as Record<string, string>,
}));

// ── Helpers ────────────────────────────────────────────────────────────────

import TemplatesScreen from '../../app/templates';

function makeTemplate(category: string | null, id = 't1') {
  return {
    id,
    name: `Template ${id}`,
    category,
    is_system: true,
    required_signer_roles: [],
  };
}

function renderWithTemplate(template: ReturnType<typeof makeTemplate>) {
  mockUseTemplates.mockReturnValue({ data: [template], isLoading: false });
  return render(React.createElement(TemplatesScreen));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CATEGORY_LABEL — known categories render Georgian names', () => {
  // The label appears inside "სისტემური · <label>" so we check container.textContent
  // rather than getByText (which requires exact element text).
  it.each([
    ['xaracho',                        'ხარაჩო'],
    ['harness',                        'სამაგრი ქამარი'],
    ['bobcat',                         'ციცხვიანი დამტვირთველი'],
    ['excavator',                      'ექსკავატორი'],
    ['general_equipment',              'ტექნიკური აღჭურვილობა'],
    ['cargo_platform',                 'ტვირთის მიმღები პლატფორმა'],
    ['safety_net_inspection',          'უსაფრთხოების ბადე'],
    ['mobile_ladder_inspection',       'მობილური კიბე'],
    ['fall_protection_inspection',     'ვარდნისგან დაცვა'],
    ['lifting_accessories_inspection', 'სამაღლო საიერიშო'],
    ['forklift_inspection',            'ამწე'],
  ] as const)('%s → "%s"', (category, expectedLabel) => {
    const { container } = renderWithTemplate(makeTemplate(category));
    expect(container.textContent).toContain(expectedLabel);
    expect(container.textContent).not.toContain(category);
  });
});

describe('CATEGORY_LABEL — fallback behaviour', () => {
  it('renders raw identifier for unknown categories', () => {
    const { container } = renderWithTemplate(makeTemplate('custom_type_xyz'));
    expect(container.textContent).toContain('custom_type_xyz');
  });

  it('renders "—" when category is null', () => {
    const { container } = renderWithTemplate(makeTemplate(null));
    expect(container.textContent).toContain('—');
  });
});

describe('CATEGORY_LABEL — system/non-system label', () => {
  it('shows "სისტემური" for system templates', () => {
    mockUseTemplates.mockReturnValue({
      data: [{ ...makeTemplate('bobcat'), is_system: true }],
      isLoading: false,
    });
    const { container } = render(React.createElement(TemplatesScreen));
    expect(container.textContent).toContain('სისტემური');
  });

  it('shows "ჩემი" for non-system templates', () => {
    mockUseTemplates.mockReturnValue({
      data: [{ ...makeTemplate('bobcat'), is_system: false }],
      isLoading: false,
    });
    const { container } = render(React.createElement(TemplatesScreen));
    expect(container.textContent).toContain('ჩემი');
  });
});
