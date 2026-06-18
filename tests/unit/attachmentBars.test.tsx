/**
 * Unit tests for AttachmentBars — the shared photo + note attachment bars.
 * PhotoThumb + DebouncedNotes are stubbed. Covers the photo bar press, the
 * thumbnail grid + delete, and the note bar's open/closed/auto-open states.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('../../features/inspection-wizard/PhotoThumb', () => ({
  PhotoThumb: ({ photo }: { photo: { id: string } }) =>
    React.createElement('div', { 'data-testid': `thumb-${photo.id}` }),
}));
vi.mock('../../features/inspection-wizard/DebouncedNotes', () => ({
  DebouncedNotes: () => React.createElement('div', { 'data-testid': 'notes' }),
}));

import { AttachmentBars } from '../../features/inspection-wizard/AttachmentBars';

afterEach(cleanup);

const photo = (id: string) => ({ id, path: `/p/${id}.jpg` }) as any;

describe('AttachmentBars', () => {
  it('fires onPickPhoto when the photo bar is pressed', () => {
    const onPickPhoto = vi.fn();
    const { getByLabelText } = render(
      <AttachmentBars photos={[]} onPickPhoto={onPickPhoto} onDeletePhoto={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('ფოტოს დამატება'));
    expect(onPickPhoto).toHaveBeenCalled();
  });

  it('renders a thumbnail per photo and deletes the tapped one', () => {
    const onDeletePhoto = vi.fn();
    const photos = [photo('a'), photo('b')];
    const { getByTestId, getAllByLabelText } = render(
      <AttachmentBars photos={photos} onPickPhoto={vi.fn()} onDeletePhoto={onDeletePhoto} />,
    );
    expect(getByTestId('thumb-a')).toBeTruthy();
    expect(getByTestId('thumb-b')).toBeTruthy();
    fireEvent.click(getAllByLabelText('ფოტოს წაშლა')[1]);
    expect(onDeletePhoto).toHaveBeenCalledWith(photos[1]);
  });

  it('calls onViewPhoto when a thumbnail is tapped', () => {
    const onViewPhoto = vi.fn();
    const photos = [photo('a')];
    const { getByLabelText } = render(
      <AttachmentBars photos={photos} onPickPhoto={vi.fn()} onDeletePhoto={vi.fn()} onViewPhoto={onViewPhoto} />,
    );
    fireEvent.click(getByLabelText('ფოტოს ნახვა'));
    expect(onViewPhoto).toHaveBeenCalledWith(photos[0]);
  });

  it('omits the note bar entirely when onNoteCommit is not provided', () => {
    const { queryByText, queryByTestId } = render(
      <AttachmentBars photos={[]} onPickPhoto={vi.fn()} onDeletePhoto={vi.fn()} />,
    );
    expect(queryByText('შენიშვნა')).toBeNull();
    expect(queryByTestId('notes')).toBeNull();
  });

  it('opens the note editor when the closed note bar is tapped', () => {
    const { getByLabelText, getByTestId, queryByTestId } = render(
      <AttachmentBars photos={[]} onPickPhoto={vi.fn()} onDeletePhoto={vi.fn()} onNoteCommit={vi.fn()} />,
    );
    expect(queryByTestId('notes')).toBeNull();
    fireEvent.click(getByLabelText('შენიშვნის დამატება'));
    expect(getByTestId('notes')).toBeTruthy();
  });

  it('auto-opens the note editor when a note already exists', () => {
    const { getByTestId } = render(
      <AttachmentBars
        photos={[]}
        onPickPhoto={vi.fn()}
        onDeletePhoto={vi.fn()}
        note="არსებული შენიშვნა"
        onNoteCommit={vi.fn()}
      />,
    );
    expect(getByTestId('notes')).toBeTruthy();
  });
});
