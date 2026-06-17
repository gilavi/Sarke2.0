/**
 * SuccessModal - completion confirmation shown on top of the destination screen
 * after an inspection wizard closes. Reusable for any inspection flow.
 *
 * Desktop: small centered modal (max-width 400px).
 * Mobile:  bottom sheet that slides up.
 *
 * Styling follows the app design system: brand-colored primary Button,
 * neutral text tokens, and md radius - no bespoke colors.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SuccessModalData {
  totalCount: number;
  safeCount: number;
  problemCount: number;
  inspectionName: string;
  projectName: string;
  itemLabel: string;
}

export interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGeneratePDF: () => void;
  data: SuccessModalData;
}

export default function SuccessModal({ isOpen, onClose, onGeneratePDF, data }: SuccessModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal / bottom sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full rounded-t-2xl bg-white dark:bg-neutral-900 sm:w-[400px] sm:max-w-[400px] sm:rounded-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: icon + title + subtitle */}
            <div className="flex flex-col items-center px-6 pt-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
                <Check size={28} strokeWidth={3} className="text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="text-[18px] font-semibold text-neutral-900 dark:text-neutral-100">
                შემოწმება დასრულდა
              </h2>
              <p className="mt-1 text-[13px] text-neutral-400 dark:text-neutral-500">
                {data.inspectionName} · {data.projectName}
              </p>
            </div>

            <div className="mt-5 border-t border-neutral-200 dark:border-neutral-700" />

            {/* Stat block */}
            <div className="px-6 py-5 text-center leading-relaxed">
              <span className="text-[32px] font-bold text-neutral-900 dark:text-neutral-100">{data.totalCount}</span>
              <span className="ml-1.5 text-[16px] text-neutral-500 dark:text-neutral-400">
                {data.itemLabel} შემოწმდა -
              </span>
              <span className="ml-1.5 text-[16px] font-medium text-brand-600 dark:text-brand-400">
                {data.safeCount} კარგია,
              </span>
              <span className="ml-1.5 text-[16px] font-medium text-red-600 dark:text-red-400">
                {data.problemCount} პრობლემა
              </span>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-700" />

            {/* Buttons */}
            <div className="flex gap-2 px-6 py-6">
              <div className="flex-1">
                <Button variant="outline" fullWidth onClick={onGeneratePDF}>
                  PDF გენერირება
                </Button>
              </div>
              <div className="flex-1">
                <Button variant="default" fullWidth onClick={onClose}>
                  დახურვა
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
