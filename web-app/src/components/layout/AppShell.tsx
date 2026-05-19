import { useEffect, useState, memo, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, ShieldCheck, Settings } from 'lucide-react';
import { Sidebar } from './Sidebar';
import SettingsModal from '@/components/SettingsModal';

export const AppShell = memo(function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);
  const location = useLocation();

  // Focus main content on route change for keyboard/screen-reader users
  useEffect(() => {
    setSidebarOpen(false);
    const main = document.getElementById('main-content');
    if (main) main.focus();
  }, [location.pathname]);

  return (
    <div className="flex h-full min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Ambient mesh background — desktop only */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-500/5 blur-3xl animate-mesh-1" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-brand-400/5 blur-3xl animate-mesh-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-300/3 blur-3xl animate-mesh-3" />
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={handleCloseSidebar}
          aria-hidden="true"
        />
      )}

      <Sidebar open={sidebarOpen} onClose={handleCloseSidebar} />

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
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm dark:shadow-[0_0_12px_rgba(71,175,135,0.3)]">
                <ShieldCheck size={15} />
              </div>
              <span className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">Sarke</span>
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
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
        >
          კონტენტზე გადასვლა
        </a>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-neutral-50 outline-none dark:bg-neutral-950">
          <AnimatePresence mode="wait">
            {location.pathname === '/safety' ? (
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full"
              >
                {children}
              </motion.div>
            ) : (
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-12 lg:px-24 sm:py-8 dark:text-neutral-100"
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
});
