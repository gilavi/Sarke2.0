import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/photoUpload', () => ({ signedInspectionPhotoUrl: vi.fn().mockResolvedValue('https://signed/x') }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/templates', async (io) => ({ ...(await io<object>()), getTemplate: vi.fn() }));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  getInspection: vi.fn(),
  listQuestions: vi.fn(),
  listAnswers: vi.fn(),
  listAllAnswerPhotos: vi.fn(),
}));
vi.mock('@/lib/data/bobcat', async (io) => ({ ...(await io<object>()), getBobcatInspection: vi.fn() }));
vi.mock('@/lib/data/excavator', async (io) => ({ ...(await io<object>()), getExcavatorInspection: vi.fn() }));
vi.mock('@/lib/data/generalEquipment', async (io) => ({ ...(await io<object>()), getGeneralEquipmentInspection: vi.fn() }));
vi.mock('@/lib/data/cargoPlatform', async (io) => ({ ...(await io<object>()), getCargoPlatformInspection: vi.fn() }));
vi.mock('@/lib/data/incidents', async (io) => ({ ...(await io<object>()), getIncident: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({ ...(await io<object>()), getBriefing: vi.fn() }));
vi.mock('@/lib/data/reports', async (io) => ({ ...(await io<object>()), getReport: vi.fn() }));

import { useAuth } from '@/lib/auth';
import { getInspection, listQuestions, listAnswers, listAllAnswerPhotos } from '@/lib/data/inspections';
import { getBobcatInspection, BOBCAT_TEMPLATE_ID } from '@/lib/data/bobcat';
import { getExcavatorInspection } from '@/lib/data/excavator';
import { getGeneralEquipmentInspection } from '@/lib/data/generalEquipment';
import { getCargoPlatformInspection } from '@/lib/data/cargoPlatform';
import { getIncident } from '@/lib/data/incidents';
import { getBriefing } from '@/lib/data/briefings';
import { getReport } from '@/lib/data/reports';
import { getProject } from '@/lib/data/projects';

import InspectionPrint from '@/pages/print/InspectionPrint';
import BobcatPrint from '@/pages/print/BobcatPrint';
import ExcavatorPrint from '@/pages/print/ExcavatorPrint';
import GeneralEquipmentPrint from '@/pages/print/GeneralEquipmentPrint';
import CargoPlatformPrint from '@/pages/print/CargoPlatformPrint';
import IncidentPrint from '@/pages/print/IncidentPrint';
import BriefingPrint from '@/pages/print/BriefingPrint';
import ReportPrint from '@/pages/print/ReportPrint';

function renderPrint(element: React.ReactElement, path: string) {
  return renderPage(
    <Routes><Route path="/:id" element={element} /></Routes>,
    path,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, profile: null } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(listQuestions).mockResolvedValue([]);
  vi.mocked(listAnswers).mockResolvedValue([]);
  vi.mocked(listAllAnswerPhotos).mockResolvedValue({});
});

describe('Print pages — not-found state', () => {
  it('InspectionPrint shows "აქტი ვერ მოიძებნა."', async () => {
    vi.mocked(getInspection).mockResolvedValue(null);
    renderPrint(<InspectionPrint />, '/x');
    expect(await screen.findByText('აქტი ვერ მოიძებნა.')).toBeInTheDocument();
  });

  it('BobcatPrint shows "ვერ მოიძებნა."', async () => {
    vi.mocked(getBobcatInspection).mockResolvedValue(null);
    renderPrint(<BobcatPrint />, '/x');
    expect(await screen.findByText('ვერ მოიძებნა.')).toBeInTheDocument();
  });

  it('ExcavatorPrint shows "ვერ მოიძებნა."', async () => {
    vi.mocked(getExcavatorInspection).mockResolvedValue(null);
    renderPrint(<ExcavatorPrint />, '/x');
    expect(await screen.findByText('ვერ მოიძებნა.')).toBeInTheDocument();
  });

  it('GeneralEquipmentPrint shows "ვერ მოიძებნა."', async () => {
    vi.mocked(getGeneralEquipmentInspection).mockResolvedValue(null);
    renderPrint(<GeneralEquipmentPrint />, '/x');
    expect(await screen.findByText('ვერ მოიძებნა.')).toBeInTheDocument();
  });

  it('CargoPlatformPrint shows "ვერ მოიძებნა."', async () => {
    vi.mocked(getCargoPlatformInspection).mockResolvedValue(null);
    renderPrint(<CargoPlatformPrint />, '/x');
    expect(await screen.findByText('ვერ მოიძებნა.')).toBeInTheDocument();
  });

  it('IncidentPrint shows "ვერ მოიძებნა."', async () => {
    vi.mocked(getIncident).mockResolvedValue(null);
    renderPrint(<IncidentPrint />, '/x');
    expect(await screen.findByText('ვერ მოიძებნა.')).toBeInTheDocument();
  });

  it('BriefingPrint shows "ვერ მოიძებნა."', async () => {
    vi.mocked(getBriefing).mockResolvedValue(null);
    renderPrint(<BriefingPrint />, '/x');
    expect(await screen.findByText('ვერ მოიძებნა.')).toBeInTheDocument();
  });

  it('ReportPrint shows "ვერ მოიძებნა."', async () => {
    vi.mocked(getReport).mockResolvedValue(null);
    renderPrint(<ReportPrint />, '/x');
    expect(await screen.findByText('ვერ მოიძებნა.')).toBeInTheDocument();
  });
});

describe('Print pages — loaded state', () => {
  it('BobcatPrint renders the full bobcat act for a completed inspection', async () => {
    vi.mocked(getBobcatInspection).mockResolvedValue({
      id: 'b1', projectId: 'p1', templateId: BOBCAT_TEMPLATE_ID, userId: 'u1',
      status: 'completed', company: 'შპს ალფა', address: null,
      equipmentModel: 'Bobcat S70', registrationNumber: 'AA-1',
      department: 'დეპ', inspectorName: 'ინსპ',
      inspectionDate: '2026-05-01', inspectionType: 'pre_work',
      items: [], verdict: 'approved', notes: 'OK',
      inspectorSignature: null, signatories: [], summaryPhotos: [],
      createdAt: '2026-05-01', updatedAt: '2026-05-01', completedAt: '2026-05-01',
    } as never);
    vi.mocked(getProject).mockResolvedValue({ id: 'p1', name: 'პროექტი' } as never);

    renderPrint(<BobcatPrint />, '/b1');

    expect(await screen.findByRole('heading', { name: 'ციცხვიანი დამტვირთველის შემოწმების აქტი' })).toBeInTheDocument();
    expect(screen.getAllByText(/Bobcat S70/).length).toBeGreaterThan(0);
    expect(screen.getByText(/დაშვებულია/)).toBeInTheDocument();
  });

  it('BriefingPrint renders a completed briefing', async () => {
    vi.mocked(getBriefing).mockResolvedValue({
      id: 'br1', projectId: 'p1', dateTime: '2026-05-01T09:00:00Z',
      topics: ['ppe'], participants: [{ fullName: 'ნ. ნოზაძე', position: 'მუშა', signature: null }],
      inspectorName: 'ი. ინსპექტორი', status: 'completed', createdAt: '2026-05-01',
    } as never);
    vi.mocked(getProject).mockResolvedValue({ id: 'p1', name: 'პროექტი', company_name: 'შპს ალფა' } as never);

    renderPrint(<BriefingPrint />, '/br1');

    expect(await screen.findByRole('heading', { name: 'უსაფრთხოების ინსტრუქტაჟი' })).toBeInTheDocument();
    expect(screen.getAllByText(/ი\. ინსპექტორი/).length).toBeGreaterThan(0);
    expect(screen.getByText('ნ. ნოზაძე')).toBeInTheDocument();
  });
});
