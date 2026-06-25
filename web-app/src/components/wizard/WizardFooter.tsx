import { ArrowLeft } from 'lucide-react'; // bare DOM back link (mobile uses a bare Pressable too)
import { ArrowRight } from 'lucide-react-native'; // passed to the shared Button
import { Button } from '@root/components/primitives';

/**
 * Shared wizard footer - fixed, full viewport width, edge-to-edge top border.
 * Mirrors the mobile WizardNav: a bare text-only back link + the shared primary
 * Button (same component the Expo app renders). The primary button dims when
 * disabled/submitting.
 */
export function WizardFooter({
  onBack,
  onNext,
  backDisabled,
  nextDisabled,
  nextLabel,
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

      <Button
        title={nextLabel}
        rightIcon={hideNextArrow || submitting ? undefined : ArrowRight}
        size="lg"
        onPress={onNext}
        disabled={nextDisabled}
        loading={submitting}
        // The Button primitive's wrapper defaults to alignSelf:'flex-start', which
        // top-pins it inside this items-center footer row and makes it cross the
        // top border line. Center it vertically within the 80px footer band.
        style={{ minWidth: 180, alignSelf: 'center' }}
      />
    </div>
  );
}
