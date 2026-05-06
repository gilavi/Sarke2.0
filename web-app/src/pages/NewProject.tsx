import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { createProject, updateProjectLogo, type Project } from '@/lib/data/projects';

export default function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

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
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">ახალი პროექტი</h1>
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
              <Label>ლოგო (სურვილისამებრ)</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 transition hover:border-brand-400"
                >
                  {logoDataUrl ? (
                    <img src={logoDataUrl} alt="logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-neutral-400">
                      {name ? name.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
                    <Upload size={16} className="text-white" />
                  </span>
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <span className="text-sm text-neutral-500">
                  {logoDataUrl ? 'ლოგო არჩეულია' : 'დააჭირეთ ლოგოს ასარჩევად'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">პროექტის სახელი *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="მაგ: არქი ბათუმი"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="company">კომპანია</Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="თუ ცარიელი დარჩა, სახელი ჩაიწერება"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">მისამართი</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ქუჩა, ქალაქი"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">ტელეფონი</Label>
              <Input
                id="phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="555 12 34 56"
              />
            </div>

            {mutation.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
              </div>
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
