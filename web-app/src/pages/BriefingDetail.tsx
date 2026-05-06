import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  deleteBriefing,
  getBriefing,
  TOPIC_KEYS,
  TOPIC_LABELS,
  topicLabel,
  updateBriefing,
  type BriefingParticipant,
} from '@/lib/data/briefings';

export default function BriefingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: b, error, isLoading } = useQuery({
    queryKey: ['briefing', id],
    queryFn: () => getBriefing(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateBriefing>[1]) => updateBriefing(id!, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['briefing', id] });
      qc.invalidateQueries({ queryKey: ['briefings'] });
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  const delMutation = useMutation({
    mutationFn: () => deleteBriefing(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['briefings'] });
      navigate('/briefings');
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  if (!b) return <p className="text-sm text-neutral-500">ბრიფინგი ვერ მოიძებნა.</p>;

  const isDraft = b.status === 'draft';

  function toggleTopic(key: string) {
    const current = b!.topics;
    const next = current.includes(key)
      ? current.filter((t) => t !== key)
      : [...current, key];
    updateMutation.mutate({ topics: next });
  }

  function patchParticipant(idx: number, patch: Partial<BriefingParticipant>) {
    const participants = b!.participants.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    updateMutation.mutate({ participants });
  }

  function addParticipant() {
    updateMutation.mutate({ participants: [...b!.participants, { fullName: '', position: '' }] });
  }

  function removeParticipant(idx: number) {
    updateMutation.mutate({ participants: b!.participants.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link to="/briefings" className="text-sm text-brand-600 hover:underline">
            ← ბრიფინგები
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
            ბრიფინგი — {new Date(b.dateTime).toLocaleDateString('ka-GE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {b.status === 'completed' ? 'დასრულებული' : 'დრაფტი'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`#/briefings/${b.id}/print`, '_blank')}
          >
            <FileText size={14} className="mr-1" />
            PDF
          </Button>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(false)}
                disabled={delMutation.isPending}
              >
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

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* General info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="space-y-1">
            <Label>ინსპექტორი</Label>
            <Input
              disabled={!isDraft}
              defaultValue={b.inspectorName}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== b.inspectorName) updateMutation.mutate({ inspectorName: v });
              }}
            />
          </div>
          <div className="space-y-1">
            <Label>თარიღი და დრო</Label>
            <Input
              type="datetime-local"
              disabled={!isDraft}
              defaultValue={new Date(b.dateTime).toISOString().slice(0, 16)}
              onBlur={(e) => {
                const v = e.target.value;
                if (v && new Date(v).toISOString() !== new Date(b.dateTime).toISOString()) {
                  updateMutation.mutate({ dateTime: new Date(v).toISOString() });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            თემები
            <span className="ml-2 text-sm font-normal text-neutral-400">({b.topics.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isDraft ? (
            <div className="flex flex-wrap gap-2">
              {TOPIC_KEYS.map((key) => {
                const selected = b.topics.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleTopic(key)}
                    disabled={updateMutation.isPending}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                      selected
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                    }`}
                  >
                    {TOPIC_LABELS[key as keyof typeof TOPIC_LABELS] ?? key}
                  </button>
                );
              })}
            </div>
          ) : b.topics.length === 0 ? (
            <p className="text-sm text-neutral-500">თემები არ არის.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {b.topics.map((t) => (
                <span key={t} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                  {topicLabel(t)}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            მონაწილეები
            <span className="ml-2 text-sm font-normal text-neutral-400">({b.participants.length})</span>
          </CardTitle>
          {isDraft && (
            <Button variant="outline" size="sm" onClick={addParticipant}>
              <Plus size={14} className="mr-1" />
              დამატება
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {b.participants.length === 0 ? (
            <p className="text-sm text-neutral-500">მონაწილეები არ არიან.</p>
          ) : (
            <ul className="space-y-2">
              {b.participants.map((p, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3">
                  {isDraft ? (
                    <>
                      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          defaultValue={p.fullName}
                          onBlur={(e) => {
                            if (e.target.value !== p.fullName)
                              patchParticipant(i, { fullName: e.target.value });
                          }}
                          placeholder="სახელი გვარი"
                          className="text-sm"
                        />
                        <Input
                          defaultValue={p.position ?? ''}
                          onBlur={(e) => {
                            if (e.target.value !== (p.position ?? ''))
                              patchParticipant(i, { position: e.target.value });
                          }}
                          placeholder="თანამდებობა"
                          className="text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeParticipant(i)}
                        className="mt-1 text-neutral-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="text-sm">
                      <div className="font-medium text-neutral-900">{p.fullName || '—'}</div>
                      {p.position && <div className="text-xs text-neutral-500">{p.position}</div>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Complete */}
      {isDraft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">დასრულება</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              onClick={() => updateMutation.mutate({ status: 'completed' })}
              disabled={updateMutation.isPending}
            >
              ბრიფინგის დასრულება
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
