/**
 * Walks NewOrder all the way through the fire_safety_order branch:
 *   step 0 (type) → step 1 (company) → step 2 (Step3FireSafety) →
 *   step 3 (StepSignDirector) → step 4 (StepSignAppointed) → step 5 (StepSummary).
 *
 * Each signature step is gated by `form.{director,appointed}Signature`. We stub
 * SignatureCanvas to render a "fake-sign" button that fires the parent's onSave
 * with a base64 payload, which the parent persists into the form. That covers
 * the StepSign* render branches AND the WizardShell wiring for steps 3/4.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

// SignatureCanvas mock that renders an inline button for the test to click.
vi.mock('@/components/SignatureCanvas', () => ({
  default: ({ onSave }: { onSave: (dataUrl: string) => void }) => (
    <button type="button" onClick={() => onSave('data:image/png;base64,ZmFrZQ==')}>
      fake-sign
    </button>
  ),
}));

vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  listProjects: vi.fn(),
  getProject: vi.fn(),
}));
vi.mock('@/lib/data/orders', async (io) => ({ ...(await io<object>()), createOrder: vi.fn() }));

import { listProjects, getProject } from '@/lib/data/projects';
import { createOrder } from '@/lib/data/orders';
import NewOrder from '@/pages/NewOrder';

function fillStep1Company() {
  fireEvent.change(screen.getByPlaceholderText('მაგ. №01/2025'), { target: { value: '01' } });
  fireEvent.change(screen.getByPlaceholderText('თბილისი'), { target: { value: 'თბილისი' } });
  // directorName: last text-typed input in Step2Company.
  const textInputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
    .filter((i) => i.type === 'text');
  if (textInputs.length >= 6) {
    fireEvent.change(textInputs[5], { target: { value: 'გელა ხელაძე' } });
  }
}

function fillStep2FireSafety() {
  // Step3FireSafety required: appointedName, appointedPhone, objectName.
  const textInputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
    .filter((i) => i.type === 'text');
  // Order in Step3FireSafety:
  //   [0] appointedName (required)
  //   [1] appointedPhone is type="tel", excluded
  //   [2] objectName (required)
  //   [3] objectAddress (auto-filled from getProject)
  const telInputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
    .filter((i) => i.type === 'tel');
  if (textInputs.length >= 1) fireEvent.change(textInputs[0], { target: { value: 'მაგ. გელა ხელაძე' } });
  if (telInputs.length >= 1) fireEvent.change(telInputs[0], { target: { value: '599100100' } });
  if (textInputs.length >= 2) fireEvent.change(textInputs[1], { target: { value: 'ობიექტი X' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([]);
  vi.mocked(getProject).mockResolvedValue({
    id: 'p1', user_id: 'u1', name: 'ჩემი პროექტი', company_name: 'შპს ალფა',
    address: 'თბილისი', contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: '2026-05-01',
  } as never);
  vi.mocked(createOrder).mockResolvedValue({ id: 'order-1' } as never);
});

describe('NewOrder - full fire_safety_order walkthrough', () => {
  it('walks all 6 steps and renders the StepSummary', async () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');

    // step 0: pick type
    fireEvent.click(screen.getByText('სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა'));
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // step 1: company step - fill required fields
    await screen.findByText('ბრძანების ნომერი *');
    await screen.findByDisplayValue('შპს ალფა');
    fillStep1Company();
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // step 2: Step3FireSafety - appointed person + object
    await screen.findByText('დანიშნული პირი');
    fillStep2FireSafety();
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // step 3: StepSignDirector - exercises the "no signature" branch (button shown).
    await screen.findByText('დირექტორის ხელმოწერა');
    // Open the signing UI, then click the fake-sign button.
    fireEvent.click(screen.getByRole('button', { name: /\+ ხელმოწერა/ }));
    fireEvent.click(screen.getByRole('button', { name: 'fake-sign' }));

    // After signing, the "ხელმოწერა დადებულია" confirmation renders.
    await screen.findByText('ხელმოწერა დადებულია');
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // step 4: StepSignAppointed - same pattern.
    await screen.findByText('პასუხისმგებელი პირის ხელმოწერა');
    fireEvent.click(screen.getByRole('button', { name: /\+ ხელმოწერა/ }));
    fireEvent.click(screen.getByRole('button', { name: 'fake-sign' }));
    await screen.findByText('ხელმოწერა დადებულია');

    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // step 5: StepSummary - final step. "შეჯამება" appears in both the stepper
    // label and the section h2; we want the h2.
    expect(await screen.findByRole('heading', { name: 'შეჯამება' })).toBeInTheDocument();
    // Director + appointed signature rows show as ✓.
    expect(screen.getAllByText(/ხელმოწერილია/).length).toBeGreaterThanOrEqual(2);
  });

  it('alcohol_control branch: walks 0 → summary (4 steps)', async () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');

    fireEvent.click(screen.getByText('ალკოჰოლური და ნარკოტიკული თრობის კონტროლი'));
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    await screen.findByText('ბრძანების ნომერი *');
    await screen.findByDisplayValue('შპს ალფა');
    fillStep1Company();
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // step 2: Step3AlcoholControl - required: facilityName, responsiblePersonName, responsiblePersonPosition.
    await screen.findByText('პასუხისმგებელი პირი');
    const t2 = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      .filter((i) => i.type === 'text');
    // [0] facilityName (auto-filled to company_name), [1] responsiblePersonName,
    // [2] responsiblePersonPosition, [3] responsiblePersonPersonalId
    fireEvent.change(t2[1], { target: { value: 'რესპონდენტი' } });
    fireEvent.change(t2[2], { target: { value: 'მენეჯერი' } });
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // step 3: StepSummary (final, no signatures).
    expect(await screen.findByRole('heading', { name: 'შეჯამება' })).toBeInTheDocument();
    expect(screen.getByText('პასუხისმგებელი')).toBeInTheDocument();
  });

  it('labor_safety_specialist branch: save-draft from summary calls createOrder', async () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');

    fireEvent.click(screen.getByText('შრომის უსაფრთხოების სპეციალისტის დანიშვნა'));
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    await screen.findByText('ბრძანების ნომერი *');
    await screen.findByDisplayValue('შპს ალფა');
    fillStep1Company();
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // step 2: Step3LaborSafety - required: facilityName, specialistName, certificateNumber.
    await screen.findByText('სპეციალისტი');
    const t = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      .filter((i) => i.type === 'text');
    // [0] facilityName (auto-filled), [1] specialistName, [2] specialistPersonalId,
    // [3] certificateNumber, [4] certificateDate
    fireEvent.change(t[1], { target: { value: 'სპეც. სახელი' } });
    fireEvent.change(t[3], { target: { value: 'CERT-001' } });
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // step 3: StepSummary - has "შენახვა მონახაზად" (Save as draft) button.
    await screen.findByRole('heading', { name: 'შეჯამება' });
    const saveDraftBtn = screen.getByRole('button', { name: /შენახვა/ });
    fireEvent.click(saveDraftBtn);

    await new Promise((r) => setTimeout(r, 80));
    expect(createOrder).toHaveBeenCalled();
    const arg = vi.mocked(createOrder).mock.calls[0][0];
    expect(arg.documentType).toBe('labor_safety_specialist');
    expect(arg.status).toBe('draft');
  });
});
