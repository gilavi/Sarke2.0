import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listProjects } from '@/lib/data/projects';
import { createIncident, INCIDENT_TYPE_LABEL, type IncidentType, type Incident } from '@/lib/data/incidents';

const TYPES = Object.entries(INCIDENT_TYPE_LABEL) as [IncidentType, string][];

export default function NewIncident() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [type, setType] = useState<IncidentType>('minor');
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState('');
  const [cause, setCause] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [witnessInput, setWitnessInput] = useState('');
  const [witnesses, setWitnesses] = useState<string[]>([]);
  const [injuredName, setInjuredName] = useState('');
  const [injuredRole, setInjuredRole] = useState('');
  const [location, setLocation] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createIncident({
        projectId,
        type,
        dateTime: new Date(dateTime).toISOString(),
        description: description.trim(),
        cause: cause.trim(),
        actionsTaken: actionsTaken.trim(),
        witnesses,
        injuredName: injuredName.trim() || undefined,
        injuredRole: injuredRole.trim() || undefined,
        location: location.trim() || undefined,
        attachments: files.length ? files : undefined,
      }),
    onSuccess: (created: Incident) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      navigate(`/incidents/${created.id}`);
    },
  });

  function addWitness() {
    const w = witnessInput.trim();
    if (w && !witnesses.includes(w)) setWitnesses((prev) => [...prev, w]);
    setWitnessInput('');
  }

  function removeWitness(w: string) {
    setWitnesses((prev) => prev.filter((x) => x !== w));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = '';
  }

  const canSubmit =
    !!projectId && !!description.trim() && !!cause.trim() && !!actionsTaken.trim() && !mutation.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link to="/incidents" className="text-sm text-brand-600 hover:underline">
          ← ინციდენტები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">ახალი ინციდენტი</h1>
        <p className="mt-1 text-sm text-neutral-500">შეავსეთ ინციდენტის ძირითადი მონაცემები.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ძირითადი ინფორმაცია</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
          >
            {/* Project */}
            <div className="space-y-1">
              <Label htmlFor="project">პროექტი *</Label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— აირჩიეთ პროექტი —</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div className="space-y-1">
              <Label>ინციდენტის სახეობა *</Label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      type === key
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="datetime">თარიღი და დრო *</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                required
              />
            </div>

            {/* Location */}
            <div className="space-y-1">
              <Label htmlFor="location">ადგილი</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="მაგ: სართული 3, კვანძი B"
              />
            </div>

            {/* Injured */}
            {type !== 'nearmiss' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="injured_name">დაზარალებულის სახელი</Label>
                  <Input
                    id="injured_name"
                    value={injuredName}
                    onChange={(e) => setInjuredName(e.target.value)}
                    placeholder="სახელი, გვარი"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="injured_role">თანამდებობა</Label>
                  <Input
                    id="injured_role"
                    value={injuredRole}
                    onChange={(e) => setInjuredRole(e.target.value)}
                    placeholder="მაგ: დურგალი"
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description">აღწერა *</Label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="შეაღწერეთ რა მოხდა…"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Cause */}
            <div className="space-y-1">
              <Label htmlFor="cause">მიზეზი *</Label>
              <textarea
                id="cause"
                rows={3}
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                required
                placeholder="ინციდენტის გამომწვევი მიზეზი…"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Actions taken */}
            <div className="space-y-1">
              <Label htmlFor="actions">მიღებული ზომები *</Label>
              <textarea
                id="actions"
                rows={3}
                value={actionsTaken}
                onChange={(e) => setActionsTaken(e.target.value)}
                required
                placeholder="რა ზომები იქნა მიღებული…"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Witnesses */}
            <div className="space-y-2">
              <Label>მოწმეები</Label>
              <div className="flex gap-2">
                <Input
                  value={witnessInput}
                  onChange={(e) => setWitnessInput(e.target.value)}
                  placeholder="სახელი, გვარი"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addWitness(); }
                  }}
                />
                <Button type="button" variant="outline" onClick={addWitness} disabled={!witnessInput.trim()}>
                  დამატება
                </Button>
              </div>
              {witnesses.length > 0 && (
                <ul className="space-y-1">
                  {witnesses.map((w) => (
                    <li key={w} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-1.5 text-sm">
                      <span>{w}</span>
                      <button
                        type="button"
                        onClick={() => removeWitness(w)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* File attachments */}
            <div className="space-y-2">
              <Label>დანართი ფაილები</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  ფაილის არჩევა
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>
              {files.length > 0 && (
                <ul className="space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-1.5 text-sm">
                      <span className="truncate max-w-xs">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="ml-2 shrink-0 text-neutral-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {mutation.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!canSubmit}>
                {mutation.isPending ? 'ინახება…' : 'შენახვა'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/incidents')} disabled={mutation.isPending}>
                გაუქმება
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
