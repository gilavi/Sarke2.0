/**
 * PhotoUploadWidget — upload, view, and delete photos for a single inspection item.
 *
 * Renders a compact thumbnail row with an "add photo" button. Each thumbnail
 * is clickable (opens a lightbox via PhotoGallery). The ✕ on each thumbnail
 * removes the photo and calls `onRemove(path)`.
 *
 * Props:
 *   - paths       Current `photo_paths` array (storage paths, not signed URLs)
 *   - disabled    When true, hides upload/delete controls (completed inspection)
 *   - prefix      Storage prefix e.g. "bobcat", "excavator"
 *   - inspectionId UUID of the parent inspection
 *   - itemId      Item identifier (used in storage path)
 *   - onAdd(path) Called after a successful upload with the new storage path
 *   - onRemove(path) Called when the user confirms removal
 */
import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { signedInspectionPhotoUrl, uploadInspectionPhoto, deleteInspectionPhoto } from '@/lib/photoUpload';

interface Props {
  paths: string[];
  disabled?: boolean;
  prefix: string;
  inspectionId: string;
  itemId: string | number;
  onAdd: (path: string) => void;
  onRemove: (path: string) => void;
}

export default function PhotoUploadWidget({
  paths,
  disabled = false,
  prefix,
  inspectionId,
  itemId,
  onAdd,
  onRemove,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Resolve signed URLs for all paths
  useEffect(() => {
    let cancelled = false;
    const missing = paths.filter((p) => !signedUrls[p]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (p) => {
        try {
          const url = await signedInspectionPhotoUrl(p);
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
  }, [paths.join(',')]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightbox === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => i !== null ? Math.min(i + 1, paths.length - 1) : null);
      if (e.key === 'ArrowLeft') setLightbox((i) => i !== null ? Math.max(i - 1, 0) : null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, paths.length]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const path = await uploadInspectionPhoto(prefix, inspectionId, itemId, file);
        onAdd(path);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleRemove(path: string) {
    try {
      await deleteInspectionPhoto(path);
    } catch {
      // best-effort — row is removed regardless
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
                <button
                  type="button"
                  onClick={() => handleRemove(p)}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                  aria-label="ფოტოს წაშლა"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {!disabled && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 rounded-md border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
          >
            <Camera size={12} />
            {uploading ? 'იტვირთება…' : 'ფოტოს დამატება'}
          </button>
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
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}
        >
          {lightbox > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-2xl text-white hover:bg-white/25"
            >
              ‹
            </button>
          )}
          <div
            className="flex max-h-screen max-w-5xl flex-col items-center px-16"
            onClick={(e) => e.stopPropagation()}
          >
            {signedUrls[paths[lightbox]] ? (
              <img
                src={signedUrls[paths[lightbox]]}
                alt={`ფოტო ${lightbox + 1}`}
                className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <div className="h-64 w-96 rounded-lg bg-neutral-800" />
            )}
            <div className="mt-3 text-sm text-white/60">
              {lightbox + 1} / {paths.length}
            </div>
          </div>
          {lightbox < paths.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-2xl text-white hover:bg-white/25"
            >
              ›
            </button>
          )}
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
