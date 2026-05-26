import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextInput, PasswordInput } from '@mantine/core';
import { AuthLayout } from './AuthLayout';

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Too weak', color: 'text-red-500' },
    { label: 'Weak', color: 'text-orange-500' },
    { label: 'Fair', color: 'text-yellow-500' },
    { label: 'Good', color: 'text-blue-500' },
    { label: 'Strong', color: 'text-green-500' },
    { label: 'Very strong', color: 'text-green-600' },
  ];
  return { score, ...levels[score] };
};

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const { needsEmailConfirmation } = await signUp({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (needsEmailConfirmation) {
        setInfo('შემოწმეთ ელ-ფოსტა — გამოვაგზავნეთ დადასტურების კოდი.');
        navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'რეგისტრაცია ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>რეგისტრაცია</CardTitle>
          <CardDescription>შექმენით ახალი ანგარიში</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                id="first"
                label="სახელი"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                radius="md"
              />
              <TextInput
                id="last"
                label="გვარი"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                radius="md"
              />
            </div>
            <TextInput
              id="email"
              label="ელ-ფოსტა"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              radius="md"
            />
            <div className="space-y-1">
              <PasswordInput
                id="password"
                label="პაროლი"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                radius="md"
              />
              {password && (() => {
                const strength = getPasswordStrength(password);
                return (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-6 rounded-full ${i < strength.score ? strength.color.replace('text-', 'bg-') : 'bg-neutral-200'}`}
                        />
                      ))}
                    </div>
                    <span className={strength.color}>{strength.label}</span>
                  </div>
                );
              })()}
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {info ? <p className="text-sm text-brand-600">{info}</p> : null}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'რეგისტრაცია…' : 'რეგისტრაცია'}
            </Button>
            <p className="pt-2 text-center text-sm text-neutral-600">
              უკვე გაქვთ ანგარიში?{' '}
              <Link to="/login" className="text-brand-600 hover:underline">
                შესვლა
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
