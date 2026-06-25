/**
 * Unit tests for the reusable DocumentDetails screen + its type-specific content.
 *
 * `t` is the identity function, so every assertion is on an i18n KEY — proving
 * no literal strings leak in. RN primitives render via react-native-web; the
 * theming/haptics/icon deps + Badge/Button/IconButton + the SignaturesScreen
 * modal are stubbed to plain DOM so presses + pill tones are queryable. The
 * info/content/signature/certificate sections render for real.
 *
 * Covers, per type: header + info + content render; signatures show/hide and
 * edit-vs-view (instruction: no add-row, eye icon, view-only tag); certificates
 * act-only; the status pill tone; report slide previews; the Edit/Duplicate/
 * Delete chips fire their handlers; Share PDF fires; back fires; and that no
 * "inspector" string appears anywhere. Plus the routing contract: a COMPLETED
 * act routes to the details screen, never a success/done route.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/haptics', async () => (await import('../mocks/rn-ui')).hapticsMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
}));
vi.mock('../../features/signatures', () => ({
  SignaturesScreen: () => React.createElement('div', { 'data-testid': 'sig-modal' }),
}));
vi.mock('../../components/primitives/Badge', () => ({
  Badge: ({ children, variant }: { children: string; variant?: string }) =>
    React.createElement('span', { 'data-badge': variant ?? 'default' }, children),
}));
vi.mock('../../components/primitives/Button', () => ({
  Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
    React.createElement('button', { 'data-testid': 'share-btn', onClick: onPress }, title),
}));
vi.mock('../../components/primitives/IconButton', () => ({
  IconButton: ({ onPress, a11yLabel }: { onPress: () => void; a11yLabel: string }) =>
    React.createElement('button', { 'aria-label': a11yLabel, 'data-testid': 'back-btn', onClick: onPress }),
}));
// expo-image + the storage URL fetch (used only by ReportSlidesContent).
vi.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => React.createElement('img', props as never),
}));
vi.mock('../../lib/imageUrl', () => ({ imageForDisplay: async () => '' }));
vi.mock('../../lib/supabase', () => ({ STORAGE_BUCKETS: { reportPhotos: 'report-photos' } }));

import { DocumentDetails } from '../../components/document-details/DocumentDetails';
import { InspectionPointsContent } from '../../components/document-details/content/InspectionPointsContent';
import { NoteBlocksContent } from '../../components/document-details/content/NoteBlocksContent';
import { ReportSlidesContent } from '../../components/document-details/content/ReportSlidesContent';
import { routeForInspection } from '../../lib/inspectionRouting';
import type { SignaturesState } from '../../features/signatures';
import type { Answer, Question, ReportSlide } from '../../types/models';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const sigFns = {
  setCreatorSignature: vi.fn(), clearCreatorSignature: vi.fn(),
  addRow: vi.fn(), removeRow: vi.fn(), clear: vi.fn(),
};
const emptyState = (rows: { id: string }[] = []): SignaturesState =>
  ({ creatorSignature: null, additionalRows: rows, ...sigFns }) as any;

const handlers = {
  onEdit: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(),
  onSharePdf: vi.fn(), onBack: vi.fn(),
};
const ICON = (() => null) as any;
const marker = (id: string) => React.createElement('span', { 'data-testid': id }, 'BODY');

describe('DocumentDetails — per-type shape', () => {
  it('act: header, info, content, edit-signatures + certificates, safe pill', () => {
    const { getByText, getByTestId, getAllByText, queryByText } = render(
      <DocumentDetails
        {...handlers}
        type="act"
        tileIcon={ICON}
        title="ACT TITLE"
        typeLabel="details.type.act"
        status={{ tone: 'safe', label: 'success.status.safe' }}
        info={[{ label: 'details.info.project', value: 'Digomi 2021' }, { label: 'details.info.expert', value: 'Giorgi' }]}
        contentLabel="details.content.act"
        contentTab="details.content.act"
        signatures={{ mode: 'edit', state: emptyState(), creatorName: 'Giorgi' }}
        certificates={{ items: [{ id: 'c1', title: 'ISO 45001' }], onAdd: vi.fn(), onOpen: vi.fn() }}
      >
        {marker('content-act')}
      </DocumentDetails>,
    );
    expect(getByText('ACT TITLE')).toBeTruthy();
    expect(getByText('details.type.act')).toBeTruthy();
    expect(getByText('success.status.safe').getAttribute('data-badge')).toBe('success');
    expect(getByText('details.info.project')).toBeTruthy();
    expect(getByText('Digomi 2021')).toBeTruthy();
    expect(getByTestId('content-act')).toBeTruthy();
    // signatures (edit) + certificates both present
    expect(getByText('success.signatures.heading')).toBeTruthy();
    expect(getByText('success.signatures.addPerson')).toBeTruthy();
    expect(getByText('success.certificates.heading')).toBeTruthy();
    expect(queryByText('success.signatures.viewOnly')).toBeNull();
    // tabs for every present section
    expect(getByText('details.tabs.info')).toBeTruthy();
    expect(getByText('details.tabs.signatures')).toBeTruthy();
    expect(getByText('details.tabs.certificates')).toBeTruthy();
    expect(getAllByText('details.content.act').length).toBe(2); // tab + section label
  });

  it('incident: severe pill, signatures shown, NO certificates', () => {
    const { getByText, queryByText } = render(
      <DocumentDetails
        {...handlers}
        type="incident"
        tileIcon={ICON}
        title="INCIDENT"
        typeLabel="details.type.incident"
        status={{ tone: 'severe', label: 'severe' }}
        info={[{ label: 'details.info.location', value: 'Site A' }]}
        contentLabel="details.content.incident"
        contentTab="details.content.incident"
        signatures={{ mode: 'edit', state: emptyState(), creatorName: 'X' }}
      >
        {marker('content-incident')}
      </DocumentDetails>,
    );
    expect(getByText('severe').getAttribute('data-badge')).toBe('danger');
    expect(getByText('success.signatures.heading')).toBeTruthy();
    expect(queryByText('success.certificates.heading')).toBeNull();
    expect(queryByText('details.tabs.certificates')).toBeNull();
  });

  it('report: no status pill, no signatures, no certificates', () => {
    const { getByTestId, queryByText } = render(
      <DocumentDetails
        {...handlers}
        type="report"
        tileIcon={ICON}
        title="REPORT"
        typeLabel="details.type.report"
        status={null}
        info={[{ label: 'details.info.project', value: 'P' }]}
        contentLabel="details.content.report"
        contentTab="details.content.report"
      >
        {marker('content-report')}
      </DocumentDetails>,
    );
    expect(getByTestId('content-report')).toBeTruthy();
    expect(queryByText('success.signatures.heading')).toBeNull();
    expect(queryByText('success.certificates.heading')).toBeNull();
    expect(queryByText('details.tabs.signatures')).toBeNull();
    expect(queryByText('details.tabs.certificates')).toBeNull();
  });

  it('instruction: view-only signatures (eye + view-only tag, no add row), no certs', () => {
    const { getByText, queryByText, queryAllByText, container } = render(
      <DocumentDetails
        {...handlers}
        type="instruction"
        tileIcon={ICON}
        title="INSTRUCTION"
        typeLabel="details.type.instruction"
        status={null}
        info={[{ label: 'details.info.project', value: 'P' }]}
        contentLabel="details.content.instruction"
        contentTab="details.content.instruction"
        signatures={{ mode: 'view', participants: [{ name: 'Nino Beridze', signed: true }] }}
      >
        {marker('content-instruction')}
      </DocumentDetails>,
    );
    expect(getByText('success.signatures.viewOnly')).toBeTruthy();
    expect(getByText('Nino Beridze')).toBeTruthy();
    expect(queryByText('success.signatures.addPerson')).toBeNull();
    expect(queryAllByText('success.signatures.participant').length).toBe(1);
    // view mode uses the eye signifier
    expect(container.querySelector('[data-icon="Eye"]')).toBeTruthy();
    expect(queryByText('success.certificates.heading')).toBeNull();
  });
});

describe('DocumentDetails — chips + actions', () => {
  const renderAct = () =>
    render(
      <DocumentDetails
        {...handlers}
        type="act"
        tileIcon={ICON}
        title="A"
        typeLabel="details.type.act"
        status={{ tone: 'safe', label: 'success.status.safe' }}
        info={[{ label: 'details.info.project', value: 'P' }]}
        contentLabel="details.content.act"
        contentTab="details.content.act"
        signatures={{ mode: 'edit', state: emptyState(), creatorName: 'G' }}
        certificates={{ items: [], onAdd: vi.fn(), onOpen: vi.fn() }}
      >
        {marker('c')}
      </DocumentDetails>,
    );

  it('Edit / Duplicate / Delete chips fire their handlers', () => {
    const { getByText } = renderAct();
    fireEvent.click(getByText('details.actions.edit'));
    expect(handlers.onEdit).toHaveBeenCalled();
    fireEvent.click(getByText('details.actions.duplicate'));
    expect(handlers.onDuplicate).toHaveBeenCalled();
    fireEvent.click(getByText('details.actions.delete'));
    expect(handlers.onDelete).toHaveBeenCalled();
  });

  it('Share PDF fires onSharePdf; back fires onBack', () => {
    const { getByTestId, getByLabelText } = renderAct();
    fireEvent.click(getByTestId('share-btn'));
    expect(handlers.onSharePdf).toHaveBeenCalled();
    fireEvent.click(getByLabelText('details.a11y.back'));
    expect(handlers.onBack).toHaveBeenCalled();
  });

  it('shows the locked share label when pdfLocked', () => {
    const { getByText } = render(
      <DocumentDetails
        {...handlers}
        type="report"
        tileIcon={ICON}
        title="R"
        typeLabel="details.type.report"
        status={null}
        info={[]}
        contentLabel="details.content.report"
        contentTab="details.content.report"
        pdfLocked
      >
        {marker('c')}
      </DocumentDetails>,
    );
    expect(getByText('success.actions.sharePdfLocked')).toBeTruthy();
  });
});

describe('DocumentDetails — terminology', () => {
  it('renders no "inspector" / "ინსპექტორ" anywhere', () => {
    const { container } = render(
      <DocumentDetails
        {...handlers}
        type="act"
        tileIcon={ICON}
        title="A"
        typeLabel="details.type.act"
        status={{ tone: 'safe', label: 'success.status.safe' }}
        info={[{ label: 'details.info.expert', value: 'Giorgi' }]}
        contentLabel="details.content.act"
        contentTab="details.content.act"
        signatures={{ mode: 'edit', state: emptyState(), creatorName: 'Giorgi' }}
        certificates={{ items: [], onAdd: vi.fn(), onOpen: vi.fn() }}
      >
        {marker('c')}
      </DocumentDetails>,
    );
    const text = (container.textContent ?? '').toLowerCase();
    expect(text).not.toContain('inspector');
    expect(text).not.toContain('ინსპექტორ');
  });
});

describe('content — InspectionPointsContent', () => {
  const q = (id: string, order: number, title: string): Question =>
    ({ id, template_id: 't', section: 0, order, type: 'yes_no', title, min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null }) as unknown as Question;
  const ans = (qid: string, value_bool: boolean | null, value_text: string | null = null): Answer =>
    ({ id: `a-${qid}`, inspection_id: 'i', question_id: qid, value_bool, value_num: null, value_text, grid_values: null, comment: null, notes: null }) as Answer;

  it('renders one row per point with OK / issue pills', () => {
    const { getByText } = render(
      <InspectionPointsContent
        questions={[q('q1', 1, 'Scaffold stability'), q('q2', 2, 'Guardrail')]}
        answers={[ans('q1', true), ans('q2', false)]}
      />,
    );
    expect(getByText('Scaffold stability')).toBeTruthy();
    expect(getByText('Guardrail')).toBeTruthy();
    expect(getByText('details.content.ok').getAttribute('data-badge')).toBe('success');
    expect(getByText('details.content.issue').getAttribute('data-badge')).toBe('danger');
  });

  it('shows the empty key when there are no questions', () => {
    const { getByText } = render(<InspectionPointsContent questions={[]} answers={[]} />);
    expect(getByText('details.content.empty')).toBeTruthy();
  });
});

describe('content — NoteBlocksContent', () => {
  it('renders titled note blocks and drops empty ones', () => {
    const { getByText, queryByText } = render(
      <NoteBlocksContent
        blocks={[{ text: 'A worker fell.' }, { label: 'details.info.witnesses', text: 'Nino' }, { text: '   ' }]}
      />,
    );
    expect(getByText('A worker fell.')).toBeTruthy();
    expect(getByText('details.info.witnesses')).toBeTruthy();
    expect(getByText('Nino')).toBeTruthy();
    expect(queryByText('details.content.empty')).toBeNull();
  });

  it('shows the empty key when all blocks are blank', () => {
    const { getByText } = render(<NoteBlocksContent blocks={[{ text: '' }]} />);
    expect(getByText('details.content.empty')).toBeTruthy();
  });
});

describe('content — ReportSlidesContent', () => {
  const slide = (id: string, order: number, title: string): ReportSlide =>
    ({ id, order, title, description: '', image_path: null, annotated_image_path: null, images: [] }) as ReportSlide;

  it('renders a card per slide and fires onOpenSlide on tap', () => {
    const onOpen = vi.fn();
    const { getByText } = render(
      <ReportSlidesContent
        slides={[slide('s1', 0, 'Intro'), slide('s2', 1, 'Stats')]}
        onOpenSlide={onOpen}
      />,
    );
    expect(getByText('Intro')).toBeTruthy();
    fireEvent.click(getByText('Stats'));
    expect(onOpen).toHaveBeenCalledWith('s2');
  });
});

describe('routing contract — list tap → details, never success', () => {
  it('a COMPLETED generic/harness act routes to /inspections/[id] (DocumentDetails)', () => {
    expect(routeForInspection('xaracho', 'abc', true)).toBe('/inspections/abc');
    expect(routeForInspection('harness', 'abc', true)).toBe('/inspections/abc');
    // and a draft still goes to the wizard, not the details screen
    expect(routeForInspection('xaracho', 'abc', false)).toBe('/inspections/abc/wizard');
  });
});
