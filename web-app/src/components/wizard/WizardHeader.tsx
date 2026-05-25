import { motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Shared wizard header — full viewport width, 80px tall (matches the footer).
 * Left: 3-line context stack (project · inspection · step). Right: big close
 * button. A full-width progress bar is pinned to the bottom edge.
 */
export function WizardHeader({
  projectName,
  inspectionName,
  stepName,
  showProgress,
  progressPercent,
  onClose,
  closeDisabled,
}: {
  projectName?: string;
  inspectionName: string;
  stepName?: string;
  showProgress: boolean;
  progressPercent: number;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  return (
    <div
      className="relative shrink-0 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/80"
      style={{ height: 80 }}
    >
      <div className="flex h-full items-center justify-between px-8">
        <div className="flex min-w-0 flex-col justify-center">
          {projectName && (
            <span className="truncate text-[11px] font-medium leading-tight text-neutral-400 dark:text-neutral-500">
              {projectName}
            </span>
          )}
          <span className="truncate text-[17px] font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
            {inspectionName}
          </span>
          {stepName && (
            <span className="truncate text-[13px] leading-tight text-neutral-500 dark:text-neutral-400">
              {stepName}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="დახურვა"
          className="ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 active:scale-95 dark:hover:bg-neutral-800"
        >
          <X size={26} />
        </button>
      </div>
      {showProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden bg-neutral-100 dark:bg-neutral-800">
          <motion.div
            className="h-full bg-brand-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </div>
      )}
    </div>
  );
}
