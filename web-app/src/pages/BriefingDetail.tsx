import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, X } from 'lucide-react';
import DeleteButton from '@/components/DeleteButton';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  deleteBriefing,
  getBriefing,
  TOPIC_KEYS,
  TOPIC_LABELS,
  topicLabel,
  updateBriefing,
  type BriefingParticipant,
} from '@/lib/data/briefings';
import { fmtDateKa } from '@/lib/utils';
import { getProject } from '@/lib/data/projects';
import { routes } from '@/app/routes';
import { projectKeys, briefingKeys } from '@/app/queryKeys';
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError } from '@/lib/errors';

export default function BriefingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: b, error, isLoading } = useQuery({
    queryKey: briefingKeys.detail(id),
    queryFn: () => getBriefing(id!),
    enabled: !!id,
  });
  const projectId = b?.projectId;
  const { data: project } = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateBriefing>[1]) => updateBriefing(id!, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: briefingKeys.detail(id) });
      qc.invalidateQueries({ queryKey: briefingKeys.lists() });
    },
    onError: (e) => setActionError(humanizeError(e)),
  });

  const delMutation = useMutation({
    mutationFn: () => deleteBriefing(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: briefingKeys.lists() });
      navigate('/briefings');
    },
    onError: (e) => setActionError(humanizeError(e)),
  });

  if (isLoading) return <SkeletonDetailPage />;
  if (error)
    return <ErrorMessage>{humanizeError(error)}</ErrorMessage>;
  if (!b) return <p className="text-sm text-neutral-500">ინსტრუქტაჟი ვერ მოიძებნა.</p>;

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
          <nav className="flex items-center gap-1 text-sm">
            {project && (
              <>
                <Link to={routes.projects.detail(project.id)} className="text-brand-600 hover:underline">
                  {project.name}
                </Link>
                <span className="text-neutral-400">›</span>
              </>
            )}
            <Link to={routes.briefings.list(projectId)} className="text-brand-600 hover:underline">
              ინსტრუქტაჟები
            </Link>
            <span className="text-neutral-400">›</span>
            <span className="truncate max-w-[200px] text-neutral-500">
              {b.topics.length > 0 ? topicLabel(b.topics[0]) : fmtDateKa(b.dateTime)}
            </span>
          </nav>
          <h1 className="mt-2 font-display text-heading-1 text-neutral-900 dark:text-neutral-100">
            ინსტრუქტაჟი - {fmtDateKa(b.dateTime)}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {b.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}</p>
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
          <DeleteButton onDelete={() => delMutation.mutate()} isPending={delMutation.isPending} />
        </div>
      </header>

      {actionError && (
        <ErrorMessage compact>{actionError}</ErrorMessage>
      )}

      {/* General info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Input
            label="ინსპექტორი"
            disabled={!isDraft}
            key={b.inspectorName}
            defaultValue={b.inspectorName}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== b.inspectorName) updateMutation.mutate({ inspectorName: v });
            }}
          />
          <Input
            label="თარიღი და დრო"
            type="datetime-local"
            disabled={!isDraft}
            key={b.dateTime}
            defaultValue={new Date(b.dateTime).toISOString().slice(0, 16)}
            onBlur={(e) => {
              const v = e.target.value;
              if (v && new Date(v).toISOString() !== new Date(b.dateTime).toISOString()) {
                updateMutation.mutate({ dateTime: new Date(v).toISOString() });
              }
            }}
          />
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
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-brand-500'
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
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">{p.fullName || '-'}</div>
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
              ინსტრუქტაჟის დასრულება
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
