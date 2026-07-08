/**
 * Unit tests for SignatureStage — the briefing signature capture block. The
 * native signature canvas is stubbed. Covers the header text, the optional
 * caption, and the "sign here" hint that shows only before the first stroke.
 */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
// The "sign here" hint resolves via t(); back the mock with the real ka.json so
// the Georgian-string assertion keeps testing the shipped copy.
vi.mock('react-i18next', async () => (await import('../mocks/rn-ui')).i18nKaMock());
vi.mock('react-native-signature-canvas', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'canvas' }),
}));

import { SignatureStage } from '../../components/briefings/SignatureStage';

afterEach(cleanup);

const base = {
  eyebrow: 'ხელს აწერს',
  name: 'გიორგი ხ.',
  canvasKey: 'k1',
  canvasRef: { current: null },
  onBegin: vi.fn(),
  onEnd: vi.fn(),
  onOK: vi.fn(),
};

describe('SignatureStage', () => {
  it('renders the eyebrow, name, and canvas', () => {
    const { getByText, getByTestId } = render(<SignatureStage {...base} hasStroke={false} />);
    expect(getByText('ხელს აწერს')).toBeTruthy();
    expect(getByText('გიორგი ხ.')).toBeTruthy();
    expect(getByTestId('canvas')).toBeTruthy();
  });

  it('renders the caption only when provided', () => {
    const { queryByText, rerender } = render(<SignatureStage {...base} hasStroke={false} />);
    expect(queryByText('2 / 3')).toBeNull();
    rerender(<SignatureStage {...base} caption="2 / 3" hasStroke={false} />);
    expect(queryByText('2 / 3')).toBeTruthy();
  });

  it('shows the "sign here" hint before a stroke and hides it after', () => {
    // Current shipped copy of briefings.signHereHint (locales/ka.json).
    const HINT = 'ხელი მოაწერეთ ჩარჩოში';
    const { queryByText, rerender } = render(<SignatureStage {...base} hasStroke={false} />);
    expect(queryByText(HINT)).toBeTruthy();
    rerender(<SignatureStage {...base} hasStroke />);
    expect(queryByText(HINT)).toBeNull();
  });
});
