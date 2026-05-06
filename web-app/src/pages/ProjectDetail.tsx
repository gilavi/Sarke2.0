import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Upload, Pencil, Check, X, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getProject,
  updateProject,
  listProjectSigners,
  type CrewMember,
  type Project,
} from '@/lib/data/projects';
import { listIncidents, INCIDENT_TYPE_LABEL, type IncidentType } from '@/lib/data/incidents';
import { listReports } from '@/lib/data/reports';
import { listInspections } from '@/lib/data/inspections';
import { listBriefings, topicLabel } from '@/lib/data/briefings';
import {
  listProjectFiles,
  signedFileUrl,
  uploadProjectFile,
  deleteProjectFile,
  formatSize,
  type ProjectFile,
} from '@/lib/data/projectFiles';
import { useAuth } from '@/lib/auth';

const INCIDENT_TYPE_COLOR: Record<IncidentType, string> = {
  minor: 'bg-yellow-100 text-yellow-800',
  severe: 'bg-orange-100 text-orange-800',
  fatal: 'bg-red-100 text-red-800',
  mass: 'bg-red-200 text-red-900',
  nearmiss: 'bg-blue-100 text-blue-800',
};

const CREW_ROLE_LABEL: Record<string, string> = {
  expert: 'ექსპერტი',
  xaracho_supervisor: 'ხარაჩოს ხელმძღვანელი',
  xaracho_assembler: 'ხარაჩოს მამშენებელი',
  other: 'სხვა',
};

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status === 'completed';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isCompleted ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {isCompleted ? 'დასრულებული' : 'მუშავდება'}
    </span>
  );
}

