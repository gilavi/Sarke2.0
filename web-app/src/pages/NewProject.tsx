import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { createProject, type Project } from '@/lib/data/projects';

export default function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('არაავტორიზებული');
      return createProject({
        userId: user.id,
        name: name.trim(),
        companyName: companyName.trim() || name.trim(),
        address: address.trim() || null,
        contactPhone: contactPhone.trim() || null,
      });
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
