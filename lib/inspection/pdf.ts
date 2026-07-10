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
import i18n from '../i18n';
import { escapeHtml, fmtDate } from './escape';
import { BASE_PDF_CSS } from './pdfStyles';
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
  const badge = resolveField(schema.internalBadge, inspection) ?? i18n.t('inspections.pdfInternalBadge');
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
        <div class="logo-box"><svg viewBox="0 0 250 250" width="28" height="28" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M247.544 81.6992C246.188 81.6992 245.088 82.7986 245.088 84.155C245.088 92.1243 243.912 99.9743 241.592 107.489C233.871 132.582 214.282 152.172 189.189 159.892L189.187 159.893C181.675 162.213 173.822 163.389 165.845 163.389H43.3007C19.4248 163.389 0 182.818 0 206.699C0 230.581 19.4248 250 43.3007 250C67.1766 250 86.611 230.575 86.611 206.699C86.611 185.526 103.832 168.3 125 168.3C146.168 168.3 163.389 185.526 163.389 206.699C163.389 230.575 182.818 250 206.699 250C230.581 250 250 230.575 250 206.699V84.1551C250 82.7987 248.901 81.6992 247.544 81.6992Z"/><path d="M2.4558 168.3C3.8122 168.3 4.9116 167.201 4.9116 165.844C4.9116 157.872 6.0877 150.022 8.4082 142.509C12.1706 130.258 18.9873 118.955 28.1208 109.821C37.2264 100.715 48.4953 93.9112 60.7167 90.1392C60.756 90.1291 60.7934 90.1186 60.8318 90.1066C68.344 87.787 76.1911 86.6109 84.1551 86.6109H206.699C230.575 86.6109 250 67.1818 250 43.3002C250 19.4186 230.575 0 206.699 0C182.823 0 163.389 19.4243 163.389 43.3002C163.389 64.4738 146.168 81.6993 125 81.6993C103.832 81.6993 86.6108 64.4737 86.6108 43.3002C86.6109 19.4243 67.1823 0 43.3007 0C19.4191 0 0 19.4243 0 43.3002V165.844C0 167.201 1.0994 168.3 2.4558 168.3Z"/></svg></div>
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
      // Exhaustiveness guard - adding a block kind without a renderer is a compile error.
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
  const body = specs.map((s) => `<td>${escapeHtml(s.value) || '-'}</td>`).join('');
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
  return `<span class="lbl">${escapeHtml(f.label)}</span><span class="val">${escapeHtml(f.value) || '-'}</span>`;
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
      return url ? `<span class="item-photo"><img src="${escapeHtml(url)}" alt="${escapeHtml(i18n.t('inspections.pdfPhotoAlt'))}" /></span>` : '';
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
  const itemHeader = i18n.t('inspections.pdfItemHeader');

  const headCols =
    block.layout === 'checks'
      ? opts.map((o) => `<th class="col-check">${escapeHtml(o.short ?? o.label)}</th>`).join('')
      : `<th class="col-result">${escapeHtml(i18n.t('inspections.pdfResultHeader'))}</th>`;

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
  if (!o) return '<span class="pill pill-null">-</span>';
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
          <th>${escapeHtml(i18n.t('inspections.pdfItemHeader'))}</th>
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
    ? `<div class="notes-label" style="margin-top:14px;">${escapeHtml(block.notesLabel ?? i18n.t('inspections.pdfNotesLabel'))}</div>
       <div class="notes-block">${escapeHtml(notesText)}</div>`
    : '';

  const summaryPaths = block.summaryPhotos ? block.summaryPhotos(d) : [];
  const summaryImgs = summaryPaths
    .map((p) => (photos[p] ? `<img src="${escapeHtml(photos[p])}" alt="${escapeHtml(i18n.t('inspections.pdfPhotoAlt'))}" />` : ''))
    .join('');
  const summaryHtml = summaryImgs
    ? `<div class="notes-label" style="margin-top:14px;">${escapeHtml(i18n.t('inspections.pdfPhotosLabel'))}</div>
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
        ? `<img class="sig-img" src="${escapeHtml(l.pngDataUrl)}" alt="${escapeHtml(i18n.t('inspections.pdfSignatureAlt'))}" />`
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
