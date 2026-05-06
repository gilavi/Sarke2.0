import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listProjects } from '@/lib/data/projects';
import {
  createBriefing,
  topicLabel,
  TOPIC_KEYS,
  type Briefing,
  type BriefingParticipant,
} from '@/lib/data/briefings';

export default function NewBriefing() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
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
      qc.invalidateQueries({ queryKey: ['briefings'] });
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

  const canSubmit =
    !!projectId &&
    !!inspectorName.trim() &&
    topics.length > 0 &&
    participants.length > 0 &&
    !mutation.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link to="/briefings" className="text-sm text-brand-600 hover:underline">
          ← ბრიფინგები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">ახალი ბრიფინგი</h1>
        <p className="mt-1 text-sm text-neutral-500">
          ხელმოწერების შეგროვება ხდება მობილურ აპში — აქ შექმნილი ბრიფინგი ინახება როგორც „დრაფტი".
        </p>
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

            {/* Inspector */}
            <div className="space-y-1">
              <Label htmlFor="inspector">ინსტრუქტორი *</Label>
              <Input
                id="inspector"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="სახელი, გვარი"
                required
              />
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <Label>თემები * (აირჩიეთ მინიმუმ ერთი)</Label>
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
              <div className="flex gap-2 pt-1">
                <Input
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  placeholder="საკუთარი თემა"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTopic();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomTopic}
                  disabled={!customTopicInput.trim()}
                >
                  დამატება
                </Button>
              </div>
              {topics.filter((t) => t.startsWith('custom:')).length > 0 && (
                <ul className="space-y-1 pt-1">
                  {topics
                    .filter((t) => t.startsWith('custom:'))
                    .map((t) => (
                      <li
                        key={t}
                        className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-1.5 text-sm"
                      >
                        <span>{topicLabel(t)}</span>
                        <button
                          type="button"
                          onClick={() => toggleTopic(t)}
                          className="text-neutral-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <Label>მონაწილეები * (მინიმუმ ერთი)</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="სახელი, გვარი"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addParticipant();
                    }
                  }}
                />
                <Input
                  value={participantPosition}
                  onChange={(e) => setParticipantPosition(e.target.value)}
                  placeholder="თანამდებობა"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addParticipant}
                  disabled={!participantName.trim()}
                >
                  დამატება
                </Button>
              </div>
              {participants.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {participants.map((p, i) => (
                    <li
                      key={`${p.fullName}-${i}`}
                      className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-1.5 text-sm"
                    >
                      <div>
                        <span className="font-medium">{p.fullName}</span>
                        {p.position ? (
                          <span className="text-neutral-500"> · {p.position}</span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeParticipant(i)}
                        className="text-neutral-400 hover:text-red-500"
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
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : String(mutation.error)}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!canSubmit}>
                {mutation.isPending ? 'ინახება…' : 'შენახვა'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/briefings')}
                disabled={mutation.isPending}
              >
                გაუქმება
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
