import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { EditableProjectAvatar } from '@/components/ProjectAvatar';
import { useAuth } from '@/lib/auth';
import { createProject, updateProjectLogo, type Project } from '@/lib/data/projects';
import { AddressInput } from '@/components/AddressInput';
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError } from '@/lib/errors';

export default function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('არაავტორიზებული');
      const created = await createProject({
        userId: user.id,
        name: name.trim(),
        companyName: companyName.trim() || name.trim(),
        address: address.trim() || null,
        contactPhone: contactPhone.trim() || null,
        latitude,
        longitude,
      });
      if (logoDataUrl) {
        await updateProjectLogo(created.id, logoDataUrl);
        return { ...created, logo: logoDataUrl };
      }
      return created;
    },
    onSuccess: (created) => {
      qc.setQueryData<Project[]>(['projects'], (prev) => (prev ? [created, ...prev] : [created]));
      qc.setQueryData(['project', created.id], created);
      navigate(`/projects/${created.id}`);
    },
  });

  const canSubmit = !!name.trim() && !mutation.isPending;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <Link to="/projects" className="text-sm text-brand-600 hover:underline">
          ← პროექტები
        </Link>
        <h1 className="mt-2 font-display text-heading-1 text-neutral-900 dark:text-neutral-100">ახალი პროექტი</h1>
        <p className="mt-1 text-sm text-neutral-500">
          შეიყვანეთ პროექტის ძირითადი ინფორმაცია. მონაცემები იქვე გამოჩნდება მობილურ აპში.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">დეტალები</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
          >
            {/* Logo picker */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ლოგო (სურვილისამებრ)</p>
              <div className="flex items-center gap-3">
                <EditableProjectAvatar
                  project={{ name: name || '?', company_name: companyName, logo: logoDataUrl }}
                  size="lg"
                  onFileInputChange={handleLogoSelect}
                />
                <span className="text-sm text-neutral-500">
                  {logoDataUrl ? 'ლოგო არჩეულია' : 'დააჭირეთ ლოგოს ასარჩევად'}
                </span>
              </div>
            </div>

            <FloatingLabelInput
              id="name"
              label="პროექტის სახელი *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            <FloatingLabelInput
              id="company"
              label="კომპანია"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">მისამართი</p>
              <AddressInput
                id="address"
                value={address}
                onChange={setAddress}
                onCoords={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
              />
            </div>
            <FloatingLabelInput
              id="phone"
              label="ტელეფონი"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />

            {mutation.error && (
              <ErrorMessage compact>
                {humanizeError(mutation.error)}
              </ErrorMessage>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!canSubmit}>
                {mutation.isPending ? 'იქმნება…' : 'შექმნა'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/projects')}
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
