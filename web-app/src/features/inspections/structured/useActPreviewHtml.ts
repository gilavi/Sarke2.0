/**
 * Live document-preview HTML for the split-view creation flow (SplitWizard's
 * right pane).
 *
 * Once the draft row exists, the preview IS the real document: the same
 * `buildInspectionPdf` HTML the print route renders. Every per-answer save
 * fires the descriptor's update mutation, which invalidates the detail key and
 * refetches the row — the new `item` reference recomputes the memo, so the
 * preview tracks each interaction live. Photos are passed as an empty PhotoMap:
 * the engine renders nothing for unresolved paths (no signed-URL fetches while
 * editing), so nothing appears broken.
 *
 * Before a row exists (the act picker / the legacy `/new` spec step) it falls
 * back to a blank act sheet showing the current template/project selection.
 */
import { useMemo } from 'react';
import { buildInspectionPdf } from '@/lib/inspection/pdf';
import { getInspectionSchema } from '@/lib/inspection/registry';
import { escapeHtml } from '@/lib/inspection/escape';

export interface BlankActPreviewArgs {
  templateName?: string | null;
  projectName?: string | null;
  inspectorName?: string | null;
}

const PLACEHOLDER = '<span class="ph">— აირჩიეთ</span>';

/**
 * Blank act-sheet skeleton for the preview pane while nothing (or only the
 * template/project) has been chosen. Self-contained HTML document — rendered
 * inside the sandboxed DocPreviewFrame iframe.
 */
export function buildBlankActPreviewHtml(args: BlankActPreviewArgs = {}): string {
  const val = (v?: string | null) => (v ? escapeHtml(v) : PLACEHOLDER);
  const date = new Date().toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' });
  const dottedRows = Array.from({ length: 6 }, () => '<div class="dotted-row"></div>').join('\n      ');
  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>შემოწმების აქტი</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, 'Noto Sans Georgian', sans-serif; background: #fff; color: #111827; }
    .page { padding: 40px 36px; }
    .doc-title { text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 0.3px; }
    .doc-rule { border-bottom: 2px solid #111827; margin: 14px 0 22px; }
    .meta { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    .meta td { border: 0.5px solid #d1d5db; padding: 8px 10px; font-size: 12px; }
    .meta .lbl { width: 130px; background: #f3f4f6; font-weight: 600; color: #4b5563; }
    .ph { color: #9ca3af; font-style: italic; }
    .dotted-row { border-bottom: 1px dotted #d1d5db; height: 26px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="doc-title">შემოწმების აქტი</div>
    <div class="doc-rule"></div>
    <table class="meta">
      <tr><td class="lbl">შაბლონი</td><td>${val(args.templateName)}</td></tr>
      <tr><td class="lbl">ობიექტი</td><td>${val(args.projectName)}</td></tr>
      <tr><td class="lbl">შემმოწმებელი</td><td>${val(args.inspectorName)}</td></tr>
      <tr><td class="lbl">თარიღი</td><td>${escapeHtml(date)}</td></tr>
    </table>
    ${dottedRows}
  </div>
</body>
</html>`;
}

/**
 * Memoized preview HTML: the real engine document when a schema + persisted
 * draft row exist, otherwise the blank act sheet. A mid-fill draft that trips a
 * schema selector falls back to the blank sheet instead of crashing the wizard.
 */
export function useActPreviewHtml<T>(args: {
  category: string;
  item: T | null;
  projectName: string;
  templateName?: string | null;
  inspectorName?: string | null;
}): string {
  const { category, item, projectName, templateName, inspectorName } = args;
  return useMemo(() => {
    const schema = getInspectionSchema(category);
    if (schema && item) {
      try {
        return buildInspectionPdf(schema, { inspection: item, projectName, signaturesSession: null }, {});
      } catch {
        // Draft data can be partial in ways a schema selector doesn't expect —
        // degrade to the skeleton rather than break the flow.
      }
    }
    return buildBlankActPreviewHtml({
      templateName: templateName ?? null,
      projectName: projectName || null,
      inspectorName: inspectorName ?? null,
    });
  }, [category, item, projectName, templateName, inspectorName]);
}
