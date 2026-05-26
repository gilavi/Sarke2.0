import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/documentNames', () => ({ useInspectionName: () => () => 'tpl' }));
vi.mock('@/components/PhotoUploadWidget', () => ({ default: () => null }));
vi.mock('@/components/SignatureCanvas', () => ({ default: () => null }));
vi.mock('@/components/InspectionSignatures', () => ({ default: () => null }));
vi.mock('@/components/InspectionInfoView', () => ({ default: () => null }));
vi.mock('@/components/DeleteButton', () => ({ default: () => null }));
vi.mock('@/components/web/SuccessModal', () => ({ default: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/incidents', async (io) => ({ ...(await io<object>()), getIncident: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({ ...(await io<object>()), getBriefing: vi.fn() }));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  getInspection: vi.fn(),
  listQuestions: vi.fn(),
  listAnswers: vi.fn(),
}));

import { getIncident } from '@/lib/data/incidents';
import { getBriefing } from '@/lib/data/briefings';
import { getInspection, listAnswers, listQuestions } from '@/lib/data/inspections';
import IncidentDetail from '@/pages/IncidentDetail';
import BriefingDetail from '@/pages/BriefingDetail';
import HarnessInspectionDetail from '@/pages/HarnessInspectionDetail';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listAnswers).mockResolvedValue([]);
  vi.mocked(listQuestions).mockResolvedValue([]);
});

describe('IncidentDetail', () => {
  it('shows the not-found state for a missing incident', async () => {
    vi.mocked(getIncident).mockResolvedValue(null);
    renderPage(<Routes><Route path="/incidents/:id" element={<IncidentDetail />} /></Routes>, '/incidents/x');
    expect(await screen.findByText('ინციდენტი ვერ მოიძებნა.')).toBeInTheDocument();
  });
});

describe('BriefingDetail', () => {
  it('shows the not-found state for a missing briefing', async () => {
    vi.mocked(getBriefing).mockResolvedValue(null);
    renderPage(<Routes><Route path="/briefings/:id" element={<BriefingDetail />} /></Routes>, '/briefings/x');
    expect(await screen.findByText('ინსტრუქტაჟი ვერ მოიძებნა.')).toBeInTheDocument();
  });
});

describe('HarnessInspectionDetail', () => {
  it('shows the not-found state for a missing act', async () => {
    vi.mocked(getInspection).mockResolvedValue(null);
    renderPage(<Routes><Route path="/harness/:id" element={<HarnessInspectionDetail />} /></Routes>, '/harness/x');
    expect(await screen.findByText('აქტი ვერ მოიძებნა.')).toBeInTheDocument();
  });
});
