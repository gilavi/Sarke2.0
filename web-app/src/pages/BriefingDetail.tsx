import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteBriefing, getBriefing, topicLabel, updateBriefing } from '@/lib/data/briefings';

export default function BriefingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ inspectorName: '', dateTime: '' });

  const { data: b, error, isLoading } = useQuery({
    queryKey: ['briefing', id],
    queryFn: () => getBriefing(id!),
    enabled: !!id,
  });

  const delMutation = useMutation({
    mutationFn: () => deleteBriefing(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['briefings'] });
      navigate('/briefings');
    },
  });

  const editMutation = useMutation({
    mutationFn: () =>
      updateBriefing(id!, {
        inspectorName: form.inspectorName.trim(),
        dateTime: new Date(form.dateTime).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['briefing', id] });
      qc.invalidateQueries({ queryKey: ['briefings'] });
      setEditing(false);
    },
  });

  function startEdit() {
    if (!b) return;
    setForm({
      inspectorName: b.inspectorName,
      dateTime: new Date(b.dateTime).toISOString().slice(0, 16),
    });
    setEditing(true);
  }

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  if (!b) return <p className="text-sm text-neutral-500">ბრიფინგი ვერ მოიძებნა.</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link to="/briefings" className="text-sm text-brand-600 hover:underline">
            ← ბრიფინგები
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
            {new Date(b.dateTime).toLocaleString('ka-GE')}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {b.status}</p>
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
          {!editing && b.status === 'draft' && (
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

      {editing && (
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
              <div className="space-y-1">
                <Label>ინსპექტორი</Label>
                <Input
                  value={form.inspectorName}
                  onChange={(e) => setForm((f) => ({ ...f, inspectorName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>თარიღი და დრო</Label>
                <Input
                  type="datetime-local"
                  value={form.dateTime}
                  onChange={(e) => setForm((f) => ({ ...f, dateTime: e.target.value }))}
                />
              </div>
              {editMutation.error && (
                <p className="text-sm text-danger">
                  {editMutation.error instanceof Error
                    ? editMutation.error.message
                    : String(editMutation.error)}
                </p>
              )}
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
      )}
      {delMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {delMutation.error instanceof Error ? delMutation.error.message : String(delMutation.error)}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">მონაცემები</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-neutral-700">
          <div>ინსპექტორი: {b.inspectorName || '—'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">თემები</CardTitle>
        </CardHeader>
        <CardContent>
          {b.topics.length === 0 ? (
            <p className="text-sm text-neutral-500">თემები არ არის.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {b.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700"
                >
                  {topicLabel(t)}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">მონაწილეები ({b.participants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {b.participants.length === 0 ? (
            <p className="text-sm text-neutral-500">მონაწილეები არ არიან.</p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {b.participants.map((p, i) => (
                <li key={i} className="py-2 text-sm">
                  <div className="font-medium text-neutral-900">{p.fullName}</div>
                  {p.position && <div className="text-xs text-neutral-500">{p.position}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
