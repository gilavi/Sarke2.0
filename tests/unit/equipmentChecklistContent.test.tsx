/**
 * Unit tests for EquipmentChecklistContent — the content body of the equipment
 * inspection detail page (bobcat, excavator, …).
 *
 * `t` is the identity function, so assertions are on i18n KEYS (no literal
 * strings leak). RN primitives render via react-native-web; theme/icons/A11yText
 * are stubbed, Badge renders to a span carrying its variant so result→tone
 * mapping is queryable, and imageForDisplay is stubbed so no thumbnails resolve.
 *
 * Covers: section titles + item rows; result value → badge variant (good→
 * success, warn→warning, bad→danger, neutral→default); items with no result
 * render no badge; the confirmed-empty state; and notes rendering.
 */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../components/primitives/Badge', () => ({
  Badge: ({ children, variant }: { children: string; variant?: string }) =>
    React.createElement('span', { 'data-badge': variant ?? 'default' }, children),
}));
// expo-image renders the photo thumbnails (stubbed to a plain img).
vi.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => React.createElement('img', props as never),
}));
vi.mock('../../lib/imageUrl', () => ({ imageForDisplay: async () => '' }));
vi.mock('../../lib/supabase', () => ({ STORAGE_BUCKETS: { answerPhotos: 'answer-photos' } }));

import { EquipmentChecklistContent } from '../../components/document-details/content/EquipmentChecklistContent';
import type { ChecklistSection, ResultOption } from '../../lib/inspection/schema';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const RESULT_OPTIONS: ResultOption[] = [
  { value: 'good', label: 'კარგია', short: 'კარგია', tone: 'good' },
  { value: 'deficient', label: 'ნაკლი', short: 'ნაკლი', tone: 'warn' },
  { value: 'unusable', label: 'გამოუსადეგარია', short: 'გამოუს.', tone: 'bad' },
  { value: 'neutral', label: 'არ გააჩნია', short: 'არ გააჩნია', tone: 'neutral' },
];

const sections: ChecklistSection[] = [
  {
    title: 'A - კატეგორია',
    items: [
      { id: 1, label: 'A', description: 'პუნქტი ერთი', result: 'good', comment: null, photoPaths: [] },
      { id: 2, label: 'A', description: 'პუნქტი ორი', result: 'deficient', comment: 'შენიშვნა', photoPaths: [] },
      { id: 3, label: 'A', description: 'პუნქტი სამი', result: 'unusable', comment: null, photoPaths: [] },
    ],
  },
  {
    title: 'B - კატეგორია',
    items: [
      { id: 4, label: 'B', description: 'პუნქტი ოთხი', result: 'neutral', comment: null, photoPaths: [] },
      { id: 5, label: 'B', description: 'უპასუხო პუნქტი', result: null, comment: null, photoPaths: [] },
    ],
  },
];

describe('EquipmentChecklistContent', () => {
  it('renders section titles and every item description', () => {
    const { getByText } = render(
      <EquipmentChecklistContent sections={sections} resultOptions={RESULT_OPTIONS} />,
    );
    expect(getByText('A - კატეგორია')).toBeTruthy();
    expect(getByText('B - კატეგორია')).toBeTruthy();
    expect(getByText('პუნქტი ერთი')).toBeTruthy();
    expect(getByText('უპასუხო პუნქტი')).toBeTruthy();
    expect(getByText('შენიშვნა')).toBeTruthy(); // comment shown as subtitle
  });

  it('maps each result value to the correct badge tone', () => {
    const { container } = render(
      <EquipmentChecklistContent sections={sections} resultOptions={RESULT_OPTIONS} />,
    );
    const badges = Array.from(container.querySelectorAll('[data-badge]'));
    const tones = badges.map((b) => b.getAttribute('data-badge'));
    // good→success, deficient→warning, unusable→danger, neutral→default
    expect(tones).toContain('success');
    expect(tones).toContain('warning');
    expect(tones).toContain('danger');
    expect(tones).toContain('default');
    // 4 results present (item 5 has no result → no badge)
    expect(badges).toHaveLength(4);
  });

  it('renders the confirmed-empty state when no section has items', () => {
    const { getByText } = render(
      <EquipmentChecklistContent
        sections={[{ title: 'X', items: [] }]}
        resultOptions={RESULT_OPTIONS}
      />,
    );
    expect(getByText('details.content.empty')).toBeTruthy();
  });

  it('renders the notes block (with its label key) when notes are present', () => {
    const { getByText } = render(
      <EquipmentChecklistContent
        sections={sections}
        resultOptions={RESULT_OPTIONS}
        notes="საბოლოო შენიშვნა"
      />,
    );
    expect(getByText('details.content.notes')).toBeTruthy();
    expect(getByText('საბოლოო შენიშვნა')).toBeTruthy();
  });

  it('omits the notes block for empty / whitespace notes', () => {
    const { queryByText } = render(
      <EquipmentChecklistContent sections={sections} resultOptions={RESULT_OPTIONS} notes="   " />,
    );
    expect(queryByText('details.content.notes')).toBeNull();
  });
});
