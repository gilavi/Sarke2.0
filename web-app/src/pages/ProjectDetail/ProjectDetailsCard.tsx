import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@mantine/core';
import { Input } from '@/components/ui/input';
import ProjectMap from '@/components/ProjectMap';
import { updateProject, type Project } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { humanizeError } from '@/lib/errors';

interface Props {
  project: Project;
  editing: boolean;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

export function ProjectDetailsCard({ project, editing, onCancel, onSaved, onError }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    name: project.name,
    address: project.address ?? '',
    contact_phone: project.contact_phone ?? '',
    latitude: project.latitude != null ? String(project.latitude) : '',
    longitude: project.longitude != null ? String(project.longitude) : '',
  }));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const latNum = form.latitude.trim() === '' ? null : Number(form.latitude);
      const lngNum = form.longitude.trim() === '' ? null : Number(form.longitude);
      const patch = {
        name: form.name.trim() || project.name,
        address: form.address.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        latitude: latNum !== null && !isNaN(latNum) ? latNum : null,
        longitude: lngNum !== null && !isNaN(lngNum) ? lngNum : null,
      };
      await updateProject(project.id, patch);
      qc.setQueryData(projectKeys.detail(project.id), { ...project, ...patch });
      void qc.invalidateQueries({ queryKey: projectKeys.lists() });
      onSaved();
    } catch (e) {
      onError(humanizeError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">დეტალები</CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <Input
              id="edit-name"
              label="სახელი"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              id="edit-address"
              label="მისამართი"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
            <Input
              id="edit-phone"
              label="ტელეფონი"
              value={form.contact_phone}
              onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">GPS კოორდინატები</p>
              <div className="flex flex-wrap gap-2">
                <NumberInput
                  id="edit-lat"
                  step={0.000001}
                  decimalScale={6}
                  placeholder="განედი (Latitude)"
                  value={form.latitude}
                  onChange={(v) => setForm((f) => ({ ...f, latitude: String(v) }))}
                  classNames={{ input: 'flex-1 min-w-[140px]' }}
                  radius="md"
                  hideControls
                />
                <NumberInput
                  id="edit-lng"
                  step={0.000001}
                  decimalScale={6}
                  placeholder="გრძედი (Longitude)"
                  value={form.longitude}
                  onChange={(v) => setForm((f) => ({ ...f, longitude: String(v) }))}
                  classNames={{ input: 'flex-1 min-w-[140px]' }}
                  radius="md"
                  hideControls
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setForm((f) => ({
                          ...f,
                          latitude: String(pos.coords.latitude),
                          longitude: String(pos.coords.longitude),
                        }));
                      },
                      () => onError('GPS მდებარეობა ვერ მოიძებნა.'),
                    );
                  }}
                >
                  ჩემი GPS
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                <Check size={14} className="mr-1" />
                {saving ? 'ინახება…' : 'შენახვა'}
              </Button>
              <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
                <X size={14} className="mr-1" />
                გაუქმება
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
            <div>მისამართი: {project.address || '—'}</div>
            <div>ტელეფონი: {project.contact_phone || '—'}</div>
            <div>
              GPS:{' '}
              {project.latitude != null && project.longitude != null ? (
                <>
                  {project.latitude.toFixed(6)} / {project.longitude.toFixed(6)}{' '}
                  <a
                    href={`https://maps.google.com/?q=${project.latitude},${project.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    Google Maps-ზე გახსნა →
                  </a>
                </>
              ) : (
                '—'
              )}
            </div>
            {project.latitude != null && project.longitude != null && (
              <ProjectMap
                pins={[{
                  id: project.id,
                  name: project.name,
                  address: project.address,
                  latitude: project.latitude,
                  longitude: project.longitude,
                }]}
                singlePin
                className="mt-3 h-52 w-full rounded-lg"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
