import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from './AuthLayout';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 30;
const COOLDOWN_KEY_PREFIX = 'verify-otp-cooldown:';

const cooldownKey = (email: string) => `${COOLDOWN_KEY_PREFIX}${email.toLowerCase()}`;

function readPersistedCooldown(email: string): number {
  if (!email) return 0;
  const raw = localStorage.getItem(cooldownKey(email));
  if (!raw) return 0;
  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt)) return 0;
  const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

function writePersistedCooldown(email: string, seconds: number): void {
  if (!email) return;
  localStorage.setItem(cooldownKey(email), String(Date.now() + seconds * 1000));
}

function friendlyMessage(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('expired')) return 'კოდის ვადა ამოიწურა — მოითხოვე ახალი.';
  if (lower.includes('invalid') || lower.includes('token')) return 'არასწორი კოდი.';
  if (lower.includes('rate limit') || lower.includes('too many')) return 'ძალიან ბევრი მცდელობა. ცადეთ მოგვიანებით.';
  if (lower.includes('network') || lower.includes('fetch')) return 'ქსელის შეცდომა.';
  return msg || 'უცნობი შეცდომა';
}

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [cooldown, setCooldown] = useState(() => readPersistedCooldown(email));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function submit(value: string) {
    if (value.length !== CODE_LENGTH || !email) return;
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: value,
        type: 'signup',
      });
      if (error) throw error;
      navigate('/');
    } catch (e) {
      setError(friendlyMessage(e instanceof Error ? e.message : String(e)));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) void submit(digits);
  }

  async function handleResend() {
    if (cooldown > 0 || resendBusy || !email) return;
    setResendBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setInfo('ახალი კოდი გამოიგზავნა.');
      setCooldown(RESEND_COOLDOWN_SEC);
      writePersistedCooldown(email, RESEND_COOLDOWN_SEC);
    } catch (e) {
      setError(friendlyMessage(e instanceof Error ? e.message : String(e)));
    } finally {
      setResendBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(code);
  }

  if (!email) {
    return (
      <AuthLayout>
        <Card>
          <CardHeader>
            <CardTitle>დადასტურება</CardTitle>
            <CardDescription>მისამართი არ არის მითითებული.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/register" className="text-sm text-brand-600 hover:underline">
              ← რეგისტრაცია
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <MailCheck size={28} className="text-brand-600" />
          </div>
          <CardTitle>შეამოწმე ფოსტა</CardTitle>
          <CardDescription>
            გაგზავნილია 6-ნიშნა კოდი მისამართზე <span className="font-medium">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">დადასტურების კოდი</Label>
              <Input
                ref={inputRef}
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                value={code}
                onChange={(e) => handleChange(e.target.value)}
                disabled={busy}
                className="text-center font-mono text-2xl tracking-[0.6em]"
                placeholder="••••••"
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {info ? <p className="text-sm text-brand-600">{info}</p> : null}
            <Button type="submit" disabled={busy || code.length !== CODE_LENGTH} className="w-full">
              {busy ? 'მოწმდება…' : 'დადასტურება'}
            </Button>
            <div className="flex items-center justify-center gap-1 pt-2 text-sm">
              <span className="text-neutral-600">კოდი არ მოვიდა?</span>
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={cooldown > 0 || resendBusy}
                className="font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
              >
                {cooldown > 0 ? `ხელახლა გაგზავნა (${cooldown}წ)` : 'ხელახლა გაგზავნა'}
              </button>
            </div>
            <p className="text-center text-sm text-neutral-600">
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
