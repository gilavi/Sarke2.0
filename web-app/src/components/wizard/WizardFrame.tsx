import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WizardHeader } from './WizardHeader';
import { WizardFooter } from './WizardFooter';
import { WizardContent } from './WizardContent';

/**
 * Flow-agnostic full-screen wizard shell - the harness flow's chrome extracted
 * for reuse by every document-building flow. Renders a portal overlay with:
 * backdrop + animated panel + WizardHeader + optional sidebar slot + scrollable
 * WizardContent (with a left/right step-slide) + fixed WizardFooter.
 *
 * The caller owns the step state (see useWizardFlow) and renders the current
 * step's body as `children`; pass `stepKey`/`direction` so the slide animates.
 * Anything that must survive the frame closing (e.g. a success modal) is
 * rendered by the caller as a sibling, not here.
 */
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, damping: 28, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 32 };

export interface WizardFrameProps {
  open: boolean;
  onClose: () => void;
  /* Header */
  projectName?: string;
  inspectionName: string;
  stepName?: string;
  showProgress: boolean;
  progressPercent: number;
  closeDisabled?: boolean;
  /* Layout */
  sidebar?: ReactNode;
  /* Step slide */
  stepKey: string | number;
  direction: number;
  children: ReactNode;
  /* Footer */
  onBack: () => void;
  onNext: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel: string;
  nextTooltip?: string;
  hideNextArrow?: boolean;
  submitting?: boolean;
}

export function WizardFrame({
  open,
  onClose,
  projectName,
  inspectionName,
  stepName,
  showProgress,
  progressPercent,
  closeDisabled,
  sidebar,
  stepKey,
  direction,
  children,
  onBack,
  onNext,
  backDisabled,
  nextDisabled,
  nextLabel,
  nextTooltip,
  hideNextArrow,
  submitting,
}: WizardFrameProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <AnimatePresence>
        <motion.div
          key="backdrop"
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        />
        <motion.div
          key="panel"
          className="absolute inset-0 flex flex-col bg-white dark:bg-neutral-900"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <WizardHeader
            projectName={projectName}
            inspectionName={inspectionName}
            stepName={stepName}
            showProgress={showProgress}
            progressPercent={progressPercent}
            onClose={onClose}
            closeDisabled={closeDisabled}
          />

          <div className="flex min-h-0 flex-1">
            {sidebar}
            <WizardContent>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={stepKey}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={springTransition}
                  className="space-y-6"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </WizardContent>
          </div>

          <WizardFooter
            onBack={onBack}
            onNext={onNext}
            backDisabled={backDisabled}
            nextDisabled={nextDisabled}
            nextLabel={nextLabel}
            nextTooltip={nextTooltip}
            hideNextArrow={hideNextArrow}
            submitting={submitting}
          />
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}
