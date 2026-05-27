/**
 * Interaction tests for OrderDetail (41% coverage). Walks the fire_safety and
 * non-fire-safety branches, the director signature flow, and the delete flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/components/SignatureCanvas', () => ({
  default: ({ onSave }: { onSave: (dataUrl: string) => void }) => (
    <button type="button" onClick={() => onSave('data:image/png;base64,bXk=')}>
      fake-sign-order
    </button>
  ),
}));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/orders', async (io) => ({
  ...(await io<object>()),
  getOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
}));
vi.mock('@/lib/orderPdf', () => ({
  buildFireSafetyOrderHtml: vi.fn(() => '<html>fire</html>'),
  buildFireSafetyOrderEnterpriseHtml: vi.fn(() => '<html>fire-ent</html>'),
  buildLaborSafetyOrderHtml: vi.fn(() => '<html>labor</html>'),
  buildAlcoholControlOrderHtml: vi.fn(() => '<html>alcohol</html>'),
  openOrderPdfPreview: vi.fn(),
}));

import { getProject } from '@/lib/data/projects';
import { getOrder, updateOrder, deleteOrder } from '@/lib/data/orders';
import { openOrderPdfPreview } from '@/lib/orderPdf';
import OrderDetail from '@/pages/OrderDetail';

const baseFireSafety = {
  orderNumber: '01', city: 'თბილისი', orderDate: '2026-05-01T00:00:00.000Z',
  companyName: 'შპს ალფა', identificationCode: '', legalAddress: '',
  directorName: 'დირექტორი', appointedName: 'დანიშნული',
  appointedPhone: '599', objectName: 'X', objectAddress: '',
  directorSignature: null, directorSignedAt: null,
  appointedSignature: null, appointedSignedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue({
    id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: null,
    address: null, contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: '2026-05-01',
  } as never);
  vi.mocked(updateOrder).mockResolvedValue(undefined);
  vi.mocked(deleteOrder).mockResolvedValue(undefined);
});

describe('OrderDetail (fire safety)', () => {
  it('renders the info table + signature placeholders for a draft', async () => {
    vi.mocked(getOrder).mockResolvedValue({
      id: 'o1', projectId: 'p1', userId: 'u1',
      documentType: 'fire_safety_order',
      formData: baseFireSafety,
      status: 'draft', createdAt: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/orders/:id" element={<OrderDetail />} /></Routes>,
      '/orders/o1',
    );
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('ხელმოწერები')).toBeInTheDocument();
    // Director button visible (no sig); Appointed button disabled (director not signed).
    expect(screen.getAllByRole('button', { name: /\+ ხელმოწერა/ }).length).toBe(2);
  });

  it('clicking PDF-ის ნახვა calls openOrderPdfPreview', async () => {
    vi.mocked(getOrder).mockResolvedValue({
      id: 'o1', projectId: 'p1', userId: 'u1',
      documentType: 'fire_safety_order',
      formData: baseFireSafety,
      status: 'draft', createdAt: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/orders/:id" element={<OrderDetail />} /></Routes>,
      '/orders/o1',
    );
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(screen.getByRole('button', { name: /PDF-ის ნახვა/ }));
    expect(openOrderPdfPreview).toHaveBeenCalled();
  });

  it('director signature flow saves the signature via updateOrder', async () => {
    vi.mocked(getOrder).mockResolvedValue({
      id: 'o1', projectId: 'p1', userId: 'u1',
      documentType: 'fire_safety_order',
      formData: baseFireSafety,
      status: 'draft', createdAt: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/orders/:id" element={<OrderDetail />} /></Routes>,
      '/orders/o1',
    );
    await screen.findByRole('heading', { level: 1 });
    // Click the first "+ ხელმოწერა" (director); the appointed one is disabled.
    const signBtns = screen.getAllByRole('button', { name: /\+ ხელმოწერა/ });
    fireEvent.click(signBtns[0]);
    fireEvent.click(screen.getByRole('button', { name: 'fake-sign-order' }));
    await waitFor(() => expect(updateOrder).toHaveBeenCalled());
    const [calledId, patch] = vi.mocked(updateOrder).mock.calls[0];
    expect(calledId).toBe('o1');
    expect((patch as Record<string, unknown>).formData.directorSignature).toBe('bXk=');
  });

  it('delete flow: click წაშლა + confirm → deleteOrder fires', async () => {
    vi.mocked(getOrder).mockResolvedValue({
      id: 'o1', projectId: 'p1', userId: 'u1',
      documentType: 'fire_safety_order',
      formData: baseFireSafety,
      status: 'draft', createdAt: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/orders/:id" element={<OrderDetail />} /></Routes>,
      '/orders/o1',
    );
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(screen.getByRole('button', { name: /^წაშლა$/ }));
    // Wait for the AlertDialog title, then click the confirm button.
    await screen.findByText('ჩანაწერის წაშლა');
    const allBtns = screen.getAllByRole('button', { name: /^წაშლა$/ });
    fireEvent.click(allBtns[allBtns.length - 1]);
    await waitFor(() => expect(deleteOrder).toHaveBeenCalledWith('o1'));
  });
});

describe('OrderDetail (alcohol_control)', () => {
  it('renders the labor-style info table without signature section', async () => {
    vi.mocked(getOrder).mockResolvedValue({
      id: 'o2', projectId: 'p1', userId: 'u1',
      documentType: 'alcohol_control',
      formData: {
        ...baseFireSafety,
        responsiblePersonName: 'რესპონდენტი',
        responsiblePersonPosition: 'მენეჯერი',
        responsiblePersonPersonalId: '',
        facilityName: 'ობიექტი X',
      },
      status: 'draft', createdAt: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/orders/:id" element={<OrderDetail />} /></Routes>,
      '/orders/o2',
    );
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    // No "ხელმოწერები" section for alcohol_control.
    expect(screen.queryByText('ხელმოწერები')).not.toBeInTheDocument();
    expect(screen.getByText('რესპონდენტი')).toBeInTheDocument();
  });
});

describe('OrderDetail (labor_safety_specialist)', () => {
  it('renders the specialist info table', async () => {
    vi.mocked(getOrder).mockResolvedValue({
      id: 'o3', projectId: 'p1', userId: 'u1',
      documentType: 'labor_safety_specialist',
      formData: {
        ...baseFireSafety,
        specialistName: 'სპეცი',
        specialistPersonalId: '',
        certificateNumber: 'CERT-1',
        certificateDate: '',
        facilityName: 'ობიექტი X',
      },
      status: 'draft', createdAt: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/orders/:id" element={<OrderDetail />} /></Routes>,
      '/orders/o3',
    );
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('სპეცი')).toBeInTheDocument();
    expect(screen.getByText('CERT-1')).toBeInTheDocument();
  });
});
