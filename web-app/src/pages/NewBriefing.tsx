import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectPicker } from '@/components/ui/project-picker';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { WizardShell } from '@/components/ui/wizard-shell';
import { listProjects } from '@/lib/data/projects';
import { projectKeys, briefingKeys } from '@/app/queryKeys';
import {
  createBriefing,
  topicLabel,
  TOPIC_KEYS,
  type Briefing,
  type BriefingParticipant,
} from '@/lib/data/briefings';

const STEPS = ['ძირითადი', 'თემები', 'მონაწილეები'];

export default function NewBriefing() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  const prefilledProjectId = params.get('project') ?? '';

  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState(prefilledProjectId);
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [inspectorName, setInspectorName] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantPosition, setParticipantPosition] = useState('');
  const [participants, setParticipants] = useState<BriefingParticipant[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      createBriefing({
        projectId,
        dateTime: new Date(dateTime).toISOString(),
        topics,
        participants,
        inspectorName: inspectorName.trim(),
      }),
    onSuccess: (created: Briefing) => {
      qc.invalidateQueries({ queryKey: briefingKeys.lists() });
      navigate(`/briefings/${created.id}`);
    },
  });

  function toggleTopic(key: string) {
    setTopics((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
  }

  function addCustomTopic() {
    const v = customTopicInput.trim();
    if (!v) return;
    const key = `custom:${v}`;
    if (!topics.includes(key)) setTopics((prev) => [...prev, key]);
    setCustomTopicInput('');
  }

  function addParticipant() {
    const name = participantName.trim();
    if (!name) return;
    const next: BriefingParticipant = {
      fullName: name,
      position: participantPosition.trim() || null,
      signature: null,
    };
    setParticipants((prev) => [...prev, next]);
    setParticipantName('');
    setParticipantPosition('');
  }

  function removeParticipant(idx: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  }

  const canAdvanceStep0 = !!projectId && !!inspectorName.trim() && !!dateTime;
  const canAdvanceStep1 = topics.length > 0;
  const canFinish = participants.length > 0 && !mutation.isPending;

  const stepNextDisabled =
    (step === 0 && !canAdvanceStep0) ||
    (step === 1 && !canAdvanceStep1) ||
    (step === 2 && !canFinish);

  function handleNext() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }

  function handleFinish() {
    if (canFinish) mutation.mutate();
  }

  return (
    <WizardShell
      open
      onClose={() => navigate('/briefings')}
      title="ახალი ინსტრუქტაჟი"
      steps={STEPS}
      currentStep={step}
      onPrev={() => setStep((s) => s - 1)}
      onNext={handleNext}
      onFinish={handleFinish}
      isSubmitting={mutation.isPending}
      nextDisabled={stepNextDisabled}
    >
      {/* Step 0: ძირითადი */}
      {step === 0 && (
        <div className="space-y-5">
          <p className="text-sm text-neutral-500">
            შეავსეთ ინსტრუქტაჟის ინფორმაცია. ხელმოწერების შეგროვება შესაძლებელია ინსტრუქტაჟის დეტალურ გვერდზე.
          </p>

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

          <FloatingLabelInput
            label="თარიღი და დრო *"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
          />

          <FloatingLabelInput
            label="ინსტრუქტორი *"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
          />
        </div>
      )}

      {/* Step 1: თემები */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">აირჩიეთ მინიმუმ ერთი თემა.</p>

          <div className="flex flex-wrap gap-2">
            {TOPIC_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleTopic(key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  topics.includes(key)
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                }`}
              >
                {topicLabel(key)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={customTopicInput}
              onChange={(e) => setCustomTopicInput(e.target.value)}
              placeholder="საკუთარი თემა"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addCustomTopic(); }
              }}
            />
            <Button type="button" variant="outline" onClick={addCustomTopic} disabled={!customTopicInput.trim()}>
              დამატება
            </Button>
          </div>

          {topics.filter((t) => t.startsWith('custom:')).length > 0 && (
            <ul className="space-y-1">
              {topics.filter((t) => t.startsWith('custom:')).map((t) => (
                <li key={t} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-1.5 text-sm">
                  <span>{topicLabel(t)}</span>
                  <button type="button" onClick={() => toggleTopic(t)} className="text-neutral-400 hover:text-red-500">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Step 2: მონაწილეები */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">დაამატეთ მინიმუმ ერთი მონაწილე.</p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="სახელი, გვარი"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addParticipant(); } }}
            />
            <Input
              value={participantPosition}
              onChange={(e) => setParticipantPosition(e.target.value)}
              placeholder="თანამდებობა"
            />
            <Button type="button" variant="outline" onClick={addParticipant} disabled={!participantName.trim()}>
              დამატება
            </Button>
          </div>

          {participants.length > 0 && (
            <ul className="space-y-1">
              {participants.map((p, i) => (
                <li key={`${p.fullName}-${i}`} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-1.5 text-sm">
                  <div>
                    <span className="font-medium">{p.fullName}</span>
                    {p.position && <span className="text-neutral-500"> · {p.position}</span>}
                  </div>
                  <button type="button" onClick={() => removeParticipant(i)} className="text-neutral-400 hover:text-red-500">×</button>
                </li>
              ))}
            </ul>
          )}

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
