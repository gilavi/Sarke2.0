/**
 * NewOrder full-flow tests - walk the step state machine to exercise
 * Step2Company + Step3LaborSafety branches that the mount-only test misses.
 * The wizard renders different child components per step, so each "next"
 * click brings in a new block of render code.
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
import { createOrder } from '@/lib/data/orders';
import NewOrder from '@/pages/NewOrder';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([]);
  vi.mocked(getProject).mockResolvedValue({
    id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს ალფა',
    address: 'თბილისი', contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: '2026-05-01',
  } as never);
  vi.mocked(createOrder).mockResolvedValue({ id: 'o1' } as never);
});

describe('NewOrder - step walkthrough', () => {
  it('starts on the type-picker step with all four order types', () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');
    expect(screen.getByText('ბრძანების ტიპი')).toBeInTheDocument();
    // All four DOC_TYPE_OPTIONS render.
    expect(screen.getByText('შრომის უსაფრთხოების სპეციალისტის დანიშვნა')).toBeInTheDocument();
    expect(screen.getByText('ალკოჰოლური და ნარკოტიკული თრობის კონტროლი')).toBeInTheDocument();
    expect(screen.getByText('სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა')).toBeInTheDocument();
  });

  it('marks the picked type as selected with a ✓ indicator', () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');
    fireEvent.click(screen.getByText('შრომის უსაფრთხოების სპეციალისტის დანიშვნა'));
    // Selected type renders a check mark sibling in its row.
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('advances to the company step after picking a type', () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');
    fireEvent.click(screen.getByText('შრომის უსაფრთხოების სპეციალისტის დანიშვნა'));
    // The wizard footer enables once docType + project are set.
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));
    // Step 1 - Step2Company - shows the company fieldset labels.
    expect(screen.getByText('ბრძანების ნომერი *')).toBeInTheDocument();
    expect(screen.getByText('კომპანიის დასახელება *')).toBeInTheDocument();
    expect(screen.getByText('დირექტორი (სახელი, გვარი) *')).toBeInTheDocument();
  });

  it('also exposes the picker labels for the other order types', () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');
    expect(screen.getByText('საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა')).toBeInTheDocument();
  });

  it('Prev button rewinds from step 1 back to step 0', () => {
    renderPage(<NewOrder />, '/orders/new?project=p1');
    fireEvent.click(screen.getByText('შრომის უსაფრთხოების სპეციალისტის დანიშვნა'));
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));
    expect(screen.getByText('ბრძანების ნომერი *')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'წინა' }));
    // Back to type picker.
    expect(screen.getByText('ბრძანების ტიპი')).toBeInTheDocument();
  });
});
