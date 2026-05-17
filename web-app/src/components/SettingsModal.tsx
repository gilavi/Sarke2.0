import { useEffect } from 'react';
import { X, Moon, Sun, Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { isDark, toggleMode } = useTheme();
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  useEffect(() => {
    const saved = localStorage.getItem('sarke-lang');
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  }, [i18n]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('sarke-lang', lang);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900 dark:shadow-black/50"
            role="dialog"
            aria-modal="true"
            aria-label={t('settings.title')}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {t('settings.title')}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 p-4">
              {/* Dark mode */}
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {t('settings.appearance')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => isDark && toggleMode()}
                    className={cn(
                      'group flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                      !isDark
                        ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
                    )}
                  >
                    <Sun size={16} className={cn(!isDark && 'text-brand-600')} />
                    <span className="flex-1 text-left">{t('settings.lightMode')}</span>
                    {!isDark && <Check size={16} className="text-brand-600" />}
                  </button>
                  <button
                    onClick={() => !isDark && toggleMode()}
                    className={cn(
                      'group flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                      isDark
                        ? 'border-white/10 bg-white text-neutral-900 shadow-sm shadow-white/10'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
                    )}
                  >
                    <Moon size={16} className={cn(isDark && 'text-neutral-700')} />
                    <span className="flex-1 text-left">{t('settings.darkMode')}</span>
                    {isDark && <Check size={16} className="text-neutral-700" />}
                  </button>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {t('settings.language')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage('ka')}
                    className={cn(
                      'group flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                      currentLang === 'ka'
                        ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-sm dark:border-white/10 dark:bg-white dark:text-neutral-900 dark:shadow-sm dark:shadow-white/10'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
                    )}
                  >
                    <Globe size={16} className={cn(currentLang === 'ka' ? 'text-brand-600 dark:text-neutral-700' : '')} />
                    <span className="flex-1 text-left">ქართული</span>
                    {currentLang === 'ka' && <Check size={16} className="text-brand-600 dark:text-neutral-700" />}
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={cn(
                      'group flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                      currentLang === 'en'
                        ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-sm dark:border-white/10 dark:bg-white dark:text-neutral-900 dark:shadow-sm dark:shadow-white/10'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
                    )}
                  >
                    <Globe size={16} className={cn(currentLang === 'en' ? 'text-brand-600 dark:text-neutral-700' : '')} />
                    <span className="flex-1 text-left">English</span>
                    {currentLang === 'en' && <Check size={16} className="text-brand-600 dark:text-neutral-700" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                {t('common.close')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
