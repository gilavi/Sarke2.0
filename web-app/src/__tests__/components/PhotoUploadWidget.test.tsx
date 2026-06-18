/**
 * PhotoUploadWidget (46% covered) - upload, thumbnail, delete.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

vi.mock('@/lib/photoUpload', () => ({
  signedInspectionPhotoUrl: vi.fn(() => Promise.resolve('https://signed/p')),
  uploadInspectionPhoto: vi.fn(() => Promise.resolve('uploaded/path.jpg')),
  deleteInspectionPhoto: vi.fn(() => Promise.resolve()),
}));

import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import { uploadInspectionPhoto, deleteInspectionPhoto } from '@/lib/photoUpload';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PhotoUploadWidget', () => {
  it('renders nothing visible when paths is empty + disabled', () => {
    render(
      <PhotoUploadWidget
        paths={[]} disabled prefix="x" inspectionId="i1" itemId={1}
        onAdd={() => {}} onRemove={() => {}}
      />,
    );
    // Both upload button and delete button are absent.
    expect(screen.queryByLabelText('ფოტოს დამატება')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ფოტოს წაშლა')).not.toBeInTheDocument();
  });

  it('renders the camera button + file input when not disabled and empty', () => {
    render(
      <PhotoUploadWidget
        paths={[]} prefix="x" inspectionId="i1" itemId={1}
        onAdd={() => {}} onRemove={() => {}}
      />,
    );
    expect(screen.getByLabelText('ფოტოს დამატება')).toBeInTheDocument();
  });

  it('clicking camera + selecting a file calls uploadInspectionPhoto + onAdd', async () => {
    const onAdd = vi.fn();
    const { container } = render(
      <PhotoUploadWidget
        paths={[]} prefix="x" inspectionId="i1" itemId={1}
        onAdd={onAdd} onRemove={() => {}}
      />,
    );
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(uploadInspectionPhoto).toHaveBeenCalled());
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('uploaded/path.jpg'));
  });

  it('renders thumbnails for existing paths + delete button', async () => {
    const onRemove = vi.fn();
    render(
      <PhotoUploadWidget
        paths={['x/y.jpg']} prefix="x" inspectionId="i1" itemId={1}
        onAdd={() => {}} onRemove={onRemove}
      />,
    );
    expect(screen.getByLabelText('ფოტოს წაშლა')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('ფოტოს წაშლა'));
    await waitFor(() => expect(deleteInspectionPhoto).toHaveBeenCalledWith('x/y.jpg'));
    expect(onRemove).toHaveBeenCalledWith('x/y.jpg');
  });

  it('uses uploadFn override when provided', async () => {
    const uploadFn = vi.fn(() => Promise.resolve('custom/path.jpg'));
    const onAdd = vi.fn();
    const { container } = render(
      <PhotoUploadWidget
        paths={[]} prefix="x" inspectionId="i1" itemId={1}
        onAdd={onAdd} onRemove={() => {}}
        uploadFn={uploadFn}
      />,
    );
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'b.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(uploadFn).toHaveBeenCalled());
    expect(uploadInspectionPhoto).not.toHaveBeenCalled();
  });
});
