/**
 * InspectionSuccessCard — reusable completion screen for any inspection or report flow.
 *
 * Renders:
 *  - Completion header (date + inspector)
 *  - Summary block (safety verdict, badge pills, conclusion excerpt)
 *  - Two action cards: PDF (with document thumbnail + preview iframe) and Project
 *
 * Used in: HarnessInspectionModal, InspectionWizard
 * Easy to drop into future flows: pass the right `printRoute` and optional props.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/app/routes';

export interface InspectionSuccessBadge {
  label: string;
  variant: 'ok' | 'bad' | 'neutral';
}

export interface InspectionSuccessCardProps {
  inspection: {
    id: string;
    is_safe_for_use: boolean | null;
    conclusion_text: string | null;
    inspector_name: string | null;
    completed_at: string | null;
  };
  /** Hash-routed print URL, e.g. '#/inspections/ID/print' or '#/bobcat/ID/print' */
  printRoute: string;
  projectName?: string;
  projectId?: string;
  /** Pills shown in the summary row — pass harness ok/bad counts, checklist totals, etc. */
  summaryBadges?: InspectionSuccessBadge[];
  onClose: () => void;
}

const BADGE_CLASSES: Record<InspectionSuccessBadge['variant'], string> = {
  ok:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  bad:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
};

export default function InspectionSuccessCard({
  inspection,
  printRoute,
  projectName,
  projectId,
  summaryBadges = [],
  onClose,
}: InspectionSuccessCardProps) {
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(true);

  /* ── Derived display values ── */
  const dateStr = inspection.completed_at
    ? new Date(inspection.completed_at).toLocaleDateString('ka-GE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const hasSummaryBlock =
    inspection.is_safe_for_use !== null ||
    summaryBadges.length > 0 ||
    !!inspection.conclusion_text;

  const conclusionExcerpt = inspection.conclusion_text
    ? inspection.conclusion_text.length > 110
      ? inspection.conclusion_text.slice(0, 107) + '…'
      : inspection.conclusion_text
    : null;

  const projectInitials = projectName
    ? projectName
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0] ?? '')
        .join('')
        .toUpperCase()
    : '?';

  /* ── Handlers ── */
  function handleGoToProject() {
    onClose();
    if (projectId) navigate(routes.projects.detail(projectId));
  }

  // In HashRouter the iframe src is relative: '#/route?preview=1' resolves
  // to the same SPA at /Sarke2.0/app/ with the new hash, exactly as
  // BobcatInspectionDetail does for its PDF preview pane.
  const iframeSrc = `${printRoute}?preview=1`;

  /* ── Render ── */
  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">

      {/* ── Completion header ── */}
      <div className="flex flex-col items-center gap-3 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
        <div>
          <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            შემოწმება დასრულდა
          </p>
          {(dateStr || inspection.inspector_name) && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {[dateStr, inspection.inspector_name].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* ── Summary block ── */}
      {hasSummaryBlock && (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex flex-wrap items-center gap-2">
            {/* Safety verdict chip */}
            {inspection.is_safe_for_use !== null && (
              <span
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  inspection.is_safe_for_use
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
                ].join(' ')}
              >
                {inspection.is_safe_for_use ? '✓ უსაფრთხოა' : '✗ არ არის უსაფრთხო'}
              </span>
            )}
            {/* Custom summary badges */}
            {summaryBadges.map((b, i) => (
              <span
                key={i}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE_CLASSES[b.variant]}`}
              >
                {b.label}
              </span>
            ))}
          </div>
          {/* Conclusion text excerpt */}
          {conclusionExcerpt && (
            <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              "{conclusionExcerpt}"
            </p>
          )}
        </div>
      )}

      {/* ── Action cards ── */}
      <div className="grid grid-cols-2 gap-3">

        {/* PDF card */}
        <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          {/* Document thumbnail */}
          <div className="mx-auto mb-4 w-20 overflow-hidden rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-600 dark:bg-neutral-800">
            {/* Title bar */}
            <div className="mb-2 space-y-1">
              <div className="h-1.5 w-12 rounded-full bg-neutral-400 dark:bg-neutral-500" />
              <div className="h-1 w-7 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            </div>
            {/* Text line stubs */}
            <div className="mb-2 space-y-[3px]">
              <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-px w-4/5 bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-px w-3/4 bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700" />
            </div>
            {/* Mini table */}
            <div className="mb-2 overflow-hidden rounded border border-neutral-200 dark:border-neutral-700">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={[
                    'flex items-center gap-1 px-1 py-[2px]',
                    i < 3 ? 'border-b border-neutral-100 dark:border-neutral-700' : '',
                  ].join(' ')}
                >
                  <div className="h-1 w-3 shrink-0 rounded-sm bg-neutral-300 dark:bg-neutral-600" />
                  <div className="h-[3px] flex-1 rounded-sm bg-neutral-100 dark:bg-neutral-700" />
                </div>
              ))}
            </div>
            {/* Signature line */}
            <div className="border-t border-neutral-200 pt-1 dark:border-neutral-700">
              <div className="h-px w-10 bg-neutral-300 dark:bg-neutral-600" />
            </div>
          </div>

          {/* PDF card label */}
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            PDF
          </p>

          {/* PDF card buttons */}
          <div className="mt-auto flex gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className={[
                'flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                showPreview
                  ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-600 dark:text-neutral-300',
              ].join(' ')}
            >
              {showPreview ? 'დახურვა ▴' : 'გადახედვა ▾'}
            </button>
            <button
              type="button"
              onClick={() => window.open(printRoute, '_blank')}
              className="flex items-center gap-1 rounded-xl border border-brand-400 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600 transition-all hover:bg-brand-100 dark:border-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
              title="PDF შექმნა"
            >
              <ExternalLink size={11} />
              PDF შექმნა
            </button>
          </div>
        </div>

        {/* Project card */}
        <button
          type="button"
          onClick={handleGoToProject}
          className="flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-4 text-center transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:border-brand-600 dark:hover:bg-brand-950/20"
        >
          {/* Project initials circle */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-200 bg-brand-50 text-lg font-bold text-brand-600 dark:border-neutral-700 dark:bg-brand-950/20 dark:text-brand-400">
            {projectInitials}
          </div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            პროექტი
          </p>
          <p className="mb-3 line-clamp-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {projectName ?? 'პროექტში დაბრუნება'}
          </p>
          <span className="mt-auto rounded-xl border border-brand-300 px-4 py-1.5 text-xs font-semibold text-brand-600 dark:border-brand-600 dark:text-brand-400">
            გახსნა →
          </span>
        </button>
      </div>

      {/* ── Expandable PDF preview iframe ── */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 540 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                PDF გადახედვა
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.open(printRoute, '_blank')}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30"
                >
                  <ExternalLink size={11} />
                  PDF შექმნა
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700"
                  aria-label="გადახედვის დახურვა"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <iframe
              src={iframeSrc}
              title="PDF გადახედვა"
              className="h-[496px] w-full border-0 bg-white"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Close link ── */}
      <div className="text-center">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-neutral-400 underline-offset-2 transition-colors hover:text-neutral-600 hover:underline dark:hover:text-neutral-300"
        >
          დახურვა
        </button>
      </div>
    </div>
  );
}
