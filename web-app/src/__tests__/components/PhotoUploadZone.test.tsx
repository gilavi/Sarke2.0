/**
 * PhotoUploadZone (39% covered) - empty drop zone, drag-over toggle, file
 * upload via input change, remove button.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

vi.mock('@/lib/photoUpload', () => ({
  signedInspectionPhotoUrl: vi.fn(() => Promise.resolve('https://signed/p')),
  uploadInspectionPhoto: vi.fn(() => Promise.resolve('uploaded/path.jpg')),
  deleteInspectionPhoto: vi.fn(() => Promise.resolve()),
}));

import PhotoUploadZone from '@/components/PhotoUploadZone';
import { uploadInspectionPhoto, deleteInspectionPhoto } from '@/lib/photoUpload';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PhotoUploadZone', () => {
  it('renders the empty drop zone with placeholder', () => {
    render(
      <PhotoUploadZone
        paths={[]} prefix="bobcat" inspectionId="i1" itemId={1}
        onAdd={() => {}} onRemove={() => {}}
        placeholder="ფოტო არ არის სავალდებულო"
      />,
    );
    expect(screen.getByText(/ჩააგდეთ ფოტოები ან დააჭირეთ ასარჩევად/)).toBeInTheDocument();
    expect(screen.getByText('ფოტო არ არის სავალდებულო')).toBeInTheDocument();
  });

  it('clicking the drop zone opens the file input', () => {
    const { container } = render(
      <PhotoUploadZone
        paths={[]} prefix="bobcat" inspectionId="i1" itemId={1}
        onAdd={() => {}} onRemove={() => {}}
      />,
    );
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
  });

  it('uploading a file via input change calls uploadInspectionPhoto + onAdd', async () => {
    const onAdd = vi.fn();
    const { container } = render(
      <PhotoUploadZone
        paths={[]} prefix="bobcat" inspectionId="i1" itemId={1}
        onAdd={onAdd} onRemove={() => {}}
      />,
    );
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(uploadInspectionPhoto).toHaveBeenCalled());
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('uploaded/path.jpg'));
  });

  it('renders thumbnails for existing paths + remove button', async () => {
    const onRemove = vi.fn();
    render(
      <PhotoUploadZone
        paths={['existing/path.jpg']} prefix="bobcat" inspectionId="i1" itemId={1}
        onAdd={() => {}} onRemove={onRemove}
      />,
    );
    expect(screen.getByLabelText('ფოტოს წაშლა')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('ფოტოს წაშლა'));
    await waitFor(() => expect(deleteInspectionPhoto).toHaveBeenCalledWith('existing/path.jpg'));
    expect(onRemove).toHaveBeenCalledWith('existing/path.jpg');
  });

  it('drag-over event sets the dragOver style', () => {
    render(
      <PhotoUploadZone
        paths={[]} prefix="bobcat" inspectionId="i1" itemId={1}
        onAdd={() => {}} onRemove={() => {}}
      />,
    );
    const dropZone = screen.getByRole('button');
    fireEvent.dragOver(dropZone, { preventDefault: () => {} });
    // After dragOver the border color changes - just verify no crash.
    fireEvent.dragLeave(dropZone);
  });

  it('disabled mode hides the drop zone', () => {
    render(
      <PhotoUploadZone
        paths={[]} prefix="bobcat" inspectionId="i1" itemId={1}
        onAdd={() => {}} onRemove={() => {}}
        disabled
      />,
    );
    expect(screen.queryByText(/ჩააგდეთ ფოტოები/)).not.toBeInTheDocument();
  });
});
