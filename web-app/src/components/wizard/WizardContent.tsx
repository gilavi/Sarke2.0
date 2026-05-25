import type { ReactNode } from 'react';

/**
 * Shared scrollable content area for every wizard step.
 * Single source of truth for the content max-width and padding so every
 * screen aligns identically. paddingBottom clears the fixed 64px footer.
 */
export function WizardContent({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-white dark:bg-neutral-900">
      <div
        className="mx-auto w-full max-w-[760px]"
        style={{ paddingTop: 32, paddingLeft: 48, paddingRight: 48, paddingBottom: 96 }}
      >
        {children}
      </div>
    </div>
  );
}
