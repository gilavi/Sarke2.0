import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { routes } from '@/app/routes';
import { deleteAccount } from '@/lib/data/account';
import { supabase } from '@/lib/supabase';

export default function DeleteAccount() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verified, setVerified] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function verifyAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      setVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შესვლა ვერ მოხერხდა. გადაამოწმე ელფოსტა და პაროლი.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeletion() {
    setError('');
    setBusy(true);
    try {
      await deleteAccount();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ანგარიშის წაშლა ვერ მოხერხდა. მოგვწერე support@hubble.ge');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-offwhite px-5 pb-16 pt-28 text-graphite-900">
      <section className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          {done ? <CheckCircle2 aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-safety-700">Hubble</p>
        <h1 className="mb-4 font-display text-3xl font-bold sm:text-4xl">ანგარიშის წაშლა</h1>

        {done ? (
          <div role="status" className="rounded-2xl bg-green-50 p-5 text-green-900">
            <h2 className="font-semibold">ანგარიში წაიშალა</h2>
            <p className="mt-2 text-sm">Hubble-ში არსებული ანგარიშის წაშლის მოთხოვნა შესრულებულია.</p>
          </div>
        ) : (
          <>
            <p className="mb-6 leading-7 text-neutral-600">
              აქ შეგიძლია მოითხოვო Hubble ანგარიშისა და მასთან დაკავშირებული მონაცემების წაშლა.
              წაშლა მუდმივია და ანგარიშში ვეღარ შეხვალ.
            </p>

            <div className="mb-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <div className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle size={17} /> წაშლის შედეგი</div>
              წაიშლება ანგარიშის პროფილი და მასთან დაკავშირებული აპის მონაცემები, მათ შორის შენახული
              ჩანაწერები და დოკუმენტები. უკვე გადმოწერილი PDF-ები და SMS შეტყობინებები უკან ვერ წაიშლება.
            </div>

            {!verified ? (
              <form onSubmit={verifyAccount} className="space-y-4">
                <h2 className="text-lg font-semibold">1. დაადასტურე, რომ ანგარიში შენია</h2>
                <label className="block text-sm font-medium">
                  ელფოსტა
                  <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-safety-500" />
                </label>
                <label className="block text-sm font-medium">
                  პაროლი
                  <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-safety-500" />
                </label>
                <button disabled={busy} className="w-full rounded-xl bg-graphite-900 px-5 py-3 font-semibold text-white disabled:opacity-60">
                  {busy ? 'მოწმდება…' : 'ანგარიშის დადასტურება'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">2. დაადასტურე წაშლა</h2>
                <p className="text-sm text-neutral-600">ანგარიში დადასტურებულია: {email}. დასადასტურებლად ქვემოთ ჩაწერე DELETE.</p>
                <label className="block text-sm font-medium">
                  ჩაწერე DELETE
                  <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-red-500" />
                </label>
                <button disabled={busy || confirmation !== 'DELETE'} onClick={confirmDeletion} className="w-full rounded-xl bg-red-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
                  {busy ? 'იშლება…' : 'სამუდამოდ წაშალე ანგარიში'}
                </button>
              </div>
            )}

            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

            <div className="mt-8 border-t border-neutral-200 pt-5 text-sm leading-6 text-neutral-600">
              <h2 className="font-semibold text-graphite-900">ვერ შედიხარ ანგარიშში?</h2>
              <p>მოგვწერე <a className="font-medium text-safety-700 underline" href="mailto:support@hubble.ge?subject=Hubble%20account%20deletion">support@hubble.ge</a>-ზე იმ ელფოსტიდან, რომლითაც დარეგისტრირდი. მიუთითე, რომ ანგარიშისა და მასთან დაკავშირებული მონაცემების წაშლა გსურს. მოთხოვნის დასადასტურებლად შეიძლება დამატებითი ინფორმაციის მოწოდება დაგვჭირდეს.</p>
              <Link to={routes.privacy} className="mt-3 inline-block font-medium text-safety-700 underline">კონფიდენციალურობის პოლიტიკა</Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
