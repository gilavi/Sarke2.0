/**
 * PhotoUploadWidget - upload, view, and delete photos for a single item.
 *
 * Renders a compact thumbnail row with an "add photo" button. Each thumbnail
 * is clickable (opens a lightbox). The ✕ on each thumbnail removes the photo
 * and calls `onRemove(path)`.
 *
 * Props:
 *   - paths         Current photo_paths array (storage paths, not signed URLs)
 *   - disabled      When true, hides upload/delete controls
 *   - prefix        Storage prefix e.g. "bobcat" (unused when uploadFn is set)
 *   - inspectionId  UUID of the parent inspection (unused when uploadFn is set)
 *   - itemId        Item identifier (unused when uploadFn is set)
 *   - onAdd(path)   Called after a successful upload with the new storage path
 *   - onRemove(path) Called when the user confirms removal
 *   - uploadFn      Override default upload (answer-photos bucket). Receives File,
 *                   returns storage path. Use for other buckets (incidents, etc.).
 *   - signedUrlFn   Override default signed-URL resolver.
 *   - deleteFn      Override default delete (best-effort).
 */
import { useEffect, useRef, useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ActionIcon, Modal } from '@mantine/core';
import { signedInspectionPhotoUrl, uploadInspectionPhoto, deleteInspectionPhoto } from '@/lib/photoUpload';
import { humanizeError } from '@/lib/errors';

interface Props {
  paths: string[];
  disabled?: boolean;
  prefix: string;
  inspectionId: string;
  itemId: string | number;
  onAdd: (path: string) => void;
  onRemove: (path: string) => void;
  uploadFn?: (file: File) => Promise<string>;
  signedUrlFn?: (path: string) => Promise<string>;
  deleteFn?: (path: string) => Promise<void>;
}

export default function PhotoUploadWidget({
  paths,
  disabled = false,
  prefix,
  inspectionId,
  itemId,
  onAdd,
  onRemove,
  uploadFn,
  signedUrlFn,
  deleteFn,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<number | null>(null);

  const resolveUrl = signedUrlFn ?? signedInspectionPhotoUrl;

  // Resolve signed URLs for all paths
  useEffect(() => {
    let cancelled = false;
    const missing = paths.filter((p) => !signedUrls[p]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (p) => {
        try {
          const url = await resolveUrl(p);
          return [p, url] as const;
        } catch {
          return [p, ''] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setSignedUrls((prev) => {
        const next = { ...prev };
        for (const [p, url] of pairs) next[p] = url;
        return next;
      });
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths.join(','), resolveUrl]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightbox === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setLightbox((i) => i !== null ? Math.min(i + 1, paths.length - 1) : null);
      if (e.key === 'ArrowLeft') setLightbox((i) => i !== null ? Math.max(i - 1, 0) : null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, paths.length]);

  const doUpload = uploadFn ?? ((file: File) => uploadInspectionPhoto(prefix, inspectionId, itemId, file));

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const path = await doUpload(file);
        onAdd(path);
      }
    } catch (e) {
      setUploadError(humanizeError(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const doDelete = deleteFn ?? deleteInspectionPhoto;

  async function handleRemove(path: string) {
    try {
      await doDelete(path);
    } catch {
      // best-effort - row is removed regardless
    }
    onRemove(path);
  }

  if (paths.length === 0 && disabled) return null;

  return (
    <div className="mt-2">
      {/* Thumbnail row */}
      {paths.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {paths.map((p, i) => (
            <div key={p} className="relative">
              <button
                type="button"
                onClick={() => setLightbox(i)}
                className="h-16 w-16 overflow-hidden rounded-md border border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {signedUrls[p] ? (
                  <img
                    src={signedUrls[p]}
                    alt={`ფოტო ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-neutral-100" />
                )}
              </button>
              {!disabled && (
                <ActionIcon
                  variant="filled"
                  color="dark"
                  size="xs"
                  radius="xl"
                  onClick={() => handleRemove(p)}
                  aria-label="ფოტოს წაშლა"
                  style={{ position: 'absolute', top: -6, right: -6 }}
                >
                  <X size={10} />
                </ActionIcon>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {!disabled && (
        <>
          <ActionIcon
            variant="light"
            color="brand"
            radius="xl"
            size="lg"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="ფოტოს დამატება"
          >
            <Camera size={16} />
          </ActionIcon>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </>
      )}

      {uploadError && (
        <p className="mt-1 text-xs text-red-600">{uploadError}</p>
      )}

      {/* Lightbox */}
      <Modal
        opened={lightbox !== null}
        onClose={() => setLightbox(null)}
        size="xl"
        centered
        withCloseButton
        radius="md"
        styles={{ body: { padding: 0 }, content: { background: '#000' } }}
      >
        {lightbox !== null && (
          <div className="relative flex items-center justify-center" style={{ minHeight: 400 }}>
            {signedUrls[paths[lightbox]] ? (
              <img
                src={signedUrls[paths[lightbox]]}
                alt={`ფოტო ${lightbox + 1}`}
                className="max-h-[70vh] max-w-full rounded-md object-contain"
              />
            ) : (
              <div className="h-64 w-96 rounded-lg bg-neutral-800" />
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-sm text-white/60">
              {lightbox + 1} / {paths.length}
            </div>
            {lightbox > 0 && (
              <ActionIcon
                variant="filled"
                color="dark"
                radius="xl"
                className="absolute left-3"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setLightbox(i => Math.max((i ?? 0) - 1, 0))}
                aria-label="წინა"
              >
                <ChevronLeft size={16} />
              </ActionIcon>
            )}
            {lightbox < paths.length - 1 && (
              <ActionIcon
                variant="filled"
                color="dark"
                radius="xl"
                className="absolute right-3"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setLightbox(i => Math.min((i ?? 0) + 1, paths.length - 1))}
                aria-label="შემდეგი"
              >
                <ChevronRight size={16} />
              </ActionIcon>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
