/**
 * InspectionSignatures (44% covered).
 *
 * Tests:
 * - empty state (no inspector_signature + no signatories)
 * - inspector pinned signature row renders
 * - signatory rows render
 * - clicking "+ პირის დამატება" opens the modal
 * - completing the signature via the canvas mock fires onUpdate with new entry
 * - removing a signatory fires onUpdate with the filtered array
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';

vi.mock('@/components/SignatureCanvas', () => ({
  default: ({ onSave }: { onSave: (dataUrl: string) => void }) => (
    <button type="button" onClick={() => onSave('data:image/png;base64,c2lnbg==')}>
      fake-sign-sig
    </button>
  ),
}));

import InspectionSignatures from '@/components/InspectionSignatures';
import { type SignatoryEntry } from '@/lib/data/inspections';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InspectionSignatures', () => {
  it('renders the empty state when no inspector signature and no signatories', () => {
    render(
      <InspectionSignatures
        inspection={{ inspector_signature: null, inspector_name: null, signatories: [], created_at: '2026-05-01' }}
        canEdit={false}
        onUpdate={() => {}}
      />,
    );
    expect(screen.getByText('ხელმოწერები არ არის.')).toBeInTheDocument();
  });

  it('renders the inspector signature row when present', () => {
    render(
      <InspectionSignatures
        inspection={{
          inspector_signature: 'sigsig', inspector_name: 'ი. ი.',
          signatories: [], created_at: '2026-05-01', completed_at: '2026-05-01',
        }}
        canEdit={false}
        onUpdate={() => {}}
      />,
    );
    expect(screen.getByText('ი. ი.')).toBeInTheDocument();
  });

  it('renders signatory rows', () => {
    const sigs: SignatoryEntry[] = [
      { name: 'მამა', role: 'ბრიგადირი', signature: 'data:image/png;base64,xx', signed_at: '2026-05-01' },
    ];
    render(
      <InspectionSignatures
        inspection={{ inspector_signature: null, signatories: sigs, created_at: '2026-05-01' }}
        canEdit={false}
        onUpdate={() => {}}
      />,
    );
    expect(screen.getByText('მამა')).toBeInTheDocument();
    expect(screen.getByText('ბრიგადირი')).toBeInTheDocument();
  });

  it('clicking "+ პირის დამატება" opens the modal', async () => {
    render(
      <InspectionSignatures
        inspection={{ inspector_signature: null, signatories: [], created_at: '2026-05-01' }}
        canEdit
        onUpdate={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /\+ პირის დამატება/ }));
    expect(await screen.findByText('სახელი / გვარი')).toBeInTheDocument();
  });

  it('signing in the modal fires onUpdate with the new entry', async () => {
    const onUpdate = vi.fn();
    render(
      <InspectionSignatures
        inspection={{ inspector_signature: null, signatories: [], created_at: '2026-05-01' }}
        canEdit
        onUpdate={onUpdate}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /\+ პირის დამატება/ }));
    // Fill name + role
    const nameInput = (await screen.findByPlaceholderText('გ. ხელაძე'));
    fireEvent.change(nameInput, { target: { value: 'მამა' } });
    fireEvent.change(screen.getByPlaceholderText('სამშენებლო მენეჯერი'), { target: { value: 'ბრიგადირი' } });
    fireEvent.click(screen.getByRole('button', { name: 'fake-sign-sig' }));
    expect(onUpdate).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'მამა', role: 'ბრიგადირი' }),
    ]);
  });

  it('removing a signatory fires onUpdate with filtered array', () => {
    const onUpdate = vi.fn();
    const sigs: SignatoryEntry[] = [
      { name: 'A', role: 'r1', signature: 'sig-a', signed_at: '2026-05-01' },
      { name: 'B', role: 'r2', signature: 'sig-b', signed_at: '2026-05-01' },
    ];
    render(
      <InspectionSignatures
        inspection={{ inspector_signature: null, signatories: sigs, created_at: '2026-05-01' }}
        canEdit
        onUpdate={onUpdate}
      />,
    );
    // Each row with canEdit and onRemove has a trash button.
    const trash = document.body.querySelectorAll('[class*="lucide-trash"]');
    expect(trash.length).toBe(2);
    fireEvent.click(trash[0].closest('button')!);
    expect(onUpdate).toHaveBeenCalledWith([sigs[1]]);
  });
});
