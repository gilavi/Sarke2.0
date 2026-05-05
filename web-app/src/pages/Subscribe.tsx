import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthLayout } from './auth/AuthLayout';

const SUCCESS_URL = 'https://gilavi.github.io/Sarke2.0/app/#/subscribe/success';
const FAIL_URL = 'https://gilavi.github.io/Sarke2.0/app/#/subscribe/fail';

const FEATURES = [
  'შეუზღუდავი PDF გენერაცია',
  'ყველა შაბლონი',
  'ისტორია და არქივი',
  'პრიორიტეტული მხარდაჭერა',
];

type AuthStatus = 'loading' | 'ready' | 'error';
type PayStatus = 'idle' | 'creating' | 'redirecting' | 'error';

export default function Subscribe() {
  const [params] = useSearchParams();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<PayStatus>('idle');
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    const at = params.get('at');
    const rt = params.get('rt');

    if (!at || !rt) {
      setAuthError('ავტორიზაციის ტოკენი არ მოიძებნა. დაბრუნდით Sarke აპში და სცადეთ ხელახლა.');
      setAuthStatus('error');
      return;
    }

    supabase.auth
      .setSession({ access_token: at, refresh_token: rt })
      .then(({ error }) => {
        if (error) {
          setAuthError('სესიის ვადა გავიდა. დაბრუნდით Sarke აპში და სცადეთ ხელახლა.');
          setAuthStatus('error');
        } else {
          setAuthStatus('ready');
        }
      })
      .catch(() => {
        setAuthError('ავტორიზაცია ვერ მოხერხდა.');
        setAuthStatus('error');
      });
  }, [params]);

  const handlePay = async () => {
    setPayStatus('creating');
    setPayError(null);
    try {
      const { data, error } = await supabase.functions.invoke<{
        order_id: string;
        redirect_url: string;
        error?: string;
      }>('create-bog-order', {
        body: { success_url: SUCCESS_URL, fail_url: FAIL_URL },
      });
      if (error) throw error;
      if (!data?.redirect_url) throw new Error('No redirect URL');

      setPayStatus('redirecting');
      window.location.href = data.redirect_url;
    } catch (e) {
      console.error('Pay error:', e);
      setPayError('გადახდის გვერდი ვერ გაიხსნა. სცადეთ ხელახლა.');
      setPayStatus('error');
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Sarke Pro</CardTitle>
          <CardDescription>ყოველთვიური გამოწერა</CardDescription>
        </CardHeader>
        <CardContent>
          {authStatus === 'loading' ? (
            <div className="flex items-center justify-center py-8 text-sm text-neutral-500">
              <Spinner /> <span className="ml-2">იტვირთება…</span>
            </div>
          ) : authStatus === 'error' ? (
            <p className="py-4 text-sm text-danger">{authError}</p>
          ) : (
            <div className="space-y-5">
              <ul className="space-y-3">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-neutral-700">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-neutral-200 pt-4 text-center">
                <div className="font-display text-4xl font-bold text-neutral-900">₾19</div>
                <div className="mt-1 text-sm text-neutral-500">თვეში</div>
                <div className="mt-2 text-xs text-neutral-500">გამოწერის გაუქმება ნებისმიერ დროს</div>
              </div>

              <Button
                onClick={handlePay}
                disabled={payStatus === 'creating' || payStatus === 'redirecting'}
                className="w-full"
              >
                {payStatus === 'creating' ? (
                  <span className="flex items-center justify-center gap-2"><Spinner /> მუშავდება…</span>
                ) : payStatus === 'redirecting' ? (
                  <span className="flex items-center justify-center gap-2"><Spinner /> გადამისამართება…</span>
                ) : (
                  'გადახდა ₾19'
                )}
              </Button>

              {payError ? <p className="text-sm text-danger">{payError}</p> : null}
            </div>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
