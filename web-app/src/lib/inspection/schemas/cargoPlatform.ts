/**
 * Cargo receiving platform inspection schema - web mirror of the Expo app's
 * `lib/inspection/schemas/cargoPlatform.ts` (the `@root` import is eslint-banned).
 * Ported faithfully (custom blocks) so the web PDF matches mobile: general info,
 * platform identification, cargo weight table, fix-row checklist, verdict.
 * Types live in the web data module (`@/lib/data/cargoPlatform`), not a separate
 * `lib/types/` file.
 *
 * Regulatory: the persisted "VII - ხელმოწერები" two-signatory grid is NOT
 * rendered here. The captured signature is appended by `buildInspectionPdf` from
 * the in-memory session (never persisted).
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  CP_ITEMS,
  CP_SECTION_LABELS,
  CP_VERDICT_LABEL,
  cpTotalWeight,
  CARGO_PLATFORM_TEMPLATE_ID,
  type CargoPlatformInspection,
  type CPResult,
} from '@/lib/data/cargoPlatform';

const EXTRA_CSS = `
  :root { --amberBdr: #D97706; --na: #E5E7EB; --naText: #6B7280; }

  .param-table { width: 100%; border-collapse: collapse; }
  .param-table td { padding: 5px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: middle; }
  .param-table td:first-child { width: 52%; color: var(--inkSoft); font-weight: 600; }
  .param-table td:last-child { color: var(--ink); }
  .param-table tr:nth-child(even) td { background: var(--catHdr); }

  .cargo-table { width: 100%; border-collapse: collapse; }
  .cargo-table th, .cargo-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .cargo-table thead tr { background: var(--catHdr); }
  .cargo-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .cargo-total td { background: var(--catHdr); font-weight: 700; }
  .col-num-sm { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-weight { width: 88px; text-align: right; }

  .dot-fix  { background: var(--amber); }
  .dot-na   { background: var(--na); border: 1px solid var(--hairline); }

  .cl-cat-row td { background: var(--catHdr); font-weight: 700; font-size: 11px; color: var(--inkSoft); padding: 6px 8px; }
  .col-result { width: 80px; white-space: nowrap; }
  .item-fix { border-left: 3px solid var(--amberBdr) !important; }

  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-good { background: var(--greenSoft); color: #065F46; }
  .pill-fix  { background: var(--amberSoft); color: #92400E; }
  .pill-na   { background: var(--na); color: var(--naText); }
  .pill-null { background: var(--catHdr); color: var(--inkFaint); }

  .comment-block { margin-top: 12px; padding: 10px 12px; border: 0.5px solid var(--hairline); border-radius: 8px; min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5; }
  .comment-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

  .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
  .photo-item img { width: 100%; border-radius: 6px; border: 0.5px solid var(--hairline); display: block; }
  .photo-caption { font-size: 10px; color: var(--inkFaint); margin-top: 3px; text-align: center; }

  .legal-note { margin-top: 16px; font-size: 9px; color: var(--inkFaint); text-align: center; line-height: 1.5; font-style: italic; }
`;

function renderSectionI(insp: CargoPlatformInspection): string {
  return `
    <div class="section-title">I - ზოგადი ინფორმაცია</div>
    <table class="info-table">
      <tr>
        <td><span class="lbl">კომპანიის დასახელება</span><span class="val">${escapeHtml(insp.company) || '-'}</span></td>
        <td><span class="lbl">შემოწმების თარიღი</span><span class="val">${fmtDate(insp.inspectionDate)}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">მდებარეობა / მისამართი</span><span class="val">${escapeHtml(insp.address) || '-'}</span></td>
        <td><span class="lbl">სართული / ზონა</span><span class="val">${escapeHtml(insp.floorZone) || '-'}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">შემოწმების ჩამტარებელი</span><span class="val">${escapeHtml(insp.inspectorName) || '-'}</span></td>
        <td></td>
      </tr>
    </table>
  `;
}

function binaryLabel(val: string | null, noneLabel: string, completeLabel: string): string {
  if (val === 'none') return `☑ ${noneLabel} &nbsp; ☐ ${completeLabel}`;
  if (val === 'complete') return `☐ ${noneLabel} &nbsp; ☑ ${completeLabel}`;
  return '-';
}
function guardrailHeightLabel(val: string | null): string {
  if (val === 'non_standard') return '☑ ვერ აკმაყოფილებს სტანდარტს &nbsp; ☐ სტანდარტს აკმაყოფილებს';
  if (val === 'standard') return '☐ ვერ აკმაყოფილებს სტანდარტს &nbsp; ☑ სტანდარტს აკმაყოფილებს';
  return '-';
}

function renderSectionII(insp: CargoPlatformInspection): string {
  return `
    <div class="section-title">II - პლატფორმის იდენტიფიკაცია</div>
    <table class="param-table">
      <tr><td>პლატფორმის ტიპი / მოდელი</td><td>${escapeHtml(insp.platformTypeModel) || '-'}</td></tr>
      <tr><td>სიგრძე (მ)</td><td>${insp.platformLength != null ? insp.platformLength : '-'}</td></tr>
      <tr><td>სიგანე (მ)</td><td>${insp.platformWidth != null ? insp.platformWidth : '-'}</td></tr>
      <tr><td>ვიზუალური აღწერა / ფერი</td><td>${escapeHtml(insp.platformColorDesc) || '-'}</td></tr>
      <tr><td>გვერდის დამცავი მოაჯირი</td><td>${binaryLabel(insp.sideGuardrail, 'არ გააჩნია', 'მოაჯირი სრულია')}</td></tr>
      <tr><td>წინა დამცავი მოაჯირი</td><td>${binaryLabel(insp.frontGuardrail, 'არ გააჩნია', 'მოაჯირი სრულია')}</td></tr>
      <tr><td>მოაჯირის სიმაღლე (სტანდ. 90–120 სმ)</td><td>${guardrailHeightLabel(insp.guardrailHeight)}</td></tr>
    </table>
  `;
}

function renderSectionIII(insp: CargoPlatformInspection): string {
  const totalKg = cpTotalWeight(insp.cargo);
  const cargoRows = insp.cargo
    .map(
      (r, idx) => `
    <tr>
      <td class="col-num-sm">${idx + 1}</td>
      <td>${escapeHtml(r.name) || '-'}</td>
      <td class="col-weight">${r.unit_weight_kg != null ? r.unit_weight_kg : '-'}</td>
      <td class="col-weight">${r.total_weight_kg != null ? r.total_weight_kg : '-'}</td>
      <td>${escapeHtml(r.note) || ''}</td>
    </tr>
  `,
    )
    .join('');

  return `
    <div class="section-title">III - ტვირთის იდენტიფიკაცია</div>
    <table class="cargo-table">
      <thead>
        <tr>
          <th class="col-num-sm">#</th>
          <th>დასახელება</th>
          <th class="col-weight">ერთ. წონა კგ</th>
          <th class="col-weight">სრ. წონა კგ</th>
          <th>შენიშვნა</th>
        </tr>
      </thead>
      <tbody>
        ${cargoRows}
        <tr class="cargo-total">
          <td colspan="3" style="text-align:right;">სულ:</td>
          <td class="col-weight">${totalKg} კგ</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `;
}

function resultPill(result: CPResult | null): string {
  if (result === 'good') return '<span class="pill pill-good">✓ კარგი</span>';
  if (result === 'fix') return '<span class="pill pill-fix">✗ გამოსასწ.</span>';
  if (result === 'na') return '<span class="pill pill-na">- N/A</span>';
  return '<span class="pill pill-null">-</span>';
}

function renderSectionIV(insp: CargoPlatformInspection, photos: PhotoMap): string {
  let checklistRows = '';
  let currentSection = '';
  for (const entry of CP_ITEMS) {
    if (entry.section !== currentSection) {
      currentSection = entry.section;
      checklistRows += `<tr class="cl-cat-row"><td colspan="3">${escapeHtml(CP_SECTION_LABELS[entry.section])}</td></tr>`;
    }
    const state = insp.items.find((i) => i.id === entry.id);
    const result = state?.result ?? null;
    const comment = state?.comment ?? null;
    const photoPaths = state?.photo_paths ?? [];
    const isFix = result === 'fix';
    let photoHtml = '';
    for (const p of photoPaths) {
      const src = photos[p];
      if (src) photoHtml += `<span class="item-photo"><img src="${src}" alt="ფოტო" /></span>`;
    }
    checklistRows += `
      <tr${isFix ? ' class="item-fix"' : ''}>
        <td class="col-num">${entry.id}</td>
        <td>
          <strong>${escapeHtml(entry.label)}</strong><br>
          <span style="color:var(--inkSoft)">${escapeHtml(entry.description)}</span>
          ${comment ? `<div class="item-comment">${escapeHtml(comment)}</div>` : ''}
          ${photoHtml ? `<div style="margin-top:4px;">${photoHtml}</div>` : ''}
        </td>
        <td class="col-result">${resultPill(result)}</td>
      </tr>
    `;
  }

  return `
    <div class="section-title">IV - პლატფორმის შემოწმება</div>
    <div class="legend">
      <span class="legend-item"><span class="dot dot-good"></span>✓ კარგი</span>
      <span class="legend-item"><span class="dot dot-fix"></span>✗ გამოსასწორებელი</span>
      <span class="legend-item"><span class="dot dot-na"></span>N/A - არ ვრცელდება</span>
    </div>
    <table class="cl-table">
      <thead>
        <tr><th class="col-num">#</th><th>შემოწმების პუნქტი</th><th class="col-result">შედეგი</th></tr>
      </thead>
      <tbody>${checklistRows}</tbody>
    </table>
  `;
}

function renderSectionV(insp: CargoPlatformInspection): string {
  const vx = (v: string) => (insp.verdict === v ? 'selected' : '');
  const vchecked = (v: string) => (insp.verdict === v ? 'checked' : '');
  return `
    <div class="section-title">V - დასკვნა</div>
    <div class="verdict-block">
      ${(['approved', 'conditional', 'rejected'] as const)
        .map(
          (v) => `
        <div class="verdict-option ${vx(v)}">
          <div class="verdict-box ${vchecked(v)}"></div>
          <span class="verdict-label">${escapeHtml(CP_VERDICT_LABEL[v])}</span>
        </div>
      `,
        )
        .join('')}
    </div>
    <div class="comment-label" style="margin-top:14px;">კომენტარი</div>
    <div class="comment-block">${escapeHtml(insp.verdictComment) || '&nbsp;'}</div>
  `;
}

function renderSectionVI(insp: CargoPlatformInspection, photos: PhotoMap): string {
  const photoItems = insp.summaryPhotos
    .map((p, idx) => {
      const src = photos[p];
      if (!src) return '';
      return `
      <div class="photo-item">
        <img src="${src}" alt="ფოტო ${idx + 1}" />
        <div class="photo-caption">ფოტო ${idx + 1}</div>
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return insp.summaryPhotos.length > 0
    ? `
    <div class="section-title">VI - ფოტო / ვიდეო მასალა</div>
    <div class="photo-grid">${photoItems}</div>
  `
    : '';
}

function renderLegalNote(): string {
  return `
    <div class="legal-note">
      წინამდებარე შემოწმების აქტი წარმოადგენს სამართლებრივი ძალის მქონე დოკუმენტს.
    </div>
  `;
}

export const cargoPlatformSchema: InspectionSchema<CargoPlatformInspection> = {
  category: 'cargo_platform',
  table: 'cargo_platform_inspections',
  pathPrefix: 'cargo-platform',
  templateId: CARGO_PLATFORM_TEMPLATE_ID,

  docTitle: 'ტვირთის მიმღები პლატფორმის<br>შემოწმების აქტი',
  docSubtitle: 'Cargo Receiving Platform - Technical Inspection & Safety Acceptance Act',
  pdfFooterLabel: 'Hubble - ტვირთის მიმღები პლატფორმის შემოწმების აქტი',
  pdfNameLabel: 'CargoPlatformInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({
    docId: d.id.slice(-8).toUpperCase(),
    docDate: fmtDate(d.completedAt ?? d.inspectionDate),
  }),

  collectPhotoPaths: (d) =>
    d.items.flatMap((i) => i.photo_paths ?? []).concat(d.summaryPhotos ?? []),

  blocks: [
    { kind: 'custom', render: (d) => renderSectionI(d) },
    { kind: 'custom', render: (d) => renderSectionII(d) },
    { kind: 'custom', render: (d) => renderSectionIII(d) },
    { kind: 'custom', render: (d, photos) => renderSectionIV(d, photos) },
    { kind: 'custom', render: (d) => renderSectionV(d) },
    { kind: 'custom', render: (d, photos) => renderSectionVI(d, photos) },
    { kind: 'custom', render: () => renderLegalNote() },
  ],
};
