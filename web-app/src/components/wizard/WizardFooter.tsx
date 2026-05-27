import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

/**
 * Shared wizard footer — fixed, full viewport width, edge-to-edge top border.
 * Exactly two controls: a text-only back link and a green primary button.
 * The primary button never changes style when disabled — only its opacity.
 */
export function WizardFooter({
  onBack,
  onNext,
  backDisabled,
  nextDisabled,
  nextLabel,
  nextTooltip,
  hideNextArrow,
  submitting,
}: {
  onBack: () => void;
  onNext: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel: string;
  nextTooltip?: string;
  hideNextArrow?: boolean;
  submitting?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100vw',
        height: 80,
        paddingLeft: 32,
        paddingRight: 32,
        zIndex: 50,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        disabled={backDisabled}
        className="flex items-center gap-2 text-base font-medium text-neutral-500 transition-colors hover:text-neutral-700 disabled:opacity-30 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft size={18} />
        უკან
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        title={nextDisabled ? nextTooltip : undefined}
        className="flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-brand-500 px-7 text-base font-semibold text-white transition-all hover:bg-brand-600 active:scale-95"
        style={{ height: 48, opacity: nextDisabled ? 0.4 : 1, cursor: nextDisabled ? 'not-allowed' : 'pointer' }}
      >
        {submitting && <Loader2 size={17} className="animate-spin" />}
        {nextLabel}
        {!hideNextArrow && !submitting && <ArrowRight size={17} />}
      </button>
    </div>
  );
}
