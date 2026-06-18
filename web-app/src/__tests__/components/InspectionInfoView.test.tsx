/**
 * InspectionInfoView (35% covered) - covers the editable + readonly branches
 * and the safety chip toggle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';

vi.mock('@/lib/photoUpload', () => ({
  signedInspectionPhotoUrl: vi.fn(() => Promise.resolve('https://signed/x')),
}));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  updateInspection: vi.fn(),
}));

import InspectionInfoView from '@/components/InspectionInfoView';
import type { Inspection } from '@/lib/data/inspections';

const baseInspection: Inspection = {
  id: 'i1', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'draft',
  harness_name: 'ქამარი A', department: 'დეპ', inspector_name: 'ი',
  conclusion_text: null, is_safe_for_use: null, inspector_signature: null,
  conclusion_photo_paths: [], signatories: [],
  created_at: '2026-05-01T00:00:00Z', completed_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InspectionInfoView (draft)', () => {
  it('renders editable fields with current values', () => {
    render(
      <InspectionInfoView
        inspection={baseInspection}
        isDraft
        answers={[]}
        gridQuestion={null}
        onFieldSave={() => {}}
      />,
    );
    expect(screen.getByDisplayValue('ქამარი A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ი')).toBeInTheDocument();
    expect(screen.getByDisplayValue('დეპ')).toBeInTheDocument();
  });

  it('clicking the "უსაფრთხოა" chip sets isSafe to true', () => {
    render(
      <InspectionInfoView
        inspection={baseInspection}
        isDraft
        answers={[]}
        gridQuestion={null}
        onFieldSave={() => {}}
      />,
    );
    const yesBtn = screen.getByRole('button', { name: 'უსაფრთხოა' });
    fireEvent.click(yesBtn);
    // The pill now has the selected brand-500 class.
    expect(yesBtn.className).toContain('bg-brand-500');
  });

  it('clicking the "არ არის უსაფრთხო" chip sets isSafe to false', () => {
    render(
      <InspectionInfoView
        inspection={baseInspection}
        isDraft
        answers={[]}
        gridQuestion={null}
        onFieldSave={() => {}}
      />,
    );
    const noBtn = screen.getByRole('button', { name: 'არ არის უსაფრთხო' });
    fireEvent.click(noBtn);
    expect(noBtn.className).toContain('bg-red-500');
  });
});

describe('InspectionInfoView (read-only)', () => {
  it('renders readonly text rows when isDraft=false', () => {
    render(
      <InspectionInfoView
        inspection={{ ...baseInspection, status: 'completed', is_safe_for_use: true, completed_at: '2026-05-01T00:00:00Z' }}
        isDraft={false}
        answers={[]}
        gridQuestion={null}
        onFieldSave={() => {}}
      />,
    );
    expect(screen.getByText('ქამარი A')).toBeInTheDocument();
    expect(screen.getByText(/✓ უსაფრთხოა/)).toBeInTheDocument();
  });
});
