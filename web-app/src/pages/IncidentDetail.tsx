import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pencil } from 'lucide-react';
import DeleteButton from '@/components/DeleteButton';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import SignatureCanvas from '@/components/SignatureCanvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import {
  addIncidentPhoto,
  deleteIncident,
  getIncident,
  removeIncidentPhoto,
  signedIncidentPdfUrl,
  signedIncidentPhotoUrl,
  updateIncident,
  INCIDENT_TYPE_LABEL,
} from '@/lib/data/incidents';
import { signedUrl, STORAGE_BUCKETS } from '@/lib/db/storage';
import { getProject } from '@/lib/data/projects';
import { routes } from '@/app/routes';
import { projectKeys, incidentKeys } from '@/app/queryKeys';

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: item, error: queryError, isLoading } = useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: () => getIncident(id!),
    enabled: !!id,
  });
  const projectId = item?.project_id;
  const { data: project } = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    description: '',
    cause: '',
    actions_taken: '',
    location: '',
    injured_name: '',
    injured_role: '',
  });

  function startEdit() {
    if (!item) return;
    setForm({
      description: item.description,
      cause: item.cause,
      actions_taken: item.actions_taken,
      location: item.location ?? '',
      injured_name: item.injured_name ?? '',
      injured_role: item.injured_role ?? '',
    });
    setEditing(true);
  }

  const editMutation = useMutation({
    mutationFn: () =>
      updateIncident(id!, {
        description: form.description.trim(),
        cause: form.cause.trim(),
        actions_taken: form.actions_taken.trim(),
        location: form.location.trim() || null,
        injured_name: form.injured_name.trim() || null,
        injured_role: form.injured_role.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: incidentKeys.lists() });
      setEditing(false);
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  const delMutation = useMutation({
    mutationFn: () => {
      if (!item) throw new Error('not loaded');
      return deleteIncident(item);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incidentKeys.lists() });
      navigate('/incidents');
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  const error = actionError ?? (queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null);

  async function openPdf() {
    if (!item?.pdf_url) return;
    try {
      setOpening(true);
      const url = await signedIncidentPdfUrl(item.pdf_url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(false);
    }
  }

  if (isLoading) return <SkeletonDetailPage />;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (!item) return <p className="text-sm text-neutral-500">ინციდენტი ვერ მოიძებნა.</p>;

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
            <Link to={routes.incidents.list(projectId)} className="text-brand-600 hover:underline">
              ინციდენტები
            </Link>
            <span className="text-neutral-400">›</span>
            <span className="truncate max-w-[200px] text-neutral-500">
              {INCIDENT_TYPE_LABEL[item.type] ?? item.type}
            </span>
          </nav>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {INCIDENT_TYPE_LABEL[item.type] ?? item.type}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(item.date_time).toLocaleString('ka-GE')} · {item.location || '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`#/incidents/${item.id}/print`, '_blank')}
          >
            <FileText size={14} className="mr-1" />
            PDF
          </Button>
          {!editing && item.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil size={14} className="mr-1" />
              რედაქტირება
            </Button>
          )}
          <DeleteButton onDelete={() => delMutation.mutate()} isPending={delMutation.isPending} />
        </div>
      </header>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">რედაქტირება</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editMutation.isPending) editMutation.mutate();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="დაზარალებულის სახელი"
                  value={form.injured_name}
                  onChange={(e) => setForm((f) => ({ ...f, injured_name: e.target.value }))}
                />
                <Input
                  label="თანამდებობა"
                  value={form.injured_role}
                  onChange={(e) => setForm((f) => ({ ...f, injured_role: e.target.value }))}
                />
              </div>
              <Input
                label="ადგილი"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
              <Textarea
                label="აღწერა"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <Textarea
                label="მიზეზი"
                rows={2}
                value={form.cause}
                onChange={(e) => setForm((f) => ({ ...f, cause: e.target.value }))}
              />
              <Textarea
                label="გატარებული ღონისძიებები"
                rows={2}
                value={form.actions_taken}
                onChange={(e) => setForm((f) => ({ ...f, actions_taken: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={editMutation.isPending}>
                  {editMutation.isPending ? 'ინახება…' : 'შენახვა'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={editMutation.isPending}
                >
                  გაუქმება
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">დაზარალებული</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-neutral-700">
          <div>სახელი: {item.injured_name || '—'}</div>
          <div>როლი: {item.injured_role || '—'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">აღწერა</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-700">
          <section>
            <div className="text-xs font-semibold uppercase text-neutral-500">აღწერა</div>
            <div>{item.description || '—'}</div>
          </section>
          <section>
            <div className="text-xs font-semibold uppercase text-neutral-500">მიზეზი</div>
            <div>{item.cause || '—'}</div>
          </section>
          <section>
            <div className="text-xs font-semibold uppercase text-neutral-500">გატარებული ღონისძიებები</div>
            <div>{item.actions_taken || '—'}</div>
          </section>
          {item.witnesses.length > 0 && (
            <section>
              <div className="text-xs font-semibold uppercase text-neutral-500">მოწმეები</div>
              <ul className="list-disc pl-5">
                {item.witnesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
          )}
        </CardContent>
      </Card>

      {(item.photos.length > 0 || item.status === 'draft') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              ფოტოები
              {item.photos.length > 0 && (
                <span className="ml-2 text-sm font-normal text-neutral-400">({item.photos.length})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {item.photos.length === 0 && item.status !== 'draft' ? (
              <p className="text-sm text-neutral-500">ფოტოები არ არის.</p>
            ) : (
              <PhotoUploadWidget
                paths={item.photos}
                disabled={item.status !== 'draft'}
                prefix=""
                inspectionId={item.id}
                itemId="photos"
                onAdd={() => qc.invalidateQueries({ queryKey: incidentKeys.detail(id) })}
                onRemove={() => qc.invalidateQueries({ queryKey: incidentKeys.detail(id) })}
                uploadFn={(file) => addIncidentPhoto(item, file)}
                signedUrlFn={signedIncidentPhotoUrl}
                deleteFn={(path) => removeIncidentPhoto(item, path)}
              />
            )}
          </CardContent>
        </Card>
      )}

      <SignatureSection
        signature={item.inspector_signature}
        isDraft={item.status === 'draft'}
        onSave={(dataUrl) => updateIncident(item.id, { inspector_signature: dataUrl }).then(() => qc.invalidateQueries({ queryKey: incidentKeys.detail(id) }))}
      />

      {item.pdf_url && (
        <Button type="button" onClick={() => void openPdf()} disabled={opening}>
          {opening ? 'იხსნება…' : 'PDF რეპორტი'}
        </Button>
      )}
        </>
      )}
    </div>
  );
}

function SignatureSection({
  signature,
  isDraft,
  onSave,
}: {
  signature: string | null;
  isDraft: boolean;
  onSave: (dataUrl: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Signatures from mobile are stored as storage paths (e.g. "expert/uuid.png");
  // the signatures bucket is private, so a path resolves to a short-lived signed
  // URL. Web-created signatures are stored as raw base64 without the data: prefix.
  const isStoragePath = !!signature && !signature.startsWith('data:') && signature.includes('/');
  const [signedSig, setSignedSig] = useState<string | null>(null);
  useEffect(() => {
    if (!isStoragePath) return;
    let cancelled = false;
    signedUrl(STORAGE_BUCKETS.signatures, signature)
      .then((url) => { if (!cancelled) setSignedSig(url); })
      .catch(() => { if (!cancelled) setSignedSig(null); });
    return () => { cancelled = true; };
  }, [signature, isStoragePath]);
  const normSig = useMemo(() => {
    if (!signature) return null;
    if (signature.startsWith('data:')) return signature;
    if (isStoragePath) return signedSig;
    return `data:image/png;base64,${signature}`;
  }, [signature, isStoragePath, signedSig]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ინსპექტორის ხელმოწერა</CardTitle>
      </CardHeader>
      <CardContent>
        {open && isDraft ? (
          <SignatureCanvas
            existing={normSig ?? undefined}
            onSave={(dataUrl) => { onSave(dataUrl); setOpen(false); }}
            onCancel={() => setOpen(false)}
          />
        ) : normSig ? (
          <div className="space-y-2">
            <img src={normSig} alt="ხელმოწერა" className="h-20 rounded border border-neutral-200 bg-white object-contain p-1" />
            {isDraft && <Button variant="outline" size="sm" onClick={() => setOpen(true)}>განახლება</Button>}
          </div>
        ) : isDraft ? (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>ხელმოწერა</Button>
        ) : (
          <p className="text-sm text-neutral-500">ხელმოწერა არ არის.</p>
        )}
      </CardContent>
    </Card>
  );
}
