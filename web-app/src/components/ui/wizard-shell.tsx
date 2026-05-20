import * as React from 'react';
import { Modal } from '@mantine/core';
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
    <Modal
      opened={open}
      onClose={onClose}
      fullScreen
      withCloseButton={false}
      padding={0}
      radius={0}
      styles={{
        content: { display: 'flex', flexDirection: 'column' },
        body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 },
      }}
    >
      {/* Header */}
      <div className="shrink-0 bg-white dark:bg-neutral-900">
        <div className="mx-auto grid max-w-5xl grid-cols-3 items-center px-6 py-4">
          <span className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </span>
          <div className="flex justify-center">
            {steps.length > 1 && <StepBar steps={steps} current={currentStep} />}
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              aria-label="დახურვა"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {children}
        </div>
      </div>

      {/* Footer nav */}
      <div className="shrink-0 border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
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
    </Modal>
  );
}
