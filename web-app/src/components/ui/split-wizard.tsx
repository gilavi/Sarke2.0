import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './icon-button';

/**
 * SplitWizard — the full-page creation-flow layout (Stripe invoice-editor
 * pattern): flow/form on the left, a live preview of the document being
 * produced on the right. The right pane hides below `lg` (the flow keeps
 * working without it). One owner for all document flows — inspection acts
 * now, orders/incidents/reports as they get wired.
 *
 * Esc triggers onClose (same guard as the ✕ button) — the host owns the
 * "draft is saved" confirm.
 */
export interface SplitWizardProps {
  title: string;
  /** Step readout under the title, e.g. "ნაბიჯი 2/4". */
  subtitle?: string;
  /** Shows the green "დრაფტი შენახულია" badge in the header. */
  saved?: boolean;
  onClose: () => void;
  /** Left-column footer (back / next buttons). Omit on tap-to-advance steps. */
  footer?: ReactNode;
  /** Right pane content — usually a DocPreviewFrame. */
  preview?: ReactNode;
  previewLabel?: string;
  children: ReactNode;
}

export function SplitWizard({
  title,
  subtitle,
  saved,
  onClose,
  footer,
  preview,
  previewLabel = 'დოკუმენტის გადახედვა',
  children,
}: SplitWizardProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-card)]">
      <header className="flex items-center gap-3 border-b border-[var(--border-default)] px-4 py-2.5">
        <IconButton icon={X} label="დახურვა" variant="outline" size="sm" onClick={onClose} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-[var(--text-primary)]">{title}</div>
          {subtitle ? <div className="text-[11px] text-[var(--text-muted)]">{subtitle}</div> : null}
        </div>
        {saved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <Check size={12} strokeWidth={2.5} /> დრაფტი შენახულია
          </span>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            'flex min-w-0 flex-col',
            preview ? 'w-full lg:w-[46%] lg:min-w-[420px] lg:border-r lg:border-[var(--border-default)]' : 'w-full',
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <div className="mx-auto w-full max-w-xl">{children}</div>
          </div>
          {footer ? (
            <div className="flex items-center gap-2 border-t border-[var(--border-default)] bg-[var(--bg-card)] px-5 py-3 sm:px-8">
              {footer}
            </div>
          ) : null}
        </div>

        {preview ? (
          <div className="hidden min-w-0 flex-1 flex-col items-center gap-2.5 overflow-y-auto bg-[var(--bg-body)] p-7 lg:flex">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {previewLabel}
            </div>
            {preview}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * DocPreviewFrame — renders document HTML (e.g. buildInspectionPdf output)
 * in a sandboxed iframe so the live preview is the SAME markup the final PDF
 * uses. Scripts are blocked (sandbox) — a print() in the source can't fire.
 */
export function DocPreviewFrame({ html, className }: { html: string; className?: string }) {
  return (
    <iframe
      title="document-preview"
      sandbox=""
      srcDoc={html}
      className={cn(
        'w-full max-w-[640px] flex-1 rounded border border-[var(--border-strong,var(--border-default))] bg-white',
        className,
      )}
    />
  );
}
