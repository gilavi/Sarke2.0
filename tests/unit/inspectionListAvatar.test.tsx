/**
 * Unit tests for InspectionListAvatar — a thin wrapper that always renders the
 * shared InspectionTypeAvatar in its circular, muted list-row variant. We mock
 * the child to capture the forwarded props.
 */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

let captured: Record<string, unknown> | null = null;
vi.mock('../../components/InspectionTypeAvatar', () => ({
  InspectionTypeAvatar: (props: Record<string, unknown>) => {
    captured = props;
    return React.createElement('div', { 'data-testid': 'type-avatar' });
  },
}));

import { InspectionListAvatar } from '../../components/InspectionListAvatar';

afterEach(() => {
  cleanup();
  captured = null;
});

describe('InspectionListAvatar', () => {
  it('forwards category/status/style and always sets circle + muted', () => {
    const style = { margin: 4 };
    render(<InspectionListAvatar category="bobcat" status="completed" style={style} />);
    expect(captured).toMatchObject({
      category: 'bobcat',
      status: 'completed',
      style,
      circle: true,
      muted: true,
    });
  });

  it('defaults size to 44', () => {
    render(<InspectionListAvatar category="harness" />);
    expect(captured?.size).toBe(44);
  });

  it('passes an explicit size through', () => {
    render(<InspectionListAvatar category="harness" size={60} />);
    expect(captured?.size).toBe(60);
  });
});