function SectionHeader({
  title,
  count,
  viewAllTo,
  action,
}: {
  title: string;
  count: number;
  viewAllTo?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg font-semibold text-neutral-900">
        {title}
        <span className="ml-2 text-sm font-normal text-neutral-400">({count})</span>
      </h2>
      <div className="flex items-center gap-3">
        {action}
        {viewAllTo && (
          <Link to={viewAllTo} className="text-sm text-brand-600 hover:underline">
            ყველა →
          </Link>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-neutral-500">{text}</p>;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const projectQ = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
    placeholderData: () =>
      qc.getQueryData<Project[]>(['projects'])?.find((p) => p.id === id) ?? undefined,
  });
  const inspectionsQ = useQuery({
    queryKey: ['inspections', id],
    queryFn: () => listInspections(id!),
    enabled: !!id,
  });
  const briefingsQ = useQuery({
    queryKey: ['briefings', id],
    queryFn: () => listBriefings(id!),
    enabled: !!id,
  });
  const filesQ = useQuery({
    queryKey: ['projectFiles', id],
    queryFn: () => listProjectFiles(id!),
    enabled: !!id,
  });
  const signersQ = useQuery({
    queryKey: ['projectSigners', id],
    queryFn: () => listProjectSigners(id!),
    enabled: !!id,
  });
  const incidentsQ = useQuery({
    queryKey: ['incidents', id],
    queryFn: () => listIncidents(id!),
    enabled: !!id,
  });
  const reportsQ = useQuery({
    queryKey: ['reports', id],
    queryFn: () => listReports(id!),
    enabled: !!id,
  });

  const project = projectQ.data ?? null;
  const inspections = inspectionsQ.data ?? [];
  const briefings = briefingsQ.data ?? [];
  const files = filesQ.data ?? [];
  const signers = signersQ.data ?? [];
  const incidents = incidentsQ.data ?? [];
  const reports = reportsQ.data ?? [];

  const queryError =
    projectQ.error ?? inspectionsQ.error ?? briefingsQ.error ?? filesQ.error ??
    signersQ.error ?? incidentsQ.error ?? reportsQ.error;

  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? (queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null);

  const [opening, setOpening] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', contact_phone: '' });
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    if (!project) return;
    setEditForm({
      name: project.name,
      address: project.address ?? '',
      contact_phone: project.contact_phone ?? '',
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!id || !project) return;
    setSaving(true);
    try {
      const patch = {
        name: editForm.name.trim() || project.name,
        address: editForm.address.trim() || null,
        contact_phone: editForm.contact_phone.trim() || null,
      };
      await updateProject(id, patch);
      qc.setQueryData(['project', id], { ...project, ...patch });
      void qc.invalidateQueries({ queryKey: ['projects'] });
      setEditing(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function openFile(f: ProjectFile) {
    try {
      setOpening(f.id);
      const url = await signedFileUrl(f.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(null);
    }
  }

  async function handleDeleteFile(f: ProjectFile) {
    setDeleting(f.id);
    try {
      await deleteProjectFile(f);
      qc.setQueryData<ProjectFile[]>(['projectFiles', id], (prev) =>
        (prev ?? []).filter((x) => x.id !== f.id),
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(null);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id || !user) return;
    setUploading(true);
    try {
      const uploaded = await uploadProjectFile(id, user.id, file);
      qc.setQueryData<ProjectFile[]>(['projectFiles', id], (prev) =>
        [uploaded, ...(prev ?? [])],
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (!project) {
    if (projectQ.isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
    return <p className="text-sm text-neutral-500">პროექტი ვერ მოიძებნა.</p>;
  }

  const crew: CrewMember[] = project.crew ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <Link to="/projects" className="text-sm text-brand-600 hover:underline">
          ← პროექტები
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-neutral-900">{project.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">{project.company_name}</p>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEditing} className="mt-1 shrink-0">
              <Pencil size={14} className="mr-1" />
              რედაქტირება
            </Button>
          )}
        </div>
      </header>

      {/* Details card — view or inline edit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">დეტალები</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="edit-name">სახელი</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-address">მისამართი</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-phone">ტელეფონი</Label>
                <Input
                  id="edit-phone"
                  value={editForm.contact_phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void saveEdit()} disabled={saving}>
                  <Check size={14} className="mr-1" />
                  {saving ? 'ინახება…' : 'შენახვა'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                  <X size={14} className="mr-1" />
                  გაუქმება
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-neutral-700">
              <div>მისამართი: {project.address || '—'}</div>
              <div>ტელეფონი: {project.contact_phone || '—'}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crew */}
      {crew.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              გუნდი
              <span className="ml-2 text-sm font-normal text-neutral-400">({crew.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-neutral-200">
              {crew.map((m) => (
                <li key={m.id} className="py-2 text-sm">
                  <div className="font-medium text-neutral-900">{m.name}</div>
                  <div className="text-xs text-neutral-500">
                    {CREW_ROLE_LABEL[m.roleKey] ?? m.role}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Signers */}
      {signers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              ხელმომწერები
              <span className="ml-2 text-sm font-normal text-neutral-400">({signers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-neutral-200">
              {signers.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <div className="font-medium text-neutral-900">{s.full_name}</div>
                  <div className="text-xs text-neutral-500">
                    {s.position || '—'}
                    {s.phone ? ` · ${s.phone}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Inspections */}
      <section>
        <SectionHeader
          title="შემოწმების აქტები"
          count={inspections.length}
          viewAllTo={`/inspections?project=${id}`}
        />
        {inspections.length === 0 ? (
          <EmptyState text="აქტები ჯერ არ არის." />
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {inspections.map((i) => (
              <li key={i.id}>
                <Link
                  to={`/inspections/${i.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                >
                  <span className="text-sm text-neutral-800">
                    {i.harness_name || `#${i.id.slice(0, 8)}`}
                  </span>
                  <StatusBadge status={i.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Incidents */}
      <section>
        <SectionHeader title="ინციდენტები" count={incidents.length} />
        {incidents.length === 0 ? (
          <EmptyState text="ინციდენტები ჯერ არ არის." />
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {incidents.map((i) => (
              <li key={i.id}>
                <Link
                  to={`/incidents/${i.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-neutral-800">
                      {i.injured_name || (i.type === 'nearmiss' ? 'საშიში შემთხვევა' : i.description)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {new Date(i.date_time).toLocaleDateString('ka-GE')} · {i.location || '—'}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        INCIDENT_TYPE_COLOR[i.type] ?? 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {INCIDENT_TYPE_LABEL[i.type] ?? i.type}
                    </span>
                    <StatusBadge status={i.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Briefings */}
      <section>
        <SectionHeader
          title="ბრიფინგები"
          count={briefings.length}
          viewAllTo={`/briefings?project=${id}`}
        />
        {briefings.length === 0 ? (
          <EmptyState text="ბრიფინგები ჯერ არ არის." />
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {briefings.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/briefings/${b.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-neutral-800">
                      {new Date(b.dateTime).toLocaleDateString('ka-GE')}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {b.topics.slice(0, 2).map(topicLabel).join(', ')}
                      {b.topics.length > 2 && ` +${b.topics.length - 2}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-xs text-neutral-500">
                      {b.participants.length} მონაწილე
                    </span>
                    <StatusBadge status={b.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reports */}
      <section>
        <SectionHeader title="რეპორტები" count={reports.length} />
        {reports.length === 0 ? (
          <EmptyState text="რეპორტები ჯერ არ არის." />
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/reports/${r.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-neutral-800">
                      {r.title || `რეპორტი #${r.id.slice(0, 8)}`}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {r.slides?.length ?? 0} სლაიდი ·{' '}
                      {new Date(r.created_at).toLocaleDateString('ka-GE')}
                    </span>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Files */}
      <section>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => void handleFileUpload(e)}
        />
        <SectionHeader
          title="ფაილები"
          count={files.length}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={14} className="mr-1" />
              {uploading ? 'იტვირთება…' : 'ატვირთვა'}
            </Button>
          }
        />
        {files.length === 0 ? (
          <EmptyState text="ფაილები ჯერ არ არის." />
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-neutral-800">{f.name}</div>
                  <div className="text-xs text-neutral-500">
                    {formatSize(f.size_bytes)}
                    {f.mime_type ? ` · ${f.mime_type}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void openFile(f)}
                    disabled={opening === f.id}
                  >
                    <Download size={14} className="mr-1" />
                    {opening === f.id ? 'იხსნება…' : 'გახსნა'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDeleteFile(f)}
                    disabled={deleting === f.id}
                    className="text-red-600 hover:border-red-300 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
