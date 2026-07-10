import type { ReactNode } from 'react';
import { HubbleLogo } from '@/components/HubbleLogo';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-body)] px-4 py-12 [&_input]:!bg-white [&_input]:!text-neutral-900 [&_input]:!border-neutral-300 [&_input::placeholder]:!text-neutral-400 [&_label]:!text-neutral-700">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1A1A]">
            <HubbleLogo className="h-[22px] w-[22px] text-brand-500" />
          </div>
          <span className="font-display text-2xl font-bold text-neutral-900">Hubble</span>
        </div>
        {children}
      </div>
    </div>
  );
}
