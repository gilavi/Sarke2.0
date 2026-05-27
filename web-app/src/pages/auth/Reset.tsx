import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordInput } from '@mantine/core';
import { AuthLayout } from './AuthLayout';

export default function Reset() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('პაროლები არ ემთხვევა');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ვერ შეიცვალა');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>ახალი პაროლი</CardTitle>
          <CardDescription>დააყენეთ ახალი პაროლი ანგარიშზე</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <PasswordInput
              id="password"
              label="ახალი პაროლი"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              radius="md"
            />
            <PasswordInput
              id="confirm"
              label="გაიმეორეთ"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              radius="md"
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'ინახება…' : 'შენახვა'}
            </Button>
            <p className="pt-1 text-center text-sm text-neutral-500">
              ბმული ამოიწურა?{' '}
              <Link to="/forgot-password" className="text-brand-600 hover:underline">
                ხელახლა გაგზავნა
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
