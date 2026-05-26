import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, X } from 'lucide-react';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { toast } from 'sonner';
import DeleteButton from '@/components/DeleteButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PhotoGallery from '@/components/PhotoGallery';
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
  const { data: imageUrls = {} } = useQuery({
    queryKey: ['reportPhotos', id, item?.slides],
    queryFn: async () => {
      const paths: string[] = [];
      for (const s of item?.slides ?? []) {
        const p = s.annotated_image_path || s.image_path;
        if (p) paths.push(p);
      }
      const entries = await Promise.all(
        paths.map((p) =>
          signedReportPhotoUrl(p)
            .then((u) => [p, u] as const)
            .catch(() => [p, ''] as const),
        ),
      );
      return Object.fromEntries(entries) as Record<string, string>;
    },
    enabled: !!item?.slides && item.slides.length > 0,
  });

  const [opening, setOpening] = useState(false);

  const [addingSlide, setAddingSlide] = useState(false);

  // Auto-open the add-slide form when a fresh draft has no slides yet (mirrors mobile UX)
  useEffect(() => {
    if (item && (item.slides ?? []).length === 0 && item.status === 'draft') {
      setAddingSlide(true);
    }
  }, [item]);
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
      qc.setQueryData(['report', id], next);
      qc.invalidateQueries({ queryKey: reportKeys.lists() });
      setSlideTitle('');
      setSlideDescription('');
      setSlidePhoto(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setAddingSlide(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const removeSlideMutation = useMutation({
    mutationFn: (slideId: string) => {
      if (!item) throw new Error('not loaded');
      return removeReportSlide(item, slideId);
    },
    onSuccess: (next: Report) => {
      qc.setQueryData(['report', id], next);
      qc.invalidateQueries({ queryKey: reportKeys.lists() });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const updateSlideMutation = useMutation({
    mutationFn: ({ slideId, patch }: { slideId: string; patch: { title?: string; description?: string } }) => {
      if (!item) throw new Error('not loaded');
      return updateReportSlide(item, slideId, patch);
    },
    onSuccess: (next: Report) => {
      qc.setQueryData(['report', id], next);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
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
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  async function openPdf() {
    if (!item?.pdf_url) return;
    try {
      setOpening(true);
      const url = await signedReportPdfUrl(item.pdf_url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(false);
    }
  }

  if (isLoading) return <SkeletonDetailPage />;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
    );
  if (!item) return <p className="text-sm text-neutral-500">რეპორტი ვერ მოიძებნა.</p>;

  const slides = [...(item.slides ?? [])].sort((a, b) => a.order - b.order);

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
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
            {reportDisplayName(item.title)}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {item.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`#/reports/${item.id}/print`, '_blank')}
          >
            <FileText size={14} className="mr-1" />
            PDF
          </Button>
          <DeleteButton onDelete={() => deleteMutation.mutate()} isPending={deleteMutation.isPending} />
        </div>
      </header>

      {item.pdf_url && (
        <Button type="button" onClick={() => void openPdf()} disabled={opening}>
          {opening ? 'იხსნება…' : 'PDF-ის ნახვა'}
        </Button>
      )}

      {/* Slides */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-neutral-900">
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
                  if (!addSlideMutation.isPending) addSlideMutation.mutate();
                }}
              >
                <Input
                  id="slide-title"
                  value={slideTitle}
                  onChange={(e) => setSlideTitle(e.target.value)}
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
                    onChange={(e) => setSlidePhoto(e.target.files?.[0] ?? null)}
                    className="block text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600"
                  />
                  {slidePhoto && (
                    <p className="mt-1 text-xs text-neutral-500">{slidePhoto.name}</p>
                  )}
                </div>

                {addSlideMutation.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {addSlideMutation.error instanceof Error
                      ? addSlideMutation.error.message
                      : String(addSlideMutation.error)}
                  </div>
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

        {slides.length === 0 && !addingSlide ? (
          <p className="text-sm text-neutral-500">სლაიდები არ არის.</p>
        ) : (
          <div className="space-y-3">
            {slides.map((s, idx) => (
              <Card key={s.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex-1 pr-2">
                    {item.status === 'draft' ? (
                      <Input
                        defaultValue={s.title}
                        placeholder={`სლაიდი ${idx + 1}`}
                        className="font-semibold"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== s.title)
                            updateSlideMutation.mutate({ slideId: s.id, patch: { title: v } });
                        }}
                      />
                    ) : (
                      <CardTitle className="text-base">
                        {idx + 1}. {s.title || 'სლაიდი'}
                      </CardTitle>
                    )}
                  </div>
                  <div className="flex items-start gap-2 shrink-0 ml-2">
                    {(() => {
                      const path = s.annotated_image_path || s.image_path;
                      const url = path ? imageUrls[path] : '';
                      return url ? (
                        <img
                          src={url}
                          alt={s.title || `სლაიდი ${idx + 1}`}
                          className="h-16 w-16 rounded-lg object-cover border border-neutral-200"
                        />
                      ) : null;
                    })()}
                    {item.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => removeSlideMutation.mutate(s.id)}
                        disabled={removeSlideMutation.isPending}
                        className="mt-1 text-neutral-400 hover:text-red-500 disabled:opacity-50"
                        title="სლაიდის წაშლა"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {item.status === 'draft' ? (
                    <Textarea
                      rows={2}
                      defaultValue={s.description}
                      placeholder="აღწერა"
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== s.description)
                          updateSlideMutation.mutate({ slideId: s.id, patch: { description: v } });
                      }}
                    />
                  ) : (
                    s.description && <p className="text-sm text-neutral-700">{s.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
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
