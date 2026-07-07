/**
 * Safety net inspection schema - უსაფრთხოების ბადის შემოწმების აქტი.
 *
 * Web-app mirror of the Expo app's `lib/inspection/schemas/safetyNet.ts`
 * (the `@root` import is banned by eslint). Drives the descriptor-driven PDF via
 * `lib/inspection/pdf.ts`. Every body section is a `custom` block (the safety-net
 * layout - №477 badge, param table, load-test weight table, pass/fail matrix -
 * diverges from the typed-block shape) for byte-identical output to mobile.
 *
 * Regulatory divergence from mobile: the persisted "VII - ხელმოწერები" signature
 * grid is NOT rendered here. Captured inspection signatures are never persisted
 * on web; they are appended by `buildInspectionPdf` from the in-memory
 * `SignaturesSectionData`. The legal note that lived in Section VII is kept.
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  SN_VISUAL_ITEMS,
  SN_POST_TEST_ITEMS,
  SN_VERDICT_LABEL,
  SAFETY_NET_TEMPLATE_ID,
  snTotalWeight,
  type SafetyNetInspection,
} from '@/lib/types/safetyNet';

const EXTRA_CSS = `
  :root {
    --amberBdr:   #D97706;
    --redText:    #991B1B;
    --na:         #E5E7EB;
    --naText:     #6B7280;
  }

  /* Regulation badge (header) */
  .regulation-badge {
    display: inline-block; font-size: 10px; font-weight: 700;
    border: 1.5px solid var(--amberBdr); color: #92400E;
    border-radius: 4px; padding: 2px 8px; margin-top: 5px;
  }

  /* Parameter table (net ID) */
  .param-table { width: 100%; border-collapse: collapse; }
  .param-table td { padding: 5px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: middle; }
  .param-table td:first-child { width: 52%; color: var(--inkSoft); font-weight: 600; }
  .param-table td:last-child { color: var(--ink); }
  .param-table tr:nth-child(even) td { background: var(--catHdr); }

  /* Result pills */
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-good { background: var(--greenSoft); color: #065F46; }
  .pill-fix  { background: var(--amberSoft); color: #92400E; }
  .pill-na   { background: var(--na); color: var(--naText); }
  .pill-null { background: var(--catHdr); color: var(--inkFaint); }
  .pill-pass { background: var(--greenSoft); color: #065F46; }
  .pill-fail { background: var(--redSoft); color: var(--redText); }
  .pill-cert-active   { background: var(--greenSoft); color: #065F46; }
  .pill-cert-expired  { background: var(--redSoft); color: var(--redText); }
  .pill-cert-none     { background: var(--na); color: var(--naText); }

  /* Checklist table (type-specific deltas over base) */
  .cl-table th { text-align: left; }
  .col-result { width: 80px; white-space: nowrap; }
  .item-fix { border-left: 3px solid var(--amberBdr) !important; }
  .item-fail { border-left: 3px solid var(--red) !important; }

  /* Load test table */
  .load-table { width: 100%; border-collapse: collapse; }
  .load-table th, .load-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .load-table thead tr { background: var(--catHdr); }
  .load-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .load-total td { background: var(--catHdr); font-weight: 700; }
  .load-instruction {
    font-size: 10px; color: var(--inkSoft); font-style: italic;
    padding: 6px 10px; background: var(--amberSoft); border-radius: 6px;
    margin-bottom: 8px; border-left: 3px solid var(--amberBdr);
  }

  /* Verdict fail variants (over base verdict styling) */
  .verdict-option.selected-fail { border-color: var(--red); background: var(--redSoft); }
  .verdict-box.checked-fail { background: var(--red); border-color: var(--red); }
  .verdict-box.checked-fail::after { content: '✗'; color: #fff; font-size: 9px; }
  .comment-block {
    margin-top: 12px; padding: 10px 12px;
    border: 0.5px solid var(--hairline); border-radius: 8px;
    min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5;
  }
  .comment-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

  /* Photos */
  .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
  .photo-item img { width: 100%; border-radius: 6px; border: 0.5px solid var(--hairline); display: block; }
  .photo-caption { font-size: 10px; color: var(--inkFaint); margin-top: 3px; text-align: center; }
  .qual-doc-img { max-width: 100%; border-radius: 8px; border: 0.5px solid var(--hairline); display: block; margin: 0 auto; }

  .legal-note {
    margin-top: 16px; font-size: 9px; color: var(--inkFaint);
    text-align: center; line-height: 1.5; font-style: italic;
  }
`;

function renderRegulationBadge(): string {
  return `<span class="regulation-badge">№477 დადგენილება</span>`;
}

function renderSectionI(insp: SafetyNetInspection): string {
  return `
    <div class="section-title">I - ზოგადი ინფორმაცია</div>
    <table class="info-table">
      <tr>
        <td><span class="lbl">კომპანიის დასახელება</span><span class="val">${escapeHtml(insp.company) || '-'}</span></td>
        <td><span class="lbl">შემოწმების თარიღი</span><span class="val">${fmtDate(insp.inspectionDate)}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">მდებარეობა / მისამართი</span><span class="val">${escapeHtml(insp.address) || '-'}</span></td>
        <td><span class="lbl">შემოწმების ჩამტარებელი</span><span class="val">${escapeHtml(insp.inspectorName) || '-'}</span></td>
      </tr>
    </table>
  `;
}

function renderSectionII(insp: SafetyNetInspection): string {
  const certPill = (() => {
    if (!insp.certificate) return '<span class="pill pill-null">-</span>';
    if (insp.certificate === 'active') return '<span class="pill pill-cert-active">მოქმედი სერტ.</span>';
    if (insp.certificate === 'expired') return '<span class="pill pill-cert-expired">ვადაგასული</span>';
    return '<span class="pill pill-cert-none">სერტ. არ გააჩნია</span>';
  })();

  return `
    <div class="section-title">II - ბადის იდენტიფიკაცია</div>
    <table class="param-table">
      <tr><td>დასახელება</td><td>${escapeHtml(insp.manufacturer) || '-'}</td></tr>
      <tr><td>ბადის ზომა მ×მ</td><td>${escapeHtml(insp.netSize) || '-'}</td></tr>
      <tr><td>დგარის ზომა</td><td>${escapeHtml(insp.postSize) || '-'}</td></tr>
      <tr><td>დგარების რაოდენობა</td><td>${insp.postCount ?? '-'}</td></tr>
      <tr><td>დგარის სამაგრების რ-ბა</td><td>${insp.postAnchorCount ?? '-'}</td></tr>
      <tr><td>სამაგრი წერტილების რ-ბა</td><td>${insp.anchorPointCount ?? '-'}</td></tr>
      <tr><td>კიდის ბაგირების რ-ბა</td><td>${insp.edgeRopeCount ?? '-'}</td></tr>
      <tr><td>უჯრედის მხარე</td><td>${escapeHtml(insp.cellSide) || '-'}</td></tr>
      <tr><td>ბადის დგარებს შორის მანძილი</td><td>${escapeHtml(insp.workingDistance) || '-'}</td></tr>
      <tr><td>სერტიფიკატი</td><td>${certPill}</td></tr>
    </table>
  `;
}

function renderSectionIII(insp: SafetyNetInspection, photos: PhotoMap): string {
  const visualRows = SN_VISUAL_ITEMS.map((entry) => {
    const state = insp.items.find((i) => i.id === entry.id);
    const result = state?.result ?? null;
    const isFix = result === 'fix';

    const pillHtml = (() => {
      if (result === 'good') return '<span class="pill pill-good">კარგი</span>';
      if (result === 'fix') return '<span class="pill pill-fix">გამოსასწ.</span>';
      if (result === 'na') return '<span class="pill pill-na">N/A</span>';
      return '<span class="pill pill-null">-</span>';
    })();

    const photoHtml = (state?.photo_paths ?? [])
      .map((p) => {
        const embed = photos[p];
        if (!embed) return '';
        return `<span class="item-photo"><img src="${embed}" /></span>`;
      })
      .join('');

    const commentHtml = state?.comment ? `<div class="item-comment">${escapeHtml(state.comment)}</div>` : '';
    const photosHtml = photoHtml ? `<div style="margin-top:4px">${photoHtml}</div>` : '';

    return `
      <tr class="${isFix ? 'item-fix' : ''}">
        <td class="col-num">${entry.id}</td>
        <td>
          ${escapeHtml(entry.label)}
          ${entry.description ? `<div class="item-comment">${escapeHtml(entry.description)}</div>` : ''}
          ${commentHtml}${photosHtml}
        </td>
        <td class="col-result">${pillHtml}</td>
      </tr>`;
  }).join('');

  return `
    <div class="section-title">III - ვიზუალური შემოწმება</div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${visualRows}</tbody>
    </table>
  `;
}

function renderSectionIV(insp: SafetyNetInspection): string {
  const loadRows = insp.loadTestRows
    .map(
      (row, i) => `
    <tr>
      <td class="col-num">${i + 1}</td>
      <td>${escapeHtml(row.name) || '-'}</td>
      <td style="text-align:right">${row.unitWeightKg ?? '-'}</td>
      <td style="text-align:right">${row.quantity ?? '-'}</td>
      <td style="text-align:right">${row.totalWeightKg ?? '-'}</td>
      <td>${escapeHtml(row.comment) || ''}</td>
    </tr>
  `,
    )
    .join('');

  const totalKg = snTotalWeight(insp.loadTestRows);

  return `
    <div class="section-title">IV - დატვირთვის ტესტი</div>
    <div class="load-instruction">
      180კგ-ის სიმძიმე 1მ სიმაღლიდან - №477 დადგენილება
    </div>
    <table class="load-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>დასახელება</th>
          <th style="text-align:right;width:80px">ერთ.წ.(კგ)</th>
          <th style="text-align:right;width:60px">რ-ბა</th>
          <th style="text-align:right;width:80px">სულ(კგ)</th>
          <th>კომ.</th>
        </tr>
      </thead>
      <tbody>${loadRows}</tbody>
      <tfoot>
        <tr class="load-total">
          <td colspan="4" style="text-align:right">სულ:</td>
          <td style="text-align:right">${totalKg} კგ</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;
}

function renderSectionV(insp: SafetyNetInspection): string {
  const postRows = SN_POST_TEST_ITEMS.map((entry) => {
    const state = insp.postTestItems.find((i) => i.id === entry.id);
    const result = state?.result ?? null;
    const isFail = result === 'fail';

    const pillHtml = (() => {
      if (result === 'pass') return '<span class="pill pill-pass">გამოც. ✓</span>';
      if (result === 'fail') return '<span class="pill pill-fail">პრობლ. ✗</span>';
      return '<span class="pill pill-null">-</span>';
    })();

    return `
      <tr class="${isFail ? 'item-fail' : ''}">
        <td class="col-num">${entry.id}</td>
        <td>${escapeHtml(entry.label)}</td>
        <td class="col-result">${pillHtml}</td>
      </tr>`;
  }).join('');

  return `
    <div class="section-title">V - ტვირთის ჩაგდების შემდეგ შემოწმება</div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${postRows}</tbody>
    </table>
  `;
}

function renderSectionVI(insp: SafetyNetInspection): string {
  const verdictOptions = (['pass', 'fail'] as const)
    .map((v) => {
      const selected = insp.verdict === v;
      const isFail = v === 'fail';
      const selClass = selected ? (isFail ? 'selected-fail' : 'selected') : '';
      const boxClass = selected ? (isFail ? 'checked-fail' : 'checked') : '';
      return `
      <div class="verdict-option ${selClass}">
        <div class="verdict-box ${boxClass}"></div>
        <span class="verdict-label">${escapeHtml(SN_VERDICT_LABEL[v])}</span>
      </div>`;
    })
    .join('');

  return `
    <div class="section-title">VI - დასკვნა</div>
    <div class="verdict-block">${verdictOptions}</div>
    <div class="comment-block">
      <div class="comment-label">კომენტარი</div>
      ${escapeHtml(insp.verdictComment) || ''}
    </div>
  `;
}

function renderLegalNote(): string {
  return `
    <div class="legal-note">
      ეს დოკუმენტი შედგენილია №477 დადგენილების მოთხოვნების შესაბამისად.
      This document is prepared in accordance with Decree No. 477 requirements.
    </div>
  `;
}

function renderSectionVIII(insp: SafetyNetInspection, photos: PhotoMap): string {
  if (!insp.qualDocPath) return '';
  const embed = photos[insp.qualDocPath];
  if (!embed) return '';
  return `
    <div class="section-title">VIII - კვალიფიკაციის / სერტიფიკატის ფოტო</div>
    <img class="qual-doc-img" src="${embed}" />
  `;
}

function renderSectionIX(insp: SafetyNetInspection, photos: PhotoMap): string {
  if (insp.summaryPhotos.length === 0) return '';
  const photoItems = insp.summaryPhotos
    .map((p, i) => {
      const embed = photos[p];
      if (!embed) return '';
      return `
        <div class="photo-item">
          <img src="${embed}" />
          <div class="photo-caption">ფოტო ${i + 1}</div>
        </div>`;
    })
    .filter(Boolean)
    .join('');

  if (!photoItems) return '';
  return `
    <div class="section-title">IX - ფოტო / ვიდეო მასალა</div>
    <div class="photo-grid">${photoItems}</div>
  `;
}

export const safetyNetSchema: InspectionSchema<SafetyNetInspection> = {
  category: 'safety_net_inspection',
  table: 'safety_net_inspections',
  pathPrefix: 'safety-net',
  templateId: SAFETY_NET_TEMPLATE_ID,

  docTitle: 'უსაფრთხოების ბადის შემოწმების აქტი',
  docSubtitle: 'Safety Net Inspection & Acceptance Act',
  pdfFooterLabel: 'Hubble - შრომის უსაფრთხოება',
  pdfNameLabel: 'SafetyNetInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({
    docId: d.id.slice(-8).toUpperCase(),
    docDate: fmtDate(d.completedAt ?? d.inspectionDate),
  }),

  collectPhotoPaths: (d) => [
    ...d.items.flatMap((i) => i.photo_paths ?? []),
    ...(d.qualDocPath ? [d.qualDocPath] : []),
    ...d.summaryPhotos,
  ],

  blocks: [
    { kind: 'custom', render: () => renderRegulationBadge() },
    { kind: 'custom', render: (d) => renderSectionI(d) },
    { kind: 'custom', render: (d) => renderSectionII(d) },
    { kind: 'custom', render: (d, photos) => renderSectionIII(d, photos) },
    { kind: 'custom', render: (d) => renderSectionIV(d) },
    { kind: 'custom', render: (d) => renderSectionV(d) },
    { kind: 'custom', render: (d) => renderSectionVI(d) },
    { kind: 'custom', render: (d, photos) => renderSectionVIII(d, photos) },
    { kind: 'custom', render: (d, photos) => renderSectionIX(d, photos) },
    { kind: 'custom', render: () => renderLegalNote() },
  ],
};
