import { Link, Navigate } from 'react-router-dom';
import { memo, useState } from 'react';
import {
  ShieldCheck,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  Award,
  Cookie,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function CookieBanner() {
  const [accepted, setAccepted] = useState(() => localStorage.getItem('cookie-accepted') === 'true');

  if (accepted) return null;

  const accept = () => {
    localStorage.setItem('cookie-accepted', 'true');
    setAccepted(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <Cookie size={18} className="shrink-0 text-neutral-400" />
        <p className="flex-1 text-sm text-neutral-600">
          ვებ-გვერდი იყენებს Cookies-ებს სერვისის გასაუმჯობესებლად.{' '}
          <Link to="/terms" className="text-brand-600 hover:underline">დაწვრილებით</Link>
        </p>
        <button
          onClick={accept}
          className={cn(buttonVariants({ size: 'sm' }), 'shrink-0')}
        >
          მიღება
        </button>
        <button
          onClick={accept}
          className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="დახურვა"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

const features = [
  {
    icon: ClipboardCheck,
    title: 'შემოწმების აქტები',
    description: 'ყველა სახის ტექნიკური შემოწმება ერთ სისტემაში.',
  },
  {
    icon: AlertTriangle,
    title: 'ინციდენტების მართვა',
    description: 'ინციდენტების სწრაფი ფიქსაცია და თვალყურის დევნება.',
  },
  {
    icon: FileText,
    title: 'რეპორტები და ბრიფინგები',
    description: 'PDF გენერაცია და გუნდის ინფორმირება ერთი დაჭერით.',
  },
  {
    icon: Award,
    title: 'სერტიფიკატები',
    description: 'გუნდის კვალიფიკაციებისა და სერტიფიკატების მართვა.',
  },
];

export default memo(function Landing() {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white">
              <ShieldCheck size={18} />
            </div>
            <span className="font-display text-lg font-bold text-neutral-900">Sarke</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              შესვლა
            </Link>
            <Link to="/register" className={cn(buttonVariants({ size: 'sm' }))}>
              დაიწყეთ
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center px-6 py-20 text-center">
        <span className="mb-5 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
          მშენებლობის უსაფრთხოება
        </span>
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl">
          ყველა დოკუმენტი —<br className="hidden sm:block" /> ერთ ადგილას
        </h1>
        <p className="mt-5 max-w-xl text-base text-neutral-500">
          Sarke გაერთიანებს შემოწმების აქტებს, ინციდენტებს, ბრიფინგებს და
          სერტიფიკატებს ერთ სივრცეში — მობილური აპიდანაც და ბრაუზერიდანაც.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className={cn(buttonVariants({ size: 'lg' }))}>
            დაიწყეთ — უფასოდ
          </Link>
          <Link to="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            შესვლა
          </Link>
        </div>

        {/* Features */}
        <div className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-neutral-200 bg-white p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon size={20} />
              </div>
              <p className="font-display text-sm font-semibold text-neutral-900">{title}</p>
              <p className="mt-1 text-sm text-neutral-500">{description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500 text-white">
              <ShieldCheck size={13} />
            </div>
            <span className="font-display font-semibold text-neutral-700">Sarke</span>
          </div>
          <div className="flex gap-4 text-sm text-neutral-500">
            <Link to="/login" className="hover:text-brand-600 hover:underline">შესვლა</Link>
            <Link to="/register" className="hover:text-brand-600 hover:underline">რეგისტრაცია</Link>
          </div>
        </div>
      </footer>

      <CookieBanner />
    </div>
  );
});
