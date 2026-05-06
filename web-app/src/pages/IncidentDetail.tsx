import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhotoGallery from '@/components/PhotoGallery';
import {
  deleteIncident,
  getIncident,
  signedIncidentPdfUrl,
  signedIncidentPhotoUrl,
  updateIncident,
  INCIDENT_TYPE_LABEL,
} from '@/lib/data/incidents';

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const { data: item, error: queryError, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => getIncident(id!),
    enabled: !!id,
  });
  const { data: photoUrls = [] } = useQuery({
    queryKey: ['incidentPhotos', id, item?.photos],
    queryFn: async () =>
      Promise.all((item?.photos ?? []).map((p) => signedIncidentPhotoUrl(p).catch(() => ''))),
    enabled: !!item && item.photos.length > 0,
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
      qc.invalidateQueries({ queryKey: ['incident', id] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
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
      qc.invalidateQueries({ queryKey: ['incidents'] });
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

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
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
          <Link to="/incidents" className="text-sm text-brand-600 hover:underline">
            ← ინციდენტები
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
            {INCIDENT_TYPE_LABEL[item.type] ?? item.type}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(item.date_time).toLocaleString('ka-GE')} · {item.location || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!editing && item.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil size={14} className="mr-1" />
              რედაქტირება
            </Button>
          )}
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-700">დარწმუნებული ხართ?</span>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => delMutation.mutate()}
                disabled={delMutation.isPending}
              >
                {delMutation.isPending ? 'იშლება…' : 'წაშლა'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={delMutation.isPending}>
                გაუქმება
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:border-red-300 hover:bg-red-50"
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={14} className="mr-1" />
              წაშლა
            </Button>
          )}
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
                <div className="space-y-1">
                  <Label>დაზარალებულის სახელი</Label>
                  <Input
                    value={form.injured_name}
                    onChange={(e) => setForm((f) => ({ ...f, injured_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>თანამდებობა</Label>
                  <Input
                    value={form.injured_role}
                    onChange={(e) => setForm((f) => ({ ...f, injured_role: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>ადგილი</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>აღწერა</Label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label>მიზეზი</Label>
                <textarea
                  rows={2}
                  value={form.cause}
                  onChange={(e) => setForm((f) => ({ ...f, cause: e.target.value }))}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label>გატარებული ღონისძიებები</Label>
                <textarea
                  rows={2}
                  value={form.actions_taken}
                  onChange={(e) => setForm((f) => ({ ...f, actions_taken: e.target.value }))}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
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
          <CardTitle className="text-base">დაშავებული</CardTitle>
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

      {item.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ფოტოები ({item.photos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoGallery urls={photoUrls} />
          </CardContent>
        </Card>
      )}

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
