import { useEffect } from 'react';
import { X, Moon, Sun, Globe, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { isDark, toggleMode } = useTheme();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const setLanguage = (lang: string) => {
    localStorage.setItem('sarke-lang', lang);
    window.location.reload();
  };
  const currentLang = localStorage.getItem('sarke-lang') || 'ka';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 400 }}
            className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">პარამეტრები</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              >
                <X size={16} />
              </button>
            </div>

            {/* Appearance */}
            <div className="space-y-3 px-5 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                გარეგნობა
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => isDark && toggleMode()}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                    !isDark
                      ? 'border-brand-200 bg-brand-50 text-brand-700'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
                  )}
                >
                  <Sun size={15} />
                  <span>ნათელი</span>
                  {!isDark && <Check size={14} className="ml-auto text-brand-600" />}
                </button>
                <button
                  onClick={() => !isDark && toggleMode()}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                    isDark
                      ? 'border-brand-200 bg-brand-950/30 text-brand-400'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
                  )}
                >
                  <Moon size={15} />
                  <span>მუქი</span>
                  {isDark && <Check size={14} className="ml-auto text-brand-400" />}
                </button>
              </div>
            </div>

            {/* Language */}
            <div className="space-y-3 border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                ენა
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('ka')}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                    currentLang === 'ka'
                      ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
                  )}
                >
                  <Globe size={15} />
                  <span>ქართული</span>
                  {currentLang === 'ka' && <Check size={14} className="ml-auto text-brand-600 dark:text-brand-400" />}
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                    currentLang === 'en'
                      ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
                  )}
                >
                  <Globe size={15} />
                  <span>English</span>
                  {currentLang === 'en' && <Check size={14} className="ml-auto text-brand-600 dark:text-brand-400" />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
