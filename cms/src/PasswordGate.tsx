import { useState } from 'react';
import { AuthError, load } from './api';
import type { Row } from './types';

export function PasswordGate({ onAuthed }: { onAuthed: (pw: string, rows: Row[]) => void }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw || loading) return;
    setLoading(true);
    setErr('');
    try {
      const rows = await load(pw);
      sessionStorage.setItem('cms.pw', pw);
      onAuthed(pw, rows);
    } catch (e) {
      setErr(e instanceof AuthError ? 'Wrong password.' : 'Could not connect. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8"
      >
        <h1 className="text-xl font-bold text-neutral-900">Hubble — Text CMS</h1>
        <p className="mt-1 text-sm text-neutral-500">Enter the password to continue.</p>
        <input
          type="password"
          value={pw}
          autoFocus
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="mt-5 w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={loading || !pw}
          className="mt-4 w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-neutral-300"
        >
          {loading ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
