import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextInput } from '@mantine/core';
import { AuthLayout } from './AuthLayout';

export default function Forgot() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ვერ გაიგზავნა');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>პაროლის აღდგენა</CardTitle>
          <CardDescription>მიიღებთ ბმულს ახალი პაროლის დასაყენებლად</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-neutral-700">
                თუ ანგარიში არსებობს, გამოვაგზავნეთ ბმული მისამართზე <b>{email}</b>.
              </p>
              <Link to="/login">
                <Button variant="secondary" className="w-full">
                  შესვლა
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <TextInput
                id="email"
                label="ელ-ფოსტა"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                radius="md"
              />
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? 'იგზავნება…' : 'ბმულის გაგზავნა'}
              </Button>
              <p className="pt-2 text-center text-sm">
                <Link to="/login" className="text-brand-600 hover:underline">
                  დაბრუნება შესვლის გვერდზე
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
