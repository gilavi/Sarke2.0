/**
 * Unit tests for the unified FlowSuccessScreen.
 *
 * Covers, per flow: correct title/subtitle, which sections show/hide, the hero
 * pill tone, the editable-signature list (signed vs awaiting + add row), the
 * view-only signature list (eye icon, "view only" tag, no add row), the
 * certificate list (attached + add), and that the back / share controls fire
 * their handlers. `t` is the identity function, so every assertion is on an
 * i18n KEY — proving no literal strings leak into the component.
 *
 * The check disc (SVG + reanimated) and the SignaturesScreen modal are stubbed;
 * Button/IconButton/Badge are stubbed to plain DOM so presses + pill tones are
 * trivially queryable. The list rows + sections render for real.
 */
import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
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
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('../../components/success/SuccessCheckDisc', () => ({
  SuccessCheckDisc: () => React.createElement('div', { 'data-testid': 'check' }),
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

import { FlowSuccessScreen } from '../../components/success/FlowSuccessScreen';
import type { SignaturesState } from '../../features/signatures';
import { haptic } from '../../lib/haptics';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const sigFns = {
  setCreatorSignature: vi.fn(),
  clearCreatorSignature: vi.fn(),
  addRow: vi.fn(),
  removeRow: vi.fn(),
  clear: vi.fn(),
};
const signedState = (rows: { id: string }[] = []): SignaturesState =>
  ({ creatorSignature: { pngBase64: 'x', capturedAt: new Date() }, additionalRows: rows, ...sigFns }) as any;
const emptyState = (rows: { id: string }[] = []): SignaturesState =>
  ({ creatorSignature: null, additionalRows: rows, ...sigFns }) as any;

const baseHandlers = { onSharePdf: vi.fn(), onBackHome: vi.fn(), onBackEdit: vi.fn() };

describe('FlowSuccessScreen — per-flow shape', () => {
  it('act: title/subtitle, safe hero pill, signatures + certificates', () => {
    const { getByText, queryByText } = render(
      <FlowSuccessScreen
        {...baseHandlers}
        flow="act"
        signatures={signedState()}
        creatorName="Giorgi Kheladze"
        certificates={[{ id: 'c1', title: 'ISO 45001', subtitle: 'sub' }]}
        onAddCertificate={vi.fn()}
        onOpenCertificate={vi.fn()}
      />,
    );
    expect(getByText('success.act.title')).toBeTruthy();
    expect(getByText('success.act.subtitle')).toBeTruthy();
    const pill = getByText('success.status.safe');
    expect(pill.getAttribute('data-badge')).toBe('success');
    expect(getByText('success.signatures.heading')).toBeTruthy();
    expect(getByText('success.certificates.heading')).toBeTruthy();
    expect(queryByText('success.signatures.viewOnly')).toBeNull();
  });

  it('incident: severe hero pill, signatures shown, certificates hidden', () => {
    const { getByText, queryByText } = render(
      <FlowSuccessScreen {...baseHandlers} flow="incident" signatures={emptyState()} creatorName="X" />,
    );
    expect(getByText('success.incident.title')).toBeTruthy();
    const pill = getByText('success.status.severe');
    expect(pill.getAttribute('data-badge')).toBe('danger');
    expect(getByText('success.signatures.heading')).toBeTruthy();
    expect(queryByText('success.certificates.heading')).toBeNull();
  });

  it('report: neither signatures nor certificates, no hero pill', () => {
    const { getByText, queryByText } = render(<FlowSuccessScreen {...baseHandlers} flow="report" />);
    expect(getByText('success.report.title')).toBeTruthy();
    expect(queryByText('success.signatures.heading')).toBeNull();
    expect(queryByText('success.certificates.heading')).toBeNull();
    expect(queryByText('success.status.safe')).toBeNull();
    expect(queryByText('success.status.severe')).toBeNull();
  });

  it('instruction: view-only signatures, no certificates', () => {
    const { getByText, queryByText, queryAllByText } = render(
      <FlowSuccessScreen
        {...baseHandlers}
        flow="instruction"
        participants={[{ name: 'Nino Beridze', signed: true }, { name: 'Davit Lomidze', signed: false }]}
      />,
    );
    expect(getByText('success.instruction.title')).toBeTruthy();
    expect(getByText('success.signatures.heading')).toBeTruthy();
    expect(getByText('success.signatures.viewOnly')).toBeTruthy();
    expect(getByText('Nino Beridze')).toBeTruthy();
    expect(getByText('Davit Lomidze')).toBeTruthy();
    // no "add person" row in view-only mode
    expect(queryByText('success.signatures.addPerson')).toBeNull();
    // participant rows use the eye signifier
    expect(queryAllByText('success.signatures.participant').length).toBe(2);
    expect(queryByText('success.certificates.heading')).toBeNull();
  });
});

describe('FlowSuccessScreen — signature list states', () => {
  it('signed creator shows the signed pill; awaiting otherwise', () => {
    const signed = render(
      <FlowSuccessScreen {...baseHandlers} flow="act" signatures={signedState()} creatorName="A B" />,
    );
    expect(signed.getAllByText('success.signatures.signed').length).toBeGreaterThan(0);
    cleanup();
    const awaiting = render(
      <FlowSuccessScreen {...baseHandlers} flow="act" signatures={emptyState()} creatorName="A B" />,
    );
    expect(awaiting.getAllByText('success.signatures.awaiting').length).toBeGreaterThan(0);
  });

  it('renders one blank/awaiting row per additional signing slot + an add row', () => {
    const { getAllByText, getByText } = render(
      <FlowSuccessScreen
        {...baseHandlers}
        flow="act"
        signatures={emptyState([{ id: 'r1' }, { id: 'r2' }])}
        creatorName="A B"
      />,
    );
    expect(getAllByText('success.signatures.blankLine').length).toBe(2);
    expect(getByText('success.signatures.addPerson')).toBeTruthy();
  });
});

describe('FlowSuccessScreen — certificates', () => {
  it('shows attached certs + an add row, and fires onOpen / onAdd', () => {
    const onOpen = vi.fn();
    const onAdd = vi.fn();
    const { getByText } = render(
      <FlowSuccessScreen
        {...baseHandlers}
        flow="act"
        signatures={signedState()}
        creatorName="A B"
        certificates={[{ id: 'c9', title: 'ISO 45001', subtitle: 'safety' }]}
        onOpenCertificate={onOpen}
        onAddCertificate={onAdd}
      />,
    );
    expect(getByText('success.certificates.attached')).toBeTruthy();
    fireEvent.click(getByText('ISO 45001'));
    expect(onOpen).toHaveBeenCalledWith('c9');
    fireEvent.click(getByText('success.certificates.add'));
    expect(onAdd).toHaveBeenCalled();
  });
});

describe('FlowSuccessScreen — actions', () => {
  it('back button fires onBackEdit', () => {
    const onBackEdit = vi.fn();
    const { getByLabelText } = render(
      <FlowSuccessScreen {...baseHandlers} onBackEdit={onBackEdit} flow="report" />,
    );
    fireEvent.click(getByLabelText('success.a11y.back'));
    expect(onBackEdit).toHaveBeenCalled();
  });

  it('primary fires onSharePdf and shows the locked label when locked', () => {
    const onSharePdf = vi.fn();
    const { getByText, rerender } = render(
      <FlowSuccessScreen {...baseHandlers} onSharePdf={onSharePdf} flow="report" />,
    );
    fireEvent.click(getByText('success.actions.sharePdf'));
    expect(onSharePdf).toHaveBeenCalled();
    rerender(<FlowSuccessScreen {...baseHandlers} onSharePdf={onSharePdf} flow="report" pdfLocked />);
    expect(getByText('success.actions.sharePdfLocked')).toBeTruthy();
  });

  it('secondary fires onBackHome', () => {
    const onBackHome = vi.fn();
    const { getByText } = render(
      <FlowSuccessScreen {...baseHandlers} onBackHome={onBackHome} flow="report" />,
    );
    fireEvent.click(getByText('success.actions.backHome'));
    expect(onBackHome).toHaveBeenCalled();
  });

  it('hides the back button when onBackEdit is not provided', () => {
    const { queryByTestId } = render(
      <FlowSuccessScreen onSharePdf={vi.fn()} onBackHome={vi.fn()} flow="report" />,
    );
    expect(queryByTestId('back-btn')).toBeNull();
  });
});

describe('FlowSuccessScreen — hero override + mount haptic', () => {
  it('uses an explicit hero prop verbatim', () => {
    const { getByText } = render(
      <FlowSuccessScreen {...baseHandlers} flow="report" hero={{ tone: 'safe', label: 'CUSTOM HERO' }} />,
    );
    const pill = getByText('CUSTOM HERO');
    expect(pill.getAttribute('data-badge')).toBe('success');
  });

  it('hides the hero pill when hero is explicitly null (overriding the flow default)', () => {
    const { queryByText } = render(
      <FlowSuccessScreen {...baseHandlers} flow="act" hero={null} signatures={emptyState()} creatorName="A B" />,
    );
    expect(queryByText('success.status.safe')).toBeNull();
  });

  it('fires the completion haptic ~400ms after mount', () => {
    vi.useFakeTimers();
    try {
      render(<FlowSuccessScreen {...baseHandlers} flow="report" />);
      expect(haptic.inspectionComplete).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(400));
      expect(haptic.inspectionComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
