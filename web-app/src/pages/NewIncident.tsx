import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Textarea, TextInput } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { ProjectPicker } from '@/components/ui/project-picker';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { WizardShell } from '@/components/ui/wizard-shell';
import { listProjects } from '@/lib/data/projects';
import { projectKeys, incidentKeys } from '@/app/queryKeys';
import { createIncident, INCIDENT_TYPE_LABEL, type IncidentType, type Incident } from '@/lib/data/incidents';

const STEPS = ['ინციდენტი', 'დეტალები', 'მოწმეები'];
const TYPES = Object.entries(INCIDENT_TYPE_LABEL) as [IncidentType, string][];

export default function NewIncident() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  const prefilledProjectId = params.get('project') ?? '';

  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState(prefilledProjectId);
  const [type, setType] = useState<IncidentType>('minor');
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState('');
  const [injuredName, setInjuredName] = useState('');
  const [injuredRole, setInjuredRole] = useState('');
  const [description, setDescription] = useState('');
  const [cause, setCause] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [witnessInput, setWitnessInput] = useState('');
  const [witnesses, setWitnesses] = useState<string[]>([]);
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
      qc.invalidateQueries({ queryKey: incidentKeys.lists() });
      navigate(`/incidents/${created.id}`);
    },
  });

  function addWitness() {
    const w = witnessInput.trim();
    if (w && !witnesses.includes(w)) setWitnesses((prev) => [...prev, w]);
    setWitnessInput('');
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
    e.target.value = '';
  }

  const canAdvanceStep0 = !!projectId && !!dateTime;
  const canAdvanceStep1 = !!description.trim() && !!cause.trim() && !!actionsTaken.trim();
  const canFinish = canAdvanceStep0 && canAdvanceStep1 && !mutation.isPending;

  const stepNextDisabled =
    (step === 0 && !canAdvanceStep0) ||
    (step === 1 && !canAdvanceStep1) ||
    (step === 2 && !canFinish);

  return (
    <WizardShell
      open
      onClose={() => navigate('/incidents')}
      title="ახალი ინციდენტი"
      steps={STEPS}
      currentStep={step}
      onPrev={() => setStep((s) => s - 1)}
      onNext={() => setStep((s) => s + 1)}
      onFinish={() => { if (canFinish) mutation.mutate(); }}
      isSubmitting={mutation.isPending}
      nextDisabled={stepNextDisabled}
    >
      {/* Step 0: ინციდენტი */}
      {step === 0 && (
        <div className="space-y-5">
          {prefilledProjectId ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">პროექტი</p>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
                {(projects ?? []).find((p) => p.id === projectId)?.name ?? '…'}
              </div>
            </div>
          ) : (
            <ProjectPicker
              label="პროექტი"
              required
              value={projectId}
              onChange={setProjectId}
              options={(projects ?? []).map((p) => ({ value: p.id, label: p.name, logo: p.logo, company: p.company_name }))}
            />
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ინციდენტის სახეობა *</p>
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

          <FloatingLabelInput
            label="თარიღი და დრო *"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
          />

          <FloatingLabelInput
            label="ადგილი"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      )}

      {/* Step 1: დეტალები */}
      {step === 1 && (
        <div className="space-y-5">
          {type !== 'nearmiss' && (
            <div className="grid grid-cols-2 gap-3">
              <FloatingLabelInput
                label="დაზარალებულის სახელი"
                value={injuredName}
                onChange={(e) => setInjuredName(e.target.value)}
              />
              <FloatingLabelInput
                label="თანამდებობა"
                value={injuredRole}
                onChange={(e) => setInjuredRole(e.target.value)}
              />
            </div>
          )}

          <Textarea
            id="description"
            label="აღწერა *"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="შეაღწერეთ რა მოხდა…"
            radius="md"
            autosize={false}
          />

          <Textarea
            id="cause"
            label="მიზეზი *"
            rows={3}
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            placeholder="ინციდენტის გამომწვევი მიზეზი…"
            radius="md"
            autosize={false}
          />

          <Textarea
            id="actions"
            label="მიღებული ზომები *"
            rows={3}
            value={actionsTaken}
            onChange={(e) => setActionsTaken(e.target.value)}
            placeholder="რა ზომები იქნა მიღებული…"
            radius="md"
            autosize={false}
          />
        </div>
      )}

      {/* Step 2: მოწმეები */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">მოწმეები</p>
            <div className="flex gap-2">
              <TextInput
                value={witnessInput}
                onChange={(e) => setWitnessInput(e.target.value)}
                placeholder="სახელი, გვარი"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWitness(); } }}
                radius="md"
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
                    <button type="button" onClick={() => setWitnesses((p) => p.filter((x) => x !== w))} className="text-neutral-400 hover:text-red-500">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">დანართი ფაილები</p>
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              ფაილის არჩევა
            </Button>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={onFileChange} className="hidden" />
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-1.5 text-sm">
                    <span className="max-w-xs truncate">{f.name}</span>
                    <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="ml-2 shrink-0 text-neutral-400 hover:text-red-500">×</button>
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
        </div>
      )}
    </WizardShell>
  );
}
