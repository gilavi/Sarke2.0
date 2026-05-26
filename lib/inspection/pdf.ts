/**
 * Schema-driven inspection PDF renderer.
 *
 * `buildInspectionPdf` is synchronous and platform-free: it takes a schema, the
 * inspection data, and a pre-resolved PhotoMap (data: URLs on mobile, https on
 * web) and returns a complete HTML document. This is the single renderer that
 * replaces the ~10 hand-written lib/<type>Pdf.ts builders.
 *
 * Photo resolution lives in lib/inspection/photos.ts; the mobile convenience
 * wrapper that ties them together is lib/inspection/renderMobile.ts.
 */
import { escapeHtml, fmtDate } from './escape';
import { BASE_PDF_CSS } from './pdfStyles';
import { INTERNAL_DOC_BADGE } from './schema';
import { renderSignaturesSection, type SignaturesSectionData } from '../pdf/inspection/renderSignaturesSection';
import type {
  ChecklistSection,
  InfoField,
  InspectionSchema,
  LegendItem,
  MaintRow,
  PdfBlock,
  PhotoMap,
  ResultOption,
  SignatureLine,
} from './schema';

/** Build the full HTML document for an inspection PDF. */
export function buildInspectionPdf<T>(
  schema: InspectionSchema<T>,
  data: { inspection: T; projectName: string; signaturesSession?: SignaturesSectionData | null },
  photos: PhotoMap,
): string {
  const { inspection, projectName, signaturesSession = null } = data;
  const { docId, docDate } = schema.meta(inspection);
  const docTitle = resolveField(schema.docTitle, inspection) ?? '';
  const docSubtitle = resolveField(schema.docSubtitle, inspection);
  const footerLabel = resolveField(schema.pdfFooterLabel, inspection) ?? '';
  const badge = resolveField(schema.internalBadge, inspection) ?? INTERNAL_DOC_BADGE;
  const metaLines = schema.headerMetaLines ? schema.headerMetaLines(inspection) : [];

  const body = schema.blocks
    .map((block) => renderBlock(block, inspection, photos))
    .filter(Boolean)
    .join('\n');

  const signaturesHtml = renderSignaturesSection(signaturesSession);

  const css = `${BASE_PDF_CSS}\n${schema.extraCss ?? ''}`;
  const plainTitle = docTitle.replace(/<br\s*\/?>/gi, ' ');

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(plainTitle)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="page">
    ${renderHeader({ docTitle, docSubtitle, badge, projectName, docId, docDate, metaLines })}
    ${body}
    ${signaturesHtml}
    ${renderFooter(footerLabel, docId, docDate)}
  </div>
</body>
</html>`;
}

// ── Header / footer ────────────────────────────────────────────────────────────

function resolveField<T>(v: string | ((d: T) => string) | undefined, d: T): string | undefined {
  return typeof v === 'function' ? v(d) : v;
}

function renderHeader(args: {
  docTitle: string;
  docSubtitle?: string;
  badge: string;
  projectName: string;
  docId: string;
  docDate: string;
  metaLines: string[];
}): string {
  const { docTitle, docSubtitle, badge, projectName, docId, docDate, metaLines } = args;
  const subtitle = docSubtitle ? `<div class="doc-sub">${escapeHtml(docSubtitle)}</div>` : '';
  const metaPrefix = metaLines.map((l) => `${escapeHtml(l)}<br>`).join('');
  return `
    <div class="header">
      <div class="header-left">
        <div class="logo-box"><span class="logo-text">SR</span></div>
        <div class="project-name">${escapeHtml(projectName)}</div>
      </div>
      <div class="header-center">
        <div class="doc-title">${docTitle}</div>
        ${subtitle}
      </div>
      <div class="header-right">
        <span class="internal-badge">${escapeHtml(badge)}</span>
        <div class="doc-meta">${metaPrefix}${escapeHtml(docDate)}<br>ID: ${escapeHtml(docId)}</div>
      </div>
    </div>
  `;
}

function renderFooter(footerLabel: string, docId: string, docDate: string): string {
  return `
    <div class="footer">
      <span>${escapeHtml(footerLabel)}</span>
      <span>${escapeHtml(docDate)} · ID ${escapeHtml(docId)}</span>
    </div>
  `;
}

// ── Block dispatch ───────────────────────────────────────────────────────────

function renderBlock<T>(block: PdfBlock<T>, d: T, photos: PhotoMap): string {
  switch (block.kind) {
    case 'machineSpecs':
      return renderMachineSpecs(block.title, block.specs(d));
    case 'infoFields':
      return renderInfoFields(block.title, block.fields(d));
    case 'checklist':
      return renderChecklist(block, block.sections(d), photos);
    case 'maintenance':
      return renderMaintenance(block, block.rows(d));
    case 'verdict':
      return renderVerdict(block, d, photos);
    case 'signatures':
      return renderSignatures(block.title, block.lines(d));
    case 'custom':
      return block.render(d, photos);
    default: {
      // Exhaustiveness guard — adding a block kind without a renderer is a compile error.
      const _never: never = block;
      return _never;
    }
  }
}

// ── Block renderers ──────────────────────────────────────────────────────────

function sectionTitle(title: string): string {
  return `<div class="section-title">${escapeHtml(title)}</div>`;
}

function renderMachineSpecs(title: string, specs: InfoField[]): string {
  const head = specs.map((s) => `<th>${escapeHtml(s.label)}</th>`).join('');
  const body = specs.map((s) => `<td>${escapeHtml(s.value) || '—'}</td>`).join('');
  return `
    ${sectionTitle(title)}
    <table class="specs-table">
      <thead><tr>${head}</tr></thead>
      <tbody><tr>${body}</tr></tbody>
    </table>
  `;
}

function infoCell(f: InfoField): string {
  // A field with no label and no value is a layout spacer → empty cell.
  if (!f.label && !f.value) return '';
  return `<span class="lbl">${escapeHtml(f.label)}</span><span class="val">${escapeHtml(f.value) || '—'}</span>`;
}

function renderInfoFields(title: string, fields: InfoField[]): string {
  let rows = '';
  let i = 0;
  while (i < fields.length) {
    const a = fields[i];
    if (a.full) {
      rows += `<tr><td colspan="2">${infoCell(a)}</td></tr>`;
      i += 1;
      continue;
    }
    const b = i + 1 < fields.length && !fields[i + 1].full ? fields[i + 1] : null;
    rows += `<tr><td>${infoCell(a)}</td><td>${b ? infoCell(b) : ''}</td></tr>`;
    i += b ? 2 : 1;
  }
  return `
    ${sectionTitle(title)}
    <table class="info-table">${rows}</table>
  `;
}

const TONE_TO_CK: Record<string, string> = {
  good: 'ck-good',
  warn: 'ck-def',
  bad: 'ck-bad',
  neutral: '',
};

const TONE_TO_DOT: Record<string, string> = {
  good: 'dot-good',
  warn: 'dot-def',
  bad: 'dot-bad',
};

function renderLegend(legend: LegendItem[]): string {
  const items = legend
    .map(
      (l) =>
        `<span class="legend-item"><span class="dot ${TONE_TO_DOT[l.tone] ?? ''}"></span>${escapeHtml(l.text)}</span>`,
    )
    .join('');
  return `<div class="legend">${items}</div>`;
}

function renderItemPhotos(paths: string[] | undefined, photos: PhotoMap): string {
  if (!paths || paths.length === 0) return '';
  const imgs = paths
    .map((p) => {
      const url = photos[p];
      return url ? `<span class="item-photo"><img src="${escapeHtml(url)}" alt="ფოტო" /></span>` : '';
    })
    .join('');
  return imgs ? `<div style="margin-top:4px;">${imgs}</div>` : '';
}

function renderChecklist<T>(
  block: Extract<PdfBlock<T>, { kind: 'checklist' }>,
  sections: ChecklistSection[],
  photos: PhotoMap,
): string {
  const opts = block.resultOptions;
  const colCount = 2 + opts.length;
  const itemHeader = 'შემოწმების პუნქტი';

  const headCols =
    block.layout === 'checks'
      ? opts.map((o) => `<th class="col-check">${escapeHtml(o.short ?? o.label)}</th>`).join('')
      : '<th class="col-result">შედეგი</th>';

  let rows = '';
  for (const sec of sections) {
    if (sec.title) {
      rows += `<tr class="cl-sec-row"><td colspan="${block.layout === 'checks' ? colCount : 3}">${escapeHtml(sec.title)}</td></tr>`;
    }
    for (const item of sec.items) {
      const comment = item.comment ? `<div class="item-comment">${escapeHtml(item.comment)}</div>` : '';
      const description = item.description
        ? `<div style="color:var(--inkSoft);font-size:10px;margin-top:2px;">${escapeHtml(item.description)}</div>`
        : '';
      const photoHtml = renderItemPhotos(item.photoPaths, photos);
      const itemCell = `
        <td>
          <strong>${escapeHtml(item.label)}</strong>
          ${description}${comment}${photoHtml}
        </td>`;

      if (block.layout === 'checks') {
        const resultCells = opts
          .map((o) => {
            if (item.result !== o.value || !o.mark) return '<td class="col-check"></td>';
            const ck = TONE_TO_CK[o.tone ?? 'neutral'] ?? '';
            return `<td class="col-check"><span class="${ck}">${o.mark}</span></td>`;
          })
          .join('');
        rows += `<tr><td class="col-num">${escapeHtml(String(item.id))}</td>${itemCell}${resultCells}</tr>`;
      } else {
        rows += `<tr><td class="col-num">${escapeHtml(String(item.id))}</td>${itemCell}<td class="col-result">${resultPill(opts, item.result)}</td></tr>`;
      }
    }
  }

  return `
    ${sectionTitle(block.title)}
    ${block.legend ? renderLegend(block.legend) : ''}
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>${escapeHtml(itemHeader)}</th>
          ${headCols}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function resultPill(opts: ResultOption[], result: string | null): string {
  const o = opts.find((x) => x.value === result);
  if (!o) return '<span class="pill pill-null">—</span>';
  const tone = o.tone ?? 'neutral';
  const cls = tone === 'good' ? 'pill-good' : tone === 'warn' ? 'pill-def' : tone === 'bad' ? 'pill-bad' : 'pill-null';
  return `<span class="pill ${cls}">${o.mark ? `${o.mark} ` : ''}${escapeHtml(o.label)}</span>`;
}

function renderMaintenance<T>(
  block: Extract<PdfBlock<T>, { kind: 'maintenance' }>,
  rows: MaintRow[],
): string {
  const body = rows
    .map((r) => {
      const yes = r.answer === 'yes' ? '<span class="ck-good">✓</span>' : '';
      const no = r.answer === 'no' ? '<span class="ck-bad">✗</span>' : '';
      return `
      <tr>
        <td class="col-num">${escapeHtml(String(r.id))}</td>
        <td>${escapeHtml(r.label)}</td>
        <td class="col-maint-check">${yes}</td>
        <td class="col-maint-check">${no}</td>
        <td class="col-maint-date">${r.date ? escapeHtml(fmtDate(r.date)) : ''}</td>
      </tr>`;
    })
    .join('');
  return `
    ${sectionTitle(block.title)}
    <table class="maint-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>${escapeHtml('შემოწმების პუნქტი')}</th>
          <th class="col-maint-check">${escapeHtml(block.yesLabel)}</th>
          <th class="col-maint-check">${escapeHtml(block.noLabel)}</th>
          <th class="col-maint-date">${escapeHtml(block.dateLabel)}</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderVerdict<T>(
  block: Extract<PdfBlock<T>, { kind: 'verdict' }>,
  d: T,
  photos: PhotoMap,
): string {
  const selected = block.selected(d);
  const options = block.options
    .map(
      (o) => `
      <div class="verdict-option ${o.value === selected ? 'selected' : ''}">
        <div class="verdict-box ${o.value === selected ? 'checked' : ''}"></div>
        <span class="verdict-label">${escapeHtml(o.label)}</span>
      </div>`,
    )
    .join('');

  const notesText = block.notes ? block.notes(d) : null;
  const notesHtml = notesText
    ? `<div class="notes-label" style="margin-top:14px;">${escapeHtml(block.notesLabel ?? 'შენიშვნები / ხარვეზები')}</div>
       <div class="notes-block">${escapeHtml(notesText)}</div>`
    : '';

  const summaryPaths = block.summaryPhotos ? block.summaryPhotos(d) : [];
  const summaryImgs = summaryPaths
    .map((p) => (photos[p] ? `<img src="${escapeHtml(photos[p])}" alt="ფოტო" />` : ''))
    .join('');
  const summaryHtml = summaryImgs
    ? `<div class="notes-label" style="margin-top:14px;">${escapeHtml('ფოტოები')}</div>
       <div class="summary-photos">${summaryImgs}</div>`
    : '';

  return `
    ${sectionTitle(block.title)}
    <div class="verdict-block">${options}</div>
    ${notesHtml}
    ${summaryHtml}
  `;
}

function renderSignatures(title: string, lines: SignatureLine[]): string {
  const cells = lines
    .map((l) => {
      const img = l.pngDataUrl
        ? `<img class="sig-img" src="${escapeHtml(l.pngDataUrl)}" alt="ხელმოწერა" />`
        : '<div style="height:48px;border-bottom:1px dashed var(--hairline);"></div>';
      return `
      <div class="sig-cell">
        ${l.role ? `<div class="sig-lbl">${escapeHtml(l.role)}</div>` : ''}
        ${l.name ? `<div class="sig-name">${escapeHtml(l.name)}</div>` : ''}
        ${l.position ? `<div class="sig-role">${escapeHtml(l.position)}</div>` : ''}
        ${img}
        ${l.date ? `<div class="sig-date">${escapeHtml(l.date)}</div>` : ''}
      </div>`;
    })
    .join('');
  return `
    ${sectionTitle(title)}
    <div class="sig-block">${cells}</div>
  `;
}
