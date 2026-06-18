/**
 * Deep NewOrder walkthrough - fills step 1's required fields by placeholder,
 * advances into step 2 (the labor-safety + fire-safety + alcohol-control
 * variants), exercising the per-doc-type Step3* components.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/components/SignatureCanvas', () => ({ default: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  listProjects: vi.fn(),
  getProject: vi.fn(),
}));
vi.mock('@/lib/data/orders', async (io) => ({ ...(await io<object>()), createOrder: vi.fn() }));

import { listProjects, getProject } from '@/lib/data/projects';
import NewOrder from '@/pages/NewOrder';

function fillCompanyStep() {
  // Required fields for canAdvance step 1: orderNumber, city, companyName, directorName.
  // companyName + legalAddress are auto-filled from getProject; city + orderNumber +
  // directorName must be filled here.
  fireEvent.change(screen.getByPlaceholderText('მაგ. №01/2025'), { target: { value: '01' } });
  fireEvent.change(screen.getByPlaceholderText('თბილისი'), { target: { value: 'თბილისი' } });

  // directorName has no placeholder. Mantine TextInput renders <input> WITHOUT a type
  // attribute (defaulting to text), so `input[type="text"]` doesn't match. Use the
  // `.type` property instead - it returns "text" for the unset case.
  const textInputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
    .filter((i) => i.type === 'text');
  // Order in Step2Company:
  //   [0] orderNumber, [1] city, [2] companyName, [3] identificationCode,
  //   [4] legalAddress, [5] directorName
  if (textInputs.length >= 6) {
    fireEvent.change(textInputs[5], { target: { value: 'გელა ხელაძე' } });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([]);
  vi.mocked(getProject).mockResolvedValue({
    id: 'p1', user_id: 'u1', name: 'ჩემი პროექტი', company_name: 'შპს ალფა',
    address: 'თბილისი', contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: '2026-05-01',
  } as never);
});

describe('NewOrder - deep walk to step 2', () => {
  it('labor_safety_specialist branch: step 0 → 1 → step 2 (Step3LaborSafety)', async () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');
    fireEvent.click(screen.getByText('შრომის უსაფრთხოების სპეციალისტის დანიშვნა'));
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // Wait for step 1 + getProject auto-fill, then complete required fields.
    await screen.findByText('ბრძანების ნომერი *');
    // Wait for the getProject auto-fill effect to populate companyName.
    await screen.findByDisplayValue('შპს ალფა');
    fillCompanyStep();
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // Step 2 - Step3LaborSafety renders specialist fields.
    expect(screen.getByText('ობიექტის სახელი და მისამართი *')).toBeInTheDocument();
    expect(screen.getByText('სპეციალისტი (სახელი, გვარი) *')).toBeInTheDocument();
  });

  it('alcohol_control branch: step 0 → 1 → step 2 (Step3AlcoholControl)', async () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');
    fireEvent.click(screen.getByText('ალკოჰოლური და ნარკოტიკული თრობის კონტროლი'));
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    await screen.findByText('ბრძანების ნომერი *');
    // Wait for the getProject auto-fill effect to populate companyName.
    await screen.findByDisplayValue('შპს ალფა');
    fillCompanyStep();
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // Step 2 - Step3AlcoholControl renders responsible-person fields.
    expect(screen.getByText('ობიექტის სახელი და მისამართი *')).toBeInTheDocument();
    expect(screen.getByText(/პასუხისმგებელი|რესპონდენტი/)).toBeInTheDocument();
  });

  it('fire_safety_order branch: step 0 → 1 → step 2 (Step3FireSafety)', async () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');
    fireEvent.click(screen.getByText('სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა'));
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    await screen.findByText('ბრძანების ნომერი *');
    // Wait for the getProject auto-fill effect to populate companyName.
    await screen.findByDisplayValue('შპს ალფა');
    fillCompanyStep();
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // Step 2 - Step3FireSafety renders appointed-person + object fields.
    expect(screen.getByText('დანიშნული პირი')).toBeInTheDocument();
    expect(screen.getByText('ობიექტის დასახელება *')).toBeInTheDocument();
  });

  it('fire_safety_order_enterprise branch: step 0 → 1 → step 2 (Step3FireSafetyEnterprise)', async () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');
    fireEvent.click(screen.getByText('საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა'));
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    await screen.findByText('ბრძანების ნომერი *');
    // Wait for the getProject auto-fill effect to populate companyName.
    await screen.findByDisplayValue('შპს ალფა');
    fillCompanyStep();
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // Step 2 - Step3FireSafetyEnterprise adds appointedPosition + appointedIdNumber.
    expect(screen.getByText(/თანამდებობა/)).toBeInTheDocument();
    expect(screen.getByText(/პირადი ნომერი|ID|პ\/ნ/)).toBeInTheDocument();
  });
});
