import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white">
            <ShieldCheck size={22} />
          </div>
          <span className="font-display text-2xl font-bold text-neutral-900">Sarke</span>
        </div>
        {children}
      </div>
    </div>
  );
}
