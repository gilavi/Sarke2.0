/**
 * PhotoUploadZone — drag-and-drop upload area with a thumbnail strip.
 *
 * Drop-in replacement for PhotoUploadWidget within the inspection wizard:
 * same prop shape (paths / prefix / inspectionId / itemId / onAdd / onRemove),
 * but a proper drop zone instead of a single camera icon.
 */
import { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { signedInspectionPhotoUrl, uploadInspectionPhoto, deleteInspectionPhoto } from '@/lib/photoUpload';
import { humanizeError } from '@/lib/errors';

interface Props {
  paths: string[];
  prefix: string;
  inspectionId: string;
  itemId: string | number;
  onAdd: (path: string) => void;
  onRemove: (path: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function PhotoUploadZone({
  paths,
  prefix,
  inspectionId,
  itemId,
  onAdd,
  onRemove,
  placeholder,
  disabled = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const missing = paths.filter((p) => !urls[p]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (p) => {
        try {
          return [p, await signedInspectionPhotoUrl(p)] as const;
        } catch {
          return [p, ''] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setUrls((prev) => {
        const next = { ...prev };
        for (const [p, u] of pairs) next[p] = u;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths.join(',')]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const path = await uploadInspectionPhoto(prefix, inspectionId, itemId, file);
        onAdd(path);
      }
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleRemove(path: string) {
    try {
      await deleteInspectionPhoto(path);
    } catch {
      // best-effort — thumbnail is removed regardless
    }
    onRemove(path);
  }

  const hasPhotos = paths.length > 0;

  return (
    <div>
      {/* Empty state — dashed drop zone (hidden once photos exist) */}
      {!disabled && !hasPhotos && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center outline-none transition-colors focus-visible:border-brand-500"
          style={{
            borderColor: dragOver ? 'var(--brand-500)' : 'var(--border-default)',
            background: dragOver ? 'var(--brand-50)' : 'var(--bg-body)',
            padding: '28px 16px',
          }}
        >
          <Upload size={20} color="var(--text-muted)" />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {uploading ? 'იტვირთება...' : 'ჩააგდეთ ფოტოები ან დააჭირეთ ასარჩევად'}
          </p>
          {placeholder && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{placeholder}</p>}
        </div>
      )}

      {/* Filled state — uploader tile first, then thumbnails (same size) */}
      {hasPhotos && (
        <div className="flex flex-wrap gap-2">
          {!disabled && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              className="flex cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed text-center outline-none transition-colors focus-visible:border-brand-500"
              style={{
                width: 120,
                height: 120,
                borderRadius: 8,
                borderColor: dragOver ? 'var(--brand-500)' : 'var(--border-default)',
                background: dragOver ? 'var(--brand-50)' : 'var(--bg-body)',
              }}
            >
              <Upload size={20} color="var(--text-muted)" />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {uploading ? 'იტვირთება...' : 'დამატება'}
              </span>
            </div>
          )}
          {paths.map((p, i) => (
            <div key={p} className="relative" style={{ width: 120, height: 120 }}>
              <a
                href={urls[p] || undefined}
                target="_blank"
                rel="noreferrer"
                className="block h-full w-full overflow-hidden border border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                style={{ borderRadius: 8 }}
              >
                {urls[p] ? (
                  <img src={urls[p]} alt={`ფოტო ${i + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-neutral-100" />
                )}
              </a>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(p)}
                  aria-label="ფოტოს წაშლა"
                  style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20 }}
                  className="flex items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Single shared file input for both empty + filled states */}
      {!disabled && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      )}
    </div>
  );
}
