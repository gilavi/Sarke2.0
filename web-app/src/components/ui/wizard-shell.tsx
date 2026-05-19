import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { StepBar } from '@/components/ui/step-bar';
import { WizardNav } from '@/components/ui/wizard-nav';

interface WizardShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  steps: string[];
  currentStep: number;
  children: React.ReactNode;
  onPrev: () => void;
  onNext: () => void;
  onFinish?: () => void;
  isSubmitting?: boolean;
  nextDisabled?: boolean;
  finishLabel?: string;
}

export function WizardShell({
  open,
  onClose,
  title,
  steps,
  currentStep,
  children,
  onPrev,
  onNext,
  onFinish,
  isSubmitting,
  nextDisabled,
  finishLabel,
}: WizardShellProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Content
          className="wizard-fullpage fixed inset-0 z-50 bg-white focus:outline-none"
          onInteractOutside={(e) => e.preventDefault()}
          style={{
            height: '100dvh',
            display: 'grid',
            gridTemplateRows: 'auto auto 1fr auto',
          }}
        >
          {/* Header */}
          <div className="border-b border-neutral-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <Dialog.Title className="font-display text-lg font-semibold text-neutral-900">
                {title}
              </Dialog.Title>
              <Dialog.Close
                onClick={onClose}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none"
                aria-label="დახურვა"
              >
                <X size={18} />
              </Dialog.Close>
            </div>
          </div>

          {/* Step bar */}
          {steps.length > 1 && (
            <div className="border-b border-neutral-100 bg-white">
              <div className="mx-auto max-w-5xl px-6 py-3">
                <StepBar steps={steps} current={currentStep} />
              </div>
            </div>
          )}

          {/* Scrollable content */}
          <div className="overflow-y-auto bg-neutral-50">
            <div className="mx-auto max-w-2xl px-6 py-8">
              {children}
            </div>
          </div>

          {/* Footer nav */}
          <div className="border-t border-neutral-200 bg-white">
            <div className="mx-auto max-w-5xl">
              <WizardNav
                current={currentStep}
                total={steps.length}
                onPrev={onPrev}
                onNext={onNext}
                onFinish={onFinish}
                isSubmitting={isSubmitting}
                nextDisabled={nextDisabled}
                finishLabel={finishLabel}
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
