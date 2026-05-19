import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, FolderOpen, AlertTriangle, Megaphone, ClipboardCheck, Calendar, Settings, Home } from 'lucide-react';
import { ActionIcon } from '@mantine/core';
import { useCommandStore } from '@/store/commandStore';
import { DURATION, EASE } from '@/lib/animations';

const ICONS: Record<string, React.ElementType> = {
  Home, FileText, FolderOpen, AlertTriangle, Megaphone, ClipboardCheck, Calendar, Settings,
};

const STATIC_COMMANDS = [
  { id: 'nav-home', title: 'მთავარი', icon: 'Home', path: '/home' },
  { id: 'nav-projects', title: 'პროექტები', icon: 'FolderOpen', path: '/projects' },
  { id: 'nav-inspections', title: 'შემოწმებები', icon: 'ClipboardCheck', path: '/inspections' },
  { id: 'nav-incidents', title: 'ინციდენტები', icon: 'AlertTriangle', path: '/incidents' },
  { id: 'nav-briefings', title: 'ინსტრუქტაჟები', icon: 'Megaphone', path: '/briefings' },
  { id: 'nav-reports', title: 'რეპორტები', icon: 'FileText', path: '/reports' },
  { id: 'nav-calendar', title: 'კალენდარი', icon: 'Calendar', path: '/calendar' },
  { id: 'nav-settings', title: 'პარამეტრები', icon: 'Settings', path: '/account' },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const { isOpen, close, toggle, query, setQuery } = useCommandStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape' && isOpen) { e.preventDefault(); close(); }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [isOpen, toggle, close]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const run = useCallback((path: string) => {
    close();
    navigate(path);
  }, [close, navigate]);

  const filtered = STATIC_COMMANDS.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast }}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 pt-[20vh] backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: DURATION.normal, ease: EASE.easeOut }}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
              <Search size={18} className="text-neutral-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="მოძებნეთ..."
                className="flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
              />
              <ActionIcon onClick={close} variant="subtle" color="gray" size="sm" aria-label="დახურვა">
                <X size={14} />
              </ActionIcon>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-neutral-500">შედეგები ვერ მოიძებნა</div>
              ) : (
                filtered.map((cmd) => {
                  const Icon = ICONS[cmd.icon] || Search;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => run(cmd.path)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <Icon size={16} className="text-neutral-400" />
                      <span>{cmd.title}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center gap-4 border-t border-neutral-100 px-4 py-2 text-xs text-neutral-400 dark:border-neutral-800">
              <span>↑↓ აირჩიეთ</span>
              <span>Enter გადასვლა</span>
              <span>Esc დახურვა</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
