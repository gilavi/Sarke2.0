import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordInput } from '@mantine/core';
import { Input } from '@/components/ui/input';
import { AuthLayout } from './AuthLayout';

/**
 * Translate Supabase auth errors (English) into Georgian. Falls back to the
 * raw message only for cases we don't recognise — keeps the Georgian UI
 * consistent and avoids surfacing internal English text on the login screen.
 */
function localizeAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'მცდარი ელ-ფოსტა ან პაროლი';
  if (lower.includes('email not confirmed')) return 'ელ-ფოსტა არ არის დადასტურებული';
  if (lower.includes('user not found')) return 'მომხმარებელი ვერ მოიძებნა';
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'მცდელობების ლიმიტი ამოწურულია, სცადეთ მოგვიანებით';
  }
  if (lower.includes('network')) return 'ქსელის შეცდომა, შეამოწმეთ ინტერნეტი';
  return msg || 'შესვლა ვერ მოხერხდა';
}

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/home';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(localizeAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>შესვლა</CardTitle>
          <CardDescription>შეიყვანეთ ელ-ფოსტა და პაროლი</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              id="email"
              label="ელ-ფოსტა"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordInput
              id="password"
              label="პაროლი"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              radius="md"
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'შესვლა…' : 'შესვლა'}
            </Button>
            <div className="flex items-center justify-between pt-2 text-sm">
              <Link to="/forgot" className="text-brand-600 hover:underline">
                პაროლი დაგავიწყდა?
              </Link>
              <Link to="/register" className="text-brand-600 hover:underline">
                რეგისტრაცია
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
