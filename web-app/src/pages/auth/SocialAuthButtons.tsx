import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { localizeAuthError } from './authErrors';

type Provider = 'google' | 'apple';

/** Multicolour Google "G" - lucide-react has no brand logos, so it's inline. */
function GoogleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

const PROVIDER_LABEL: Record<Provider, string> = {
  google: 'Google-ით გაგრძელება',
  apple: 'Apple-ით გაგრძელება',
};

/**
 * Social (OAuth) sign-in buttons shown under the email/password form on the
 * Login and Register pages. Currently Google-only; Apple drops in by adding
 * 'apple' to `providers` and a `signInWithApple` method on the auth context
 * (needs an Apple Services ID configured in Supabase first).
 */
export function SocialAuthButtons({ providers = ['google'] }: { providers?: Provider[] }) {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlers: Record<Provider, () => Promise<void>> = {
    google: signInWithGoogle,
    apple: async () => {}, // placeholder until signInWithApple lands
  };

  async function start(provider: Provider) {
    setError(null);
    setBusy(provider);
    try {
      // On success this triggers a full-page redirect, so `busy` simply stays
      // set until the browser navigates away.
      await handlers[provider]();
    } catch (err) {
      setError(localizeAuthError(err));
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
        ან
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </div>
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy !== null}
          leftSection={provider === 'google' ? <GoogleIcon /> : undefined}
          onClick={() => start(provider)}
        >
          {busy === provider ? 'გადამისამართება…' : PROVIDER_LABEL[provider]}
        </Button>
      ))}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
