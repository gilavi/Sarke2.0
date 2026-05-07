import { useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Upload, Pencil, Check, X, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addProjectSigner,
  deleteProjectSigner,
  getProject,
  updateProject,
  updateProjectLogo,
  deleteProject,
  listProjectSigners,
  setProjectCrew,
  type CrewMember,
  type Project,
  type ProjectSigner,
} from '@/lib/data/projects';
import { listIncidents, INCIDENT_TYPE_LABEL, type IncidentType } from '@/lib/data/incidents';
import { listReports } from '@/lib/data/reports';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
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
  const navigate = useNavigate();
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
  const bobcatsQ = useQuery({
    queryKey: ['bobcatInspections', id],
    queryFn: () => listBobcatInspections(id!),
    enabled: !!id,
  });
  const excavatorsQ = useQuery({
    queryKey: ['excavatorInspections', id],
    queryFn: () => listExcavatorInspections(id!),
    enabled: !!id,
  });
  const generalEqQ = useQuery({
    queryKey: ['generalEquipmentInspections', id],
    queryFn: () => listGeneralEquipmentInspections(id!),
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
  const allProjectInspections = [
    ...(inspectionsQ.data ?? []).map((i) => ({ id: i.id, label: i.harness_name || `#${i.id.slice(0, 8)}`, status: i.status, href: `/inspections/${i.id}`, date: i.created_at ?? '' })),
    ...(bobcatsQ.data ?? []).map((i) => ({ id: i.id, label: i.equipmentModel || i.company || `ციცხვიანი #${i.id.slice(0, 8)}`, status: i.status, href: `/bobcat/${i.id}`, date: i.createdAt })),
    ...(excavatorsQ.data ?? []).map((i) => ({ id: i.id, label: `ექსკავატორი${i.serialNumber ? ` — ${i.serialNumber}` : ''}`, status: i.status, href: `/excavator/${i.id}`, date: i.createdAt })),
    ...(generalEqQ.data ?? []).map((i) => ({ id: i.id, label: i.objectName || `ტექ. #${i.id.slice(0, 8)}`, status: i.status, href: `/general-equipment/${i.id}`, date: i.createdAt })),
  ].sort((a, b) => b.date.localeCompare(a.date));
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
  const [deletingProject, setDeletingProject] = useState(false);

  const [addingSigner, setAddingSigner] = useState(false);
  const [signerForm, setSignerForm] = useState({ full_name: '', position: '', phone: '' });
  const [signerBusy, setSignerBusy] = useState(false);
  const [removingSignerId, setRemovingSignerId] = useState<string | null>(null);

  const [addingCrew, setAddingCrew] = useState(false);
  const [crewForm, setCrewForm] = useState({ name: '', roleKey: 'expert' });
  const [crewBusy, setCrewBusy] = useState(false);

  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setLogoUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await updateProjectLogo(id, dataUrl);
      qc.setQueryData(['project', id], { ...project, logo: dataUrl });
      void qc.invalidateQueries({ queryKey: ['projects'] });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function saveCrewMember() {
    if (!id || !project || !crewForm.name.trim()) return;
    setCrewBusy(true);
    try {
      const next: CrewMember = {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        roleKey: crewForm.roleKey,
        role: CREW_ROLE_LABEL[crewForm.roleKey] ?? crewForm.roleKey,
        name: crewForm.name.trim(),
        signature: null,
      };
      const updated = [...(project.crew ?? []), next];
      await setProjectCrew(id, updated);
      qc.setQueryData(['project', id], { ...project, crew: updated });
      void qc.invalidateQueries({ queryKey: ['projects'] });
      setCrewForm({ name: '', roleKey: 'expert' });
      setAddingCrew(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setCrewBusy(false);
    }
  }

  async function removeCrewMember(memberId: string) {
    if (!id || !project) return;
    try {
      const updated = (project.crew ?? []).filter((m) => m.id !== memberId);
      await setProjectCrew(id, updated);
      qc.setQueryData(['project', id], { ...project, crew: updated });
      void qc.invalidateQueries({ queryKey: ['projects'] });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function saveSigner() {
    if (!id || !signerForm.full_name.trim()) return;
    setSignerBusy(true);
    try {
      const created = await addProjectSigner({
        projectId: id,
        fullName: signerForm.full_name.trim(),
        position: signerForm.position.trim() || null,
        phone: signerForm.phone.trim() || null,
      });
      qc.setQueryData<ProjectSigner[]>(['projectSigners', id], (prev) => [
        ...(prev ?? []),
        created,
      ]);
      setSignerForm({ full_name: '', position: '', phone: '' });
      setAddingSigner(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setSignerBusy(false);
    }
  }

  async function removeSigner(s: ProjectSigner) {
    setRemovingSignerId(s.id);
    try {
      await deleteProjectSigner(s.id);
      qc.setQueryData<ProjectSigner[]>(['projectSigners', id], (prev) =>
        (prev ?? []).filter((x) => x.id !== s.id),
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemovingSignerId(null);
    }
  }

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

  async function handleDeleteProject() {
    if (!id || !project) return;
    const ok = window.confirm(
      `წაშლა: "${project.name}"\n\n` +
        `ყველა ინსპექცია, ბრიფინგი, ინციდენტი, რეპორტი და ფაილი წაიშლება. ეს მოქმედება უკან არ ბრუნდება.`,
    );
    if (!ok) return;
    setDeletingProject(true);
    try {
      await deleteProject(id);
      qc.setQueryData<Project[]>(['projects'], (prev) => (prev ?? []).filter((p) => p.id !== id));
      qc.removeQueries({ queryKey: ['project', id] });
      navigate('/projects');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
      setDeletingProject(false);
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
          <div className="flex items-center gap-4">
            {/* Logo avatar */}
            <button
              type="button"
              title="ლოგოს შეცვლა"
              disabled={logoUploading}
              onClick={() => logoInputRef.current?.click()}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 transition hover:border-brand-400 disabled:opacity-60"
            >
              {project.logo ? (
                <img src={project.logo} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-neutral-400">
                  {project.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
                <Upload size={16} className="text-white" />
              </span>
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleLogoChange(e)}
            />
            <div>
              <h1 className="font-display text-3xl font-bold text-neutral-900">{project.name}</h1>
              <p className="mt-1 text-sm text-neutral-500">{project.company_name}</p>
            </div>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            გუნდი
            <span className="ml-2 text-sm font-normal text-neutral-400">({crew.length})</span>
          </CardTitle>
          {!addingCrew && (
            <Button variant="outline" size="sm" onClick={() => setAddingCrew(true)}>
              <Plus size={14} className="mr-1" />
              დამატება
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {addingCrew && (
            <div className="mb-3 space-y-2 rounded-md border border-brand-200 bg-brand-50/40 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="სახელი, გვარი"
                  value={crewForm.name}
                  onChange={(e) => setCrewForm((f) => ({ ...f, name: e.target.value }))}
                />
                <select
                  value={crewForm.roleKey}
                  onChange={(e) => setCrewForm((f) => ({ ...f, roleKey: e.target.value }))}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  {Object.entries(CREW_ROLE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void saveCrewMember()}
                  disabled={crewBusy || !crewForm.name.trim()}
                >
                  {crewBusy ? 'ემატება…' : 'შენახვა'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddingCrew(false);
                    setCrewForm({ name: '', roleKey: 'expert' });
                  }}
                  disabled={crewBusy}
                >
                  გაუქმება
                </Button>
              </div>
            </div>
          )}
          {crew.length === 0 ? (
            <p className="text-sm text-neutral-500">გუნდის წევრები ჯერ არ არიან.</p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {crew.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-neutral-900">{m.name}</div>
                    <div className="text-xs text-neutral-500">
                      {CREW_ROLE_LABEL[m.roleKey] ?? m.role}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeCrewMember(m.id)}
                    className="text-neutral-400 hover:text-red-500"
                    title="წაშლა"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Signers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            ხელმომწერები
            <span className="ml-2 text-sm font-normal text-neutral-400">({signers.length})</span>
          </CardTitle>
          {!addingSigner && (
            <Button variant="outline" size="sm" onClick={() => setAddingSigner(true)}>
              <Plus size={14} className="mr-1" />
              დამატება
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {addingSigner && (
            <div className="mb-3 space-y-2 rounded-md border border-brand-200 bg-brand-50/40 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input
                  placeholder="სახელი, გვარი"
                  value={signerForm.full_name}
                  onChange={(e) => setSignerForm((f) => ({ ...f, full_name: e.target.value }))}
                />
                <Input
                  placeholder="თანამდებობა"
                  value={signerForm.position}
                  onChange={(e) => setSignerForm((f) => ({ ...f, position: e.target.value }))}
                />
                <Input
                  placeholder="ტელეფონი"
                  value={signerForm.phone}
                  onChange={(e) => setSignerForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void saveSigner()}
                  disabled={signerBusy || !signerForm.full_name.trim()}
                >
                  {signerBusy ? 'ემატება…' : 'შენახვა'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddingSigner(false);
                    setSignerForm({ full_name: '', position: '', phone: '' });
                  }}
                  disabled={signerBusy}
                >
                  გაუქმება
                </Button>
              </div>
            </div>
          )}
          {signers.length === 0 ? (
            <p className="text-sm text-neutral-500">ხელმომწერები ჯერ არ არის.</p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {signers.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-neutral-900">{s.full_name}</div>
                    <div className="text-xs text-neutral-500">
                      {s.position || '—'}
                      {s.phone ? ` · ${s.phone}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeSigner(s)}
                    disabled={removingSignerId === s.id}
                    className="text-neutral-400 hover:text-red-500 disabled:opacity-50"
                    title="წაშლა"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Inspections */}
      <section>
        <SectionHeader
          title="შემოწმების აქტები"
          count={allProjectInspections.length}
          viewAllTo={`/inspections?project=${id}`}
          action={
            <Link to={`/inspections/new?project=${id}`}>
              <Button variant="outline" size="sm">
                <Plus size={14} className="mr-1" />
                ახალი
              </Button>
            </Link>
          }
        />
        {allProjectInspections.length === 0 ? (
          <EmptyState text="აქტები ჯერ არ არის." />
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {allProjectInspections.map((i) => (
              <li key={i.id}>
                <Link
                  to={i.href}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                >
                  <span className="text-sm text-neutral-800">{i.label}</span>
                  <StatusBadge status={i.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Incidents */}
      <section>
        <SectionHeader
          title="ინციდენტები"
          count={incidents.length}
          action={
            <Link to={`/incidents/new?project=${id}`}>
              <Button variant="outline" size="sm">
                <Plus size={14} className="mr-1" />
                ახალი
              </Button>
            </Link>
          }
        />
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
          action={
            <Link to={`/briefings/new?project=${id}`}>
              <Button variant="outline" size="sm">
                <Plus size={14} className="mr-1" />
                ახალი
              </Button>
            </Link>
          }
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
        <SectionHeader
          title="რეპორტები"
          count={reports.length}
          action={
            <Link to={`/reports/new?project=${id}`}>
              <Button variant="outline" size="sm">
                <Plus size={14} className="mr-1" />
                ახალი
              </Button>
            </Link>
          }
        />
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

      {/* Danger zone */}
      <section className="pt-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-red-900">პროექტის წაშლა</div>
              <div className="text-xs text-red-700">
                ყველა შემოწმება, ბრიფინგი, ინციდენტი, რეპორტი და ფაილი წაიშლება.
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleDeleteProject()}
              disabled={deletingProject}
              className="text-red-700 hover:border-red-400 hover:bg-red-100"
            >
              <Trash2 size={14} className="mr-1" />
              {deletingProject ? 'იშლება…' : 'პროექტის წაშლა'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
