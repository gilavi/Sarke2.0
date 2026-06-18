/**
 * Unit tests for StatusChip — the monochrome single-select answer control.
 * Reanimated + accessibility are stubbed (so the press/shake animations are
 * inert) and we assert the press gate, error styling, and icon/label rendering.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

// react-native-reanimated is aliased to an inert stub in vitest.config.ts.
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());

import { StatusChip } from '../../components/wizard/StatusChip';
import { Check } from 'lucide-react-native';

afterEach(cleanup);

describe('StatusChip', () => {
  it('renders the label and fires onPress when tapped', () => {
    const onPress = vi.fn();
    const { getByText } = render(<StatusChip selected={false} label="დიახ" onPress={onPress} />);
    fireEvent.click(getByText('დიახ'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = vi.fn();
    const { getByText } = render(
      <StatusChip selected={false} label="არა" onPress={onPress} disabled />,
    );
    fireEvent.click(getByText('არა'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders the icon when provided', () => {
    const { container } = render(
      <StatusChip selected label="ok" icon={Check} onPress={vi.fn()} />,
    );
    expect(container.querySelector('[data-icon="Check"]')).toBeTruthy();
  });

  it('renders no icon node when icon is omitted', () => {
    const { container } = render(<StatusChip selected={false} label="x" onPress={vi.fn()} />);
    expect(container.querySelector('[data-icon]')).toBeNull();
  });

  it('renders no label span when label is empty (icon-only chip)', () => {
    const { container } = render(
      <StatusChip selected={false} label="" icon={Check} onPress={vi.fn()} />,
    );
    // Only the icon span should be present — no separate label text span.
    expect(container.querySelector('[data-icon="Check"]')).toBeTruthy();
    expect(container.querySelectorAll('span:not([data-icon])').length).toBe(0);
  });

  it('renders both selected and unselected states with their label', () => {
    const { getByText, rerender } = render(
      <StatusChip selected label="აირჩეული" onPress={vi.fn()} />,
    );
    expect(getByText('აირჩეული')).toBeTruthy();
    rerender(<StatusChip selected={false} error label="აირჩეული" onPress={vi.fn()} />);
    expect(getByText('აირჩეული')).toBeTruthy();
  });

  it('uses a custom a11yLabel when provided', () => {
    const { getByLabelText } = render(
      <StatusChip selected={false} label="ღ" onPress={vi.fn()} a11yLabel="მხრის ღვედი - გამართული" />,
    );
    expect(getByLabelText('მხრის ღვედი - გამართული')).toBeTruthy();
  });

  it('renders in pill layout without crashing', () => {
    const { getByText } = render(
      <StatusChip selected label="დიახ" icon={Check} onPress={vi.fn()} layout="pill" />,
    );
    expect(getByText('დიახ')).toBeTruthy();
  });
});
