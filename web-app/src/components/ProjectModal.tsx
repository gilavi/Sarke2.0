import { useEffect, useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EditableProjectAvatar } from '@/components/ProjectAvatar';
import { AddressInput } from '@/components/AddressInput';
import { useAuth } from '@/lib/auth';
import {
  createProject,
  updateProject,
  updateProjectLogo,
  getProject,
  type Project,
} from '@/lib/data/projects';

/* ── Phone helpers ── */
function normalizePhone(raw: string) {
  return raw.replace(/[^\d+\-\s()]/g, '');
}
function isValidPhone(v: string) {
  if (!v.trim()) return true;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pass a project id to edit an existing project */
  projectId?: string;
}

export function ProjectModal({ open, onClose, projectId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!projectId;

  const { data: existing } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: isEdit && open,
  });

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoChanged, setLogoChanged] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      setName(existing.name);
      setCompanyName(existing.company_name ?? '');
      setAddress(existing.address ?? '');
      setPhone(existing.contact_phone ?? '');
      setLatitude(existing.latitude ?? null);
      setLongitude(existing.longitude ?? null);
      setLogoDataUrl(existing.logo ?? null);
      setLogoChanged(false);
    } else if (!isEdit) {
      setName(''); setCompanyName(''); setAddress(''); setPhone('');
      setLatitude(null); setLongitude(null); setLogoDataUrl(null); setLogoChanged(false);
    }
    setErrors({});
  }, [open, isEdit, existing]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'სახელი სავალდებულოა';
    if (!isValidPhone(phone)) e.phone = 'ტელეფონი: 6–15 ციფრი';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('არაავტორიზებული');
      if (isEdit && projectId) {
        await updateProject(projectId, {
          name: name.trim(),
          company_name: companyName.trim() || null,
          address: address.trim() || null,
          contact_phone: phone.trim() || null,
          latitude,
          longitude,
        });
        if (logoChanged) await updateProjectLogo(projectId, logoDataUrl);
        return null;
      } else {
        const created = await createProject({
          userId: user.id,
          name: name.trim(),
          companyName: companyName.trim() || name.trim(),
          address: address.trim() || null,
          contactPhone: phone.trim() || null,
          latitude,
          longitude,
        });
        if (logoDataUrl) await updateProjectLogo(created.id, logoDataUrl);
        return created;
      }
    },
    onSuccess: (created) => {
      if (isEdit && projectId) {
        void qc.invalidateQueries({ queryKey: ['project', projectId] });
      } else if (created) {
        qc.setQueryData<Project[]>(['projects'], (prev) => (prev ? [created, ...prev] : [created]));
      }
      void qc.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setLogoDataUrl(reader.result as string); setLogoChanged(true); };
    reader.readAsDataURL(file);
  }

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={isEdit ? 'პროექტის რედაქტირება' : 'ახალი პროექტი'}
      size="lg"
      radius="md"
      centered
    >
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <EditableProjectAvatar
            project={{ name: name || '?', company_name: companyName, logo: logoDataUrl }}
            size="lg"
            onFileInputChange={handleLogoSelect}
          />
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {logoDataUrl ? 'ლოგო არჩეულია' : 'დააჭირეთ ლოგოს ასარჩევად'}
          </span>
        </div>

        {/* Name */}
        <div className="space-y-1">
          <Label htmlFor="pm-name">პროექტის სახელი *</Label>
          <Input
            id="pm-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className={errors.name ? 'border-red-400 focus-visible:ring-red-300' : ''}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </div>

        {/* Company */}
        <div className="space-y-1">
          <Label htmlFor="pm-company">კომპანია</Label>
          <Input id="pm-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>

        {/* Address */}
        <div className="space-y-1">
          <Label htmlFor="pm-address">მისამართი</Label>
          <AddressInput
            id="pm-address"
            value={address}
            onChange={setAddress}
            onCoords={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
            initialLat={latitude}
            initialLng={longitude}
          />
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <Label htmlFor="pm-phone">ტელეფონი</Label>
          <Input
            id="pm-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(normalizePhone(e.target.value))}
            placeholder="+995 5XX XXX XXX"
            className={errors.phone ? 'border-red-400 focus-visible:ring-red-300' : ''}
          />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
        </div>

        {mutation.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            გაუქმება
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (isEdit ? 'ინახება…' : 'იქმნება…') : (isEdit ? 'შენახვა' : 'შექმნა')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
