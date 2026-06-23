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

// The picker paints its UI only once the projects query has settled (the
// `(isFetching || !isFetched) && length===0` loading guard from CLAUDE.md); with
// 0 settled projects there's a real (empty) list to show, so the picker renders.
// `isFetched: true` + length !== 1 is what keeps `willAutoPick` false.
vi.mock('../../lib/apiHooks', () => ({
  useProjects: () => ({ data: [], isFetched: true }),
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
  // i18n isn't initialised in this env, so `t(key)` returns the raw key. The
  // redesigned component routes all its copy through `useTranslation`, so the
  // dashed "new project" control is labelled with its key, not the literal
  // Georgian string the pre-redesign component hard-coded.
  const NEW_PROJECT_LABEL = 'flowProjectPicker.newProject';

  it('opens the create-project sheet from the dashed button', () => {
    const { getByLabelText, queryByTestId } = renderPicker();
    expect(queryByTestId('sheet')).toBeNull();
    fireEvent.click(getByLabelText(NEW_PROJECT_LABEL));
    expect(queryByTestId('sheet')).toBeTruthy();
  });

  // Redesign: "continue" is no longer disabled before a project is picked.
  // Instead it's always enabled and gates inside its handler — pressing it with
  // nothing selected surfaces an inline error (and a validation haptic) without
  // calling `onPicked`; only after a selection does it forward the project.
  it('gates continue on selection, then calls onPicked once a project is chosen', () => {
    const { getByTestId, onPicked } = renderPicker();
    const cont = getByTestId('continue') as HTMLButtonElement;
    expect(cont.disabled).toBe(false);

    // Pressing with nothing selected must NOT advance the flow.
    fireEvent.click(cont);
    expect(onPicked).not.toHaveBeenCalled();

    fireEvent.click(getByTestId('pick'));
    fireEvent.click(getByTestId('continue'));
    expect(onPicked).toHaveBeenCalledWith({ id: 'p7', name: 'P7' });
  });

  it('redirects into the flow with the new project id on creation', () => {
    const { getByLabelText, getByTestId } = renderPicker({ action: 'briefing' });
    fireEvent.click(getByLabelText(NEW_PROJECT_LABEL));
    fireEvent.click(getByTestId('created'));
    expect(routerReplace).toHaveBeenCalledWith('/briefings/new?projectId=p9');
  });
});
