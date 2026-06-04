import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { setProjectCrew, type CrewMember, type Project } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { CREW_ROLE_LABEL } from './_shared';
import { humanizeError } from '@/lib/errors';

interface Props {
  project: Project;
  onError: (msg: string) => void;
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function CrewSection({ project, onError }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', roleKey: 'expert' });
  const [busy, setBusy] = useState(false);

  const crew: CrewMember[] = project.crew ?? [];

  async function commitCrew(updated: CrewMember[]) {
    await setProjectCrew(project.id, updated);
    qc.setQueryData(projectKeys.detail(project.id), { ...project, crew: updated });
    void qc.invalidateQueries({ queryKey: projectKeys.lists() });
  }

  async function add() {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const next: CrewMember = {
        id: newId(),
        roleKey: form.roleKey,
        role: CREW_ROLE_LABEL[form.roleKey] ?? form.roleKey,
        name: form.name.trim(),
        signature: null,
      };
      await commitCrew([...crew, next]);
      setForm({ name: '', roleKey: 'expert' });
      setAdding(false);
    } catch (e) {
      onError(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(memberId: string) {
    try {
      await commitCrew(crew.filter((m) => m.id !== memberId));
    } catch (e) {
      onError(humanizeError(e));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          გუნდი
          <span className="ml-2 text-sm font-normal text-neutral-400">({crew.length})</span>
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="სახელი, გვარი"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Select
                size="sm"
                value={form.roleKey}
                onChange={(v) => setForm((f) => ({ ...f, roleKey: v }))}
                options={Object.entries(CREW_ROLE_LABEL).map(([k, v]) => ({ value: k, label: v }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void add()}
                disabled={busy || !form.name.trim()}
              >
                {busy ? 'ემატება…' : 'შენახვა'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdding(false);
                  setForm({ name: '', roleKey: 'expert' });
                }}
                disabled={busy}
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
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">{m.name}</div>
                  <div className="text-xs text-neutral-500">
                    {CREW_ROLE_LABEL[m.roleKey] ?? m.role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(m.id)}
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
  );
}
