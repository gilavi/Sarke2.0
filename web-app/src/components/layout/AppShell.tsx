import { useEffect, useState, memo, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Menu, Settings } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { HubbleLogo } from '@/components/HubbleLogo';
import SettingsModal from '@/components/SettingsModal';

export const AppShell = memo(function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);
  const location = useLocation();
  const isSafety = location.pathname === '/safety';

  // On route change: close the mobile drawer, reset scroll, and focus main
  // content for keyboard/screen-reader users.
  useEffect(() => {
    setSidebarOpen(false);
    const main = document.getElementById('main-content');
    if (main) {
      main.scrollTop = 0;
      main.focus();
    }
  }, [location.pathname]);

  return (
    <div className="flex h-full min-h-screen bg-[var(--bg-body)]">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={handleCloseSidebar}
          aria-hidden="true"
        />
      )}

      <Sidebar open={sidebarOpen} onClose={handleCloseSidebar} />

      {/* Content sits flush on the canvas; the sidebar's right divider is the
          only separation between nav and content. Cards inside stay --bg-card. */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
              aria-label="მენიუს გახსნა"
            >
              <Menu size={20} />
            </button>
            <Link to="/home" className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
                <HubbleLogo className="h-[15px] w-[15px] text-brand-500" />
              </div>
              <span className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">Hubble</span>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label="პარამეტრები"
          >
            <Settings size={18} />
          </button>
        </header>

        {/* Skip-to-content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          კონტენტზე გადასვლა
        </a>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-transparent outline-none">
          {/* Page transitions live in router.tsx's ProtectedShellLayout — a second
              AnimatePresence here caused a double enter animation, so the shell
              renders a plain, calm content column. */}
          <div
            className={
              isSafety
                ? 'h-full w-full'
                : 'mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8 dark:text-neutral-100'
            }
          >
            {children}
          </div>
        </main>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
});
