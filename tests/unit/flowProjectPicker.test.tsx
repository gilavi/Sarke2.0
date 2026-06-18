/**
 * Unit tests for FlowProjectPicker — the "pick a project" first step for the
 * incident/briefing/report flows. Header, list, sheet, Button and the data
 * hooks are stubbed. Covers opening the create sheet, the continue gate, and
 * the new-project redirect.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));

const routerReplace = vi.fn();
vi.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ replace: routerReplace }) }));

vi.mock('../../lib/apiHooks', () => ({
  useProjects: () => ({ data: [] }),
  useTemplates: () => ({ data: [] }),
}));
vi.mock('../../components/FlowHeader', () => ({ FlowHeader: () => React.createElement('div', { 'data-testid': 'header' }) }));
vi.mock('../../components/ui', () => ({
  Button: ({ title, disabled, onPress }: { title: string; disabled?: boolean; onPress: () => void }) =>
    React.createElement('button', { 'data-testid': 'continue', disabled: !!disabled, onClick: onPress }, title),
}));
vi.mock('../../components/inspection-steps', () => ({
  ProjectPickerStep: ({ onSelect }: { onSelect: (p: unknown) => void }) =>
    React.createElement('button', { 'data-testid': 'pick', onClick: () => onSelect({ id: 'p7', name: 'P7' }) }, 'pick'),
}));
vi.mock('../../components/home/ProjectPickerSheet', () => ({
  ProjectPickerSheet: ({ visible, onProjectCreated }: { visible: boolean; onProjectCreated: (id: string) => void }) =>
    visible
      ? React.createElement(
          'div',
          { 'data-testid': 'sheet' },
          React.createElement('button', { 'data-testid': 'created', onClick: () => onProjectCreated('p9') }),
        )
      : null,
}));

import { FlowProjectPicker } from '../../components/FlowProjectPicker';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function renderPicker(props: Partial<React.ComponentProps<typeof FlowProjectPicker>> = {}) {
  const onPicked = vi.fn();
  const utils = render(
    <FlowProjectPicker flowTitle="ინციდენტი" action="incident" onPicked={onPicked} onBack={vi.fn()} {...props} />,
  );
  return { ...utils, onPicked };
}

describe('FlowProjectPicker', () => {
  it('opens the create-project sheet from the dashed button', () => {
    const { getByLabelText, queryByTestId } = renderPicker();
    expect(queryByTestId('sheet')).toBeNull();
    fireEvent.click(getByLabelText('ახალი პროექტი'));
    expect(queryByTestId('sheet')).toBeTruthy();
  });

  it('disables continue until a project is selected, then calls onPicked', () => {
    const { getByTestId, onPicked } = renderPicker();
    const cont = getByTestId('continue') as HTMLButtonElement;
    expect(cont.disabled).toBe(true);

    fireEvent.click(getByTestId('pick'));
    expect((getByTestId('continue') as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(getByTestId('continue'));
    expect(onPicked).toHaveBeenCalledWith({ id: 'p7', name: 'P7' });
  });

  it('redirects into the flow with the new project id on creation', () => {
    const { getByLabelText, getByTestId } = renderPicker({ action: 'briefing' });
    fireEvent.click(getByLabelText('ახალი პროექტი'));
    fireEvent.click(getByTestId('created'));
    expect(routerReplace).toHaveBeenCalledWith('/briefings/new?projectId=p9');
  });
});
