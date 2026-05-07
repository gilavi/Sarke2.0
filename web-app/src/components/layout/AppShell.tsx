import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Focus main content on route change for keyboard/screen-reader users
  useEffect(() => {
    setSidebarOpen(false);
    const main = document.getElementById('main-content');
    if (main) main.focus();
  }, [location.pathname]);

  return (
    <div className="flex h-full min-h-screen bg-neutral-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
            aria-label="მენიუს გახსნა"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
              <ShieldCheck size={15} />
            </div>
            <span className="font-display text-base font-bold text-neutral-900">Sarke</span>
          </div>
        </header>

        {/* Skip-to-content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
        >
          კონტენტზე გადასვლა
        </a>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
