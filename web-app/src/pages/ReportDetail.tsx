import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { toast } from 'sonner';
import DeleteButton from '@/components/DeleteButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PhotoGallery from '@/components/PhotoGallery';
import { SlideCard } from '@/components/reports/SlideCard';
import {
  addReportSlide,
  deleteReport,
  getReport,
  removeReportSlide,
  updateReportSlide,
  signedReportPdfUrl,
  signedReportPhotoUrl,
  type Report,
} from '@/lib/data/reports';
import { getProject } from '@/lib/data/projects';
import { reportDisplayName } from '@/lib/documentNames';
import { routes } from '@/app/routes';
import { projectKeys, reportKeys } from '@/app/queryKeys';
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError, toastError } from '@/lib/errors';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: item, error: queryError, isLoading } = useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => getReport(id!),
    enabled: !!id,
  });
  const projectId = item?.project_id;
  const { data: project } = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });
  // Photo paths that actually need a signed URL — stable string key so the query
  // doesn't re-run (and regenerate 10-min signed URLs) on every refetch just because
  // `item.slides` is a fresh array reference.
  const slidePaths = (item?.slides ?? [])
    .map((s) => s.annotated_image_path || s.image_path)
    .filter((p): p is string => !!p);
  const { data: imageUrls = {} } = useQuery({
    queryKey: ['reportPhotos', id, slidePaths.join('|')],
    queryFn: async () => {
      const entries = await Promise.all(
        slidePaths.map((p) =>
          signedReportPhotoUrl(p)
            .then((u) => [p, u] as const)
            .catch(() => [p, ''] as const),
        ),
      );
      return Object.fromEntries(entries) as Record<string, string>;
    },
    enabled: slidePaths.length > 0,
  });

  const [opening, setOpening] = useState(false);

  const [addingSlide, setAddingSlide] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  // Slides the user has asked to delete but can still undo (hidden from the list
  // during the undo window; the real delete commits when the toast closes).
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-open the add-slide form ONCE for a fresh empty draft (mirrors mobile UX).
  // Gated on the report id + a one-shot ref so it never re-opens after the user
  // closes it (the old effect depended on the whole `item` object and re-fired on
  // every refetch).
  const autoOpenedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!item || item.status !== 'draft') return;
    if (autoOpenedFor.current === item.id) return;
    autoOpenedFor.current = item.id;
    if ((item.slides ?? []).length === 0) setAddingSlide(true);
  }, [item]);

  // Move focus into the title field when the form opens.
  useEffect(() => {
    if (addingSlide) titleInputRef.current?.focus();
  }, [addingSlide]);

  const [slideTitle, setSlideTitle] = useState('');
  const [slideDescription, setSlideDescription] = useState('');
  const [slidePhoto, setSlidePhoto] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const addSlideMutation = useMutation({
    mutationFn: () => {
      if (!item) throw new Error('not loaded');
      return addReportSlide({
        report: item,
        title: slideTitle.trim(),
        description: slideDescription.trim(),
        photo: slidePhoto,
      });
    },
    onSuccess: (next: Report) => {
      qc.setQueryData(reportKeys.detail(id), next);
      qc.invalidateQueries({ queryKey: reportKeys.lists() });
      setSlideTitle('');
      setSlideDescription('');
      setSlidePhoto(null);
      setValidationError(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setAddingSlide(false);
    },
    // Form-submission failures surface INLINE (below the form), not as a toast — the
    // app-wide rule is inline-for-forms, toast-for-standalone-actions.
  });

  // At least one of {title, photo} must be present — a blank slide is not submittable.
  function submitSlide() {
    if (addSlideMutation.isPending) return;
    if (!slideTitle.trim() && !slidePhoto) {
      setValidationError('მიუთითეთ სათაური ან დაამატეთ ფოტო.');
      return;
    }
    setValidationError(null);
    addSlideMutation.mutate();
  }

  const removeSlideMutation = useMutation({
    mutationFn: (slideId: string) => {
      if (!item) throw new Error('not loaded');
      return removeReportSlide(item, slideId);
    },
    onSuccess: (next: Report) => {
      qc.setQueryData(reportKeys.detail(id), next);
      qc.invalidateQueries({ queryKey: reportKeys.lists() });
    },
    onError: (e) => toastError(e),
  });

  /**
   * Hide the slide immediately and show an undo toast. The destructive delete (which
   * also removes the storage blob) only commits when the toast closes without an undo.
   */
  function requestRemoveSlide(slideId: string) {
    setPendingDeleteIds((prev) => new Set(prev).add(slideId));
    let undone = false;
    const unhide = () =>
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(slideId);
        return next;
      });
    toast('სლაიდი წაიშლება', {
      duration: 5000,
      action: {
        label: 'დაბრუნება',
        onClick: () => {
          undone = true;
          unhide();
        },
      },
      onAutoClose: () => {
        if (!undone) removeSlideMutation.mutate(slideId, { onError: unhide });
      },
      onDismiss: () => {
        if (!undone) removeSlideMutation.mutate(slideId, { onError: unhide });
      },
    });
  }

  const updateSlideMutation = useMutation({
    mutationFn: ({ slideId, patch }: { slideId: string; patch: { title?: string; description?: string } }) => {
      if (!item) throw new Error('not loaded');
      return updateReportSlide(item, slideId, patch);
    },
    onSuccess: (next: Report) => {
      qc.setQueryData(reportKeys.detail(id), next);
    },
    // No onError toast here: SlideCard awaits this mutation, reverts the field to the
    // last-saved value on failure, and shows the toast itself (single surface).
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!item) throw new Error('not loaded');
      return deleteReport(item);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportKeys.lists() });
      navigate('/reports');
    },
    onError: (e) => toastError(e),
  });

  const error = queryError ? humanizeError(queryError) : null;

  /** Open the in-app print/preview view. Falls back to same-tab nav if popups are blocked. */
  function openPrintView() {
    if (!item) return;
    const url = `#/reports/${item.id}/print`;
    const win = window.open(url, '_blank');
    if (!win) navigate(`/reports/${item.id}/print`);
  }

  /** Open the saved, signed PDF. Falls back to a toast if the popup is blocked. */
  async function openSignedPdf() {
    if (!item?.pdf_url) return;
    try {
      setOpening(true);
      const url = await signedReportPdfUrl(item.pdf_url);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) toast.error('ფანჯრის გახსნა დაიბლოკა — დაუშვით pop-up ფანჯრები.');
    } catch (e) {
      toastError(e);
    } finally {
      setOpening(false);
    }
  }

  if (isLoading) return <SkeletonDetailPage />;
  if (error)
    return <ErrorMessage>{error}</ErrorMessage>;
  if (!item) return <p className="text-sm text-neutral-500">რეპორტი ვერ მოიძებნა.</p>;

  const slides = [...(item.slides ?? [])]
    .sort((a, b) => a.order - b.order)
    .filter((s) => !pendingDeleteIds.has(s.id));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-sm">
            {project && (
              <>
                <Link to={routes.projects.detail(project.id)} className="text-brand-600 hover:underline">
                  {project.name}
                </Link>
                <span className="text-neutral-400">›</span>
              </>
            )}
            <Link to={routes.reports.list(projectId)} className="text-brand-600 hover:underline">
              რეპორტები
            </Link>
            <span className="text-neutral-400">›</span>
            <span className="truncate max-w-[200px] text-neutral-500">
              {reportDisplayName(item.title)}
            </span>
          </nav>
          <h1 className="mt-2 font-display text-heading-1 text-neutral-900 dark:text-neutral-100">
            {reportDisplayName(item.title)}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {item.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openPrintView}>
            <FileText size={14} className="mr-1" />
            ბეჭდვა / PDF
          </Button>
          {item.pdf_url && (
            <Button type="button" size="sm" onClick={() => void openSignedPdf()} disabled={opening}>
              {opening ? 'იხსნება…' : 'შენახული PDF'}
            </Button>
          )}
          <DeleteButton onDelete={() => deleteMutation.mutate()} isPending={deleteMutation.isPending} />
        </div>
      </header>

      {/* Slides */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            სლაიდები
            <span className="ml-2 text-sm font-normal text-neutral-400">({slides.length})</span>
          </h2>
          {!addingSlide && item.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => setAddingSlide(true)}>
              <Plus size={14} className="mr-1" />
              სლაიდის დამატება
            </Button>
          )}
        </div>

        {addingSlide && (
          <Card className="mb-3 border-brand-200 bg-brand-50/40">
            <CardHeader>
              <CardTitle className="text-base">ახალი სლაიდი</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSlide();
                }}
              >
                <Input
                  ref={titleInputRef}
                  id="slide-title"
                  value={slideTitle}
                  onChange={(e) => {
                    setSlideTitle(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="მაგ: ხარაჩოს ბოძი — დაუცველი"
                />
                <Textarea
                  id="slide-desc"
                  label="აღწერა"
                  rows={3}
                  value={slideDescription}
                  onChange={(e) => setSlideDescription(e.target.value)}
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ფოტო (არასავალდებულო)</p>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setSlidePhoto(e.target.files?.[0] ?? null);
                      if (validationError) setValidationError(null);
                    }}
                    className="block text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600"
                  />
                  {slidePhoto && (
                    <p className="mt-1 text-xs text-neutral-500">{slidePhoto.name}</p>
                  )}
                </div>

                {/* Client-side validation (inline) */}
                {validationError && <ErrorMessage compact>{validationError}</ErrorMessage>}
                {/* Submission failure (inline, per the inline-for-forms rule) */}
                {addSlideMutation.error && (
                  <ErrorMessage compact>{humanizeError(addSlideMutation.error)}</ErrorMessage>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={addSlideMutation.isPending}>
                    {addSlideMutation.isPending ? 'ემატება…' : 'დამატება'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAddingSlide(false);
                      setSlideTitle('');
                      setSlideDescription('');
                      setSlidePhoto(null);
                      setValidationError(null);
                      if (photoInputRef.current) photoInputRef.current.value = '';
                    }}
                    disabled={addSlideMutation.isPending}
                  >
                    გაუქმება
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {slides.length === 0 && !addingSlide && !addSlideMutation.isPending ? (
          <p className="text-sm text-neutral-500">სლაიდები არ არის.</p>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {slides.map((s, idx) => (
                <SlideCard
                  key={s.id}
                  slide={s}
                  index={idx}
                  editable={item.status === 'draft'}
                  imageUrl={(() => {
                    const path = s.annotated_image_path || s.image_path;
                    return path ? imageUrls[path] : undefined;
                  })()}
                  onSave={(patch) => updateSlideMutation.mutateAsync({ slideId: s.id, patch })}
                  onRemove={() => requestRemoveSlide(s.id)}
                  isRemoving={removeSlideMutation.isPending}
                />
              ))}
              {/* Optimistic shimmer placeholder while a new slide is being saved */}
              {addSlideMutation.isPending && (
                <motion.div
                  key="__adding"
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/60"
                  aria-hidden
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Photo gallery */}
        {(() => {
          const galleryUrls = slides.map((s) => {
            const path = s.annotated_image_path || s.image_path;
            return path ? imageUrls[path] ?? '' : '';
          });
          const captions = slides.map((s, idx) => s.title || `სლაიდი ${idx + 1}`);
          const hasAny = galleryUrls.some(Boolean);
          return hasAny ? (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">
                  ფოტოები ({galleryUrls.filter(Boolean).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoGallery urls={galleryUrls} captions={captions} />
              </CardContent>
            </Card>
          ) : null;
        })()}
      </section>
    </div>
  );
}
