import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  addProjectSigner,
  deleteProjectSigner,
  listProjectSigners,
  type ProjectSigner,
} from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';

interface Props {
  projectId: string;
  onError: (msg: string) => void;
}

export function SignersSection({ projectId, onError }: Props) {
  const qc = useQueryClient();
  const { data: signers = [] } = useQuery({
    queryKey: projectKeys.signers(projectId),
    queryFn: () => listProjectSigners(projectId),
  });

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ full_name: '', position: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function save() {
    if (!form.full_name.trim()) return;
    setBusy(true);
    try {
      const created = await addProjectSigner({
        projectId,
        fullName: form.full_name.trim(),
        position: form.position.trim() || null,
        phone: form.phone.trim() || null,
      });
      qc.setQueryData<ProjectSigner[]>(projectKeys.signers(projectId), (prev) => [
        ...(prev ?? []),
        created,
      ]);
      setForm({ full_name: '', position: '', phone: '' });
      setAdding(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: ProjectSigner) {
    setRemovingId(s.id);
    try {
      await deleteProjectSigner(s.id);
      qc.setQueryData<ProjectSigner[]>(projectKeys.signers(projectId), (prev) =>
        (prev ?? []).filter((x) => x.id !== s.id),
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          ხელმომწერები
          <span className="ml-2 text-sm font-normal text-neutral-400">({signers.length})</span>
        </CardTitle>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus size={14} className="mr-1" />
            დამატება
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {adding && (
          <div className="mb-3 space-y-2 rounded-md border border-brand-200 bg-brand-50/40 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                placeholder="სახელი, გვარი"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
              <Input
                placeholder="თანამდებობა"
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              />
              <Input
                placeholder="ტელეფონი"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void save()}
                disabled={busy || !form.full_name.trim()}
              >
                {busy ? 'ემატება…' : 'შენახვა'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdding(false);
                  setForm({ full_name: '', position: '', phone: '' });
                }}
                disabled={busy}
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
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">{s.full_name}</div>
                  <div className="text-xs text-neutral-500">
                    {s.position || '—'}
                    {s.phone ? ` · ${s.phone}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(s)}
                  disabled={removingId === s.id}
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
  );
}
