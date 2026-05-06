import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, User, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { useAuth } from '@/lib/auth';
import { updateUserName } from '@/lib/data/account';
import { usePaymentHistory, type PaymentRecord } from '@/lib/subscription';

const STATUS_LABEL: Record<PaymentRecord['status'], string> = {
  success: 'წარმატებული',
  failed: 'წარუმატებელი',
  pending: 'მოლოდინში',
  refunded: 'დაბრუნებული',
};

const STATUS_CLASS: Record<PaymentRecord['status'], string> = {
  success: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  pending: 'bg-neutral-100 text-neutral-600',
  refunded: 'bg-amber-50 text-amber-700',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ka-GE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProfileCard() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
  }, [profile?.first_name, profile?.last_name]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('არაავტორიზებული');
      return updateUserName(user.id, firstName.trim(), lastName.trim());
    },
    onSuccess: () => {
      setInfo('მონაცემები შენახულია.');
      qc.invalidateQueries({ queryKey: ['users', user?.id] });
      setTimeout(() => setInfo(null), 2500);
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    mutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User size={16} /> პროფილი
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acct-first">სახელი</Label>
              <Input
                id="acct-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acct-last">გვარი</Label>
              <Input
                id="acct-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ელ-ფოსტა</Label>
            <Input value={user?.email ?? ''} disabled />
          </div>
          {mutation.error && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
            </p>
          )}
          {info && <p className="text-sm text-brand-600">{info}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? 'ინახება…' : 'შენახვა'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const { updatePassword } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => updatePassword(pw),
    onSuccess: () => {
      setInfo('პაროლი შეცვლილია.');
      setPw('');
      setPw2('');
      setTimeout(() => setInfo(null), 2500);
    },
  });

  const canSubmit = pw.length >= 8 && pw === pw2 && !mutation.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (canSubmit) mutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound size={16} /> პაროლი
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="acct-pw">ახალი პაროლი</Label>
            <Input
              id="acct-pw"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="მინ. 8 სიმბოლო"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acct-pw2">გაიმეორეთ</Label>
            <Input
              id="acct-pw2"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
          </div>
          {pw && pw2 && pw !== pw2 && (
            <p className="text-sm text-danger">პაროლები არ ემთხვევა.</p>
          )}
          {mutation.error && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
            </p>
          )}
          {info && <p className="text-sm text-brand-600">{info}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {mutation.isPending ? 'ინახება…' : 'შეცვლა'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Account() {
  const { data: history, isLoading } = usePaymentHistory();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">ანგარიში</h1>
        <p className="mt-1 text-sm text-neutral-500">
          პროფილი, გამოწერა, PDF გამოყენება და გადახდის ისტორია.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <SubscriptionCard />
          <ProfileCard />
          <PasswordCard />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardContent>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                გადახდის ისტორია
              </div>

              {isLoading ? (
                <div className="h-20 animate-pulse rounded-md bg-neutral-100" />
              ) : !history || history.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-neutral-500">
                  <Receipt size={28} className="text-neutral-400" />
                  <span>ჩანაწერები არ არის</span>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {history.map((row) => (
                    <li key={row.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {row.amount != null
                            ? `${row.currency === 'GEL' ? '₾' : (row.currency ?? '')}${row.amount.toFixed(2)}`
                            : '—'}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {formatDateTime(row.created_at)} · #{row.bog_order_id.slice(0, 8)}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[row.status]}`}
                      >
                        {STATUS_LABEL[row.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
