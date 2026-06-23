/**
 * Fall-protection (დამჭერი მოწყობილობების) inspection schema.
 *
 * Behavior-faithful replacement for lib/fallProtectionPdf.ts. This is the most
 * structurally divergent equipment type: a registry table plus a *variable
 * number* of per-device sections (each with its own checklist + a 13th custom
 * item, verdict, and a merged photo grid), and a single top-level signature.
 * None of that maps onto the typed-block shapes, so every body section is ported
 * as a `custom` block to keep the output equivalent to the previous sheet. It
 * still inherits the shared base CSS, header/footer, and the cross-platform
 * photo resolver.
 *
 * Header/footer note: the previous builder rendered "next inspection date" and a
 * regulation badge inside its own bespoke header, and the EN-standards line in
 * its own footer. The shared engine owns the header/footer now, so the
 * regulation/standards strings move into header/footer schema fields.
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  FP_CHECKLIST_ITEMS,
  FP_RESULT_TO_CHIP,
  FP_VERDICT_LABELS,
  FALL_PROTECTION_TEMPLATE_ID,
  type FallProtectionInspection,
  type FPDeviceData,
  type FPResult,
} from '../../../types/fallProtection';

// ── Type-specific CSS ──────────────────────────────────────────────────────────
// Only classes NOT already provided by BASE_PDF_CSS, plus the fall-protection
// overrides of shared class names (.section/.section-title differ from base; the
// .sig-* cluster here is a wholly different layout from the base sig grid).

const EXTRA_CSS = `
  .section { margin-bottom: 24px; }
  /* Override base .section-title (which adds a top margin); fall-protection
     titles sit flush at the top of their section/card. */
  .section-title {
    font-size: 11px; font-weight: 800; color: var(--inkSoft);
    text-transform: uppercase; letter-spacing: 0.6px;
    padding-bottom: 6px; border-bottom: 1px solid var(--hairline);
    margin: 0 0 12px;
  }

  .info-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .info-row { display: flex; flex-direction: column; gap: 2px; }
  .info-label { font-size: 10px; color: var(--inkFaint); }
  .info-value { font-size: 12px; font-weight: 600; color: var(--ink); }

  /* Registry table */
  .reg-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
  .reg-table th {
    background: var(--catHdr); padding: 6px 8px; text-align: left;
    font-weight: 700; border: 1px solid var(--hairline);
  }
  .reg-table td { padding: 6px 8px; border: 1px solid var(--hairline); }
  .reg-table tr:nth-child(even) td { background: #FAFAFA; }

  /* Device section */
  .device-section {
    border: 1.5px solid var(--hairline); border-radius: 10px;
    margin-bottom: 20px; overflow: hidden;
  }
  .device-header {
    background: var(--catHdr); padding: 10px 14px;
    display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid var(--hairline);
  }
  .device-badge {
    background: var(--accent); color: #fff; font-weight: 800;
    font-size: 13px; border-radius: 8px; padding: 2px 10px;
  }
  .device-meta { font-size: 11px; color: var(--inkSoft); }

  /* Checklist table - override base .cl-table th text styling (base makes
     headers small/uppercase/gray/centered; the fall-protection sheet uses
     left-aligned, ink-colored, non-transformed 11px headers). */
  .cl-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .cl-table th {
    background: var(--catHdr); padding: 6px 8px; font-weight: 700;
    border: 1px solid var(--hairline); text-align: left;
    color: var(--ink); font-size: 11px; text-transform: none; letter-spacing: 0;
  }
  .cl-table td { padding: 6px 8px; border: 1px solid var(--hairline); vertical-align: top; }
  .cl-table tr:nth-child(even) td { background: #FAFAFA; }
  .chip-safe     { color: #065F46; font-weight: 700; }
  .chip-critical { color: var(--redText); font-weight: 700; }
  .chip-minor    { color: #92400E; font-weight: 700; }
  .chip-na       { color: var(--inkFaint); }

  /* Verdict - override base .verdict-block (base adds a top margin; here it sits
     flush as a band inside the device card). */
  .verdict-block { margin-top: 0; padding: 12px 14px; border-bottom: 1px solid var(--hairline); }
  .verdict-label { font-size: 10px; color: var(--inkFaint); margin-bottom: 4px; line-height: 1.45; }
  .verdict-safe   { color: #065F46; font-weight: 800; font-size: 13px; }
  .verdict-minor  { color: #92400E; font-weight: 800; font-size: 13px; }
  .verdict-banned { color: var(--redText); font-weight: 800; font-size: 13px; }
  .verdict-comment { font-size: 11px; color: var(--inkSoft); margin-top: 4px; }

  /* Signature - override base .sig-block (a bordered grid container); the
     fall-protection signature is a plain block with only a bottom rule. Reset
     every base property that would otherwise leak (display/border/radius/etc). */
  .sig-block {
    display: block; gap: 0; margin-top: 0; overflow: visible;
    border: none; border-radius: 0; border-bottom: 1px solid var(--hairline);
    padding: 12px 14px;
  }
  .sig-row { display: flex; gap: 16px; align-items: flex-start; }
  .sig-fields { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .sig-canvas { width: 180px; text-align: center; }
  .sig-img { max-width: 180px; max-height: 80px; border-bottom: 1px solid var(--ink); }
  .sig-date { font-size: 10px; color: var(--inkFaint); margin-top: 4px; }
  .unsigned { width: 180px; height: 60px; border-bottom: 1px dashed var(--hairline); }

  /* Photos */
  .photos-block { padding: 12px 14px; }
  .photos-label { font-size: 10px; color: var(--inkFaint); margin-bottom: 8px; }
  .photos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .photos-grid img { width: 100%; height: 160px; object-fit: cover; border-radius: 6px; }
  .item-comment { font-size: 10px; color: var(--inkSoft); margin-top: 3px; font-style: italic; }
`;

// ── Helpers (ported verbatim from lib/fallProtectionPdf.ts) ─────────────────────

function chipClass(result: FPResult | null): string {
  if (result === 'safe')     return 'chip-safe';
  if (result === 'critical') return 'chip-critical';
  if (result === 'minor')    return 'chip-minor';
  return 'chip-na';
}

function chipDisplay(result: FPResult | null): string {
  if (!result) return '-';
  return FP_RESULT_TO_CHIP[result];
}

function verdictClass(verdict: string | null): string {
  if (verdict === 'safe')   return 'verdict-safe';
  if (verdict === 'minor')  return 'verdict-minor';
  if (verdict === 'banned') return 'verdict-banned';
  return '';
}

function buildDeviceSection(
  data: FPDeviceData,
  deviceLabel: string,
  deviceMeta: string,
  photos: PhotoMap,
): string {
  // Checklist rows
  const rows = FP_CHECKLIST_ITEMS.map(entry => {
    const state = data.items.find(i => i.id === entry.id);
    const result = state?.result ?? null;
    return `
      <tr>
        <td>${entry.id}</td>
        <td>${escapeHtml(entry.label)}</td>
        <td class="${chipClass(result)}">${chipDisplay(result)}</td>
        <td class="item-comment">${escapeHtml(state?.comment ?? '')}</td>
      </tr>`;
  }).join('');

  // Custom item row
  const ci = data.customItem;
  const customRow = `
    <tr>
      <td>13</td>
      <td>${escapeHtml(ci.label || 'სხვა')}</td>
      <td class="${chipClass(ci.result)}">${chipDisplay(ci.result)}</td>
      <td class="item-comment">${escapeHtml(ci.comment ?? '')}</td>
    </tr>`;

  // Verdict
  const vLabel = data.verdict ? FP_VERDICT_LABELS[data.verdict] : '-';
  const verdictHtml = `
    <div class="verdict-block">
      <div class="verdict-label">დასკვნა</div>
      <div class="${verdictClass(data.verdict)}">${escapeHtml(vLabel)}</div>
      ${data.verdictComment ? `<div class="verdict-comment">${escapeHtml(data.verdictComment)}</div>` : ''}
    </div>`;

  // Photos - item-level photos first, then device summary photos
  const allItemPhotoPaths = [
    ...data.items.flatMap(i => i.photo_paths ?? []),
    ...(ci.photo_paths ?? []),
  ];
  const allPhotoPaths = [...allItemPhotoPaths, ...(data.photoPaths ?? [])];
  const photoCells = allPhotoPaths
    .map(p => photos[p] ? `<img src="${photos[p]}" alt="ფოტო" />` : '')
    .filter(Boolean)
    .join('');
  const photosHtml = `
    <div class="photos-block">
      <div class="photos-label">${escapeHtml(deviceLabel)} - ფოტო</div>
      ${photoCells
        ? `<div class="photos-grid">${photoCells}</div>`
        : '<span style="color:var(--inkFaint)">-</span>'}
    </div>`;

  return `
    <div class="device-section">
      <div class="device-header">
        <span class="device-badge">${escapeHtml(deviceLabel)}</span>
        <span class="device-meta">${escapeHtml(deviceMeta)}</span>
      </div>
      <table class="cl-table">
        <thead>
          <tr>
            <th style="width:28px">#</th>
            <th>პარამეტრი</th>
            <th style="width:36px">შეფ.</th>
            <th>კომენტარი</th>
          </tr>
        </thead>
        <tbody>${rows}${customRow}</tbody>
      </table>
      ${verdictHtml}
      ${photosHtml}
    </div>`;
}

// ── Body section blocks ─────────────────────────────────────────────────────────

function renderGeneralInfo(ins: FallProtectionInspection): string {
  const regRows = ins.devices.map((d) => `
    <tr>
      <td>${escapeHtml(d.id)}</td>
      <td>${escapeHtml(d.type)}</td>
      <td>${escapeHtml(d.location)}</td>
      <td>${escapeHtml(d.floor)}</td>
      <td>${escapeHtml(d.purpose)}</td>
      <td>${escapeHtml(d.comment)}</td>
    </tr>`).join('');

  const inspTypeLabel =
    ins.inspectionType === 'primary' ? 'პირველადი' :
    ins.inspectionType === 'secondary' ? 'განმეორებითი' : '-';

  return `
  <div class="section">
    <div class="section-title">I - ზოგადი ინფორმაცია / General Information</div>
    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">ობიექტის დასახელება</span>
        <span class="info-value">${escapeHtml(ins.company) || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">მისამართი</span>
        <span class="info-value">${escapeHtml(ins.address) || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">უსაფრთხ. ხელმძღვ.</span>
        <span class="info-value">${escapeHtml(ins.safetyLeaderName) || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">ტელეფონი</span>
        <span class="info-value">${escapeHtml(ins.safetyLeaderPhone) || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">შემოწმების სახე</span>
        <span class="info-value">${inspTypeLabel}</span>
      </div>
    </div>

    <table class="reg-table" style="margin-top:16px">
      <thead>
        <tr>
          <th>ID</th>
          <th>ტიპი / სახეობა</th>
          <th>განთავს. ადგილი</th>
          <th>სართული</th>
          <th>ვისთვის / რისთვის</th>
          <th>კომენტარი</th>
        </tr>
      </thead>
      <tbody>${regRows}</tbody>
    </table>
  </div>`;
}

function renderDeviceSections(ins: FallProtectionInspection, photos: PhotoMap): string {
  return ins.devices.map((d, i) => {
    const data = ins.deviceData[i];
    if (!data) return '';
    const meta = [d.type, d.location, d.floor].filter(Boolean).join(' · ');
    return buildDeviceSection(data, d.id, meta, photos);
  }).join('');
}

function renderSignature(ins: FallProtectionInspection): string {
  const sig = ins.signature;
  const sigImgTag = sig?.signature
    ? `<img class="sig-img" src="data:image/png;base64,${sig.signature}" alt="ხელმოწერა" />`
    : '<div class="unsigned"></div>';
  return `
    <div class="sig-block">
      <div class="sig-row">
        <div class="sig-fields">
          <div class="info-row">
            <span class="info-label">სახელი, გვარი</span>
            <span class="info-value">${escapeHtml(sig?.name) || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">სამუშაო პოზიცია</span>
            <span class="info-value">${escapeHtml(sig?.position) || '-'}</span>
          </div>
        </div>
        <div class="sig-canvas">
          ${sigImgTag}
          <div class="sig-date">${sig?.date ? fmtDate(sig.date) : ''}</div>
        </div>
      </div>
    </div>`;
}

// ── Schema ──────────────────────────────────────────────────────────────────────

export const fallProtectionSchema: InspectionSchema<FallProtectionInspection> = {
  category: 'fall_protection_inspection',
  table: 'fall_protection_inspections',
  pathPrefix: 'fall-protection',
  templateId: FALL_PROTECTION_TEMPLATE_ID,

  docTitle: 'დამჭერი მოწყობილობების<br>შემოწმების აქტი',
  docSubtitle: 'Fall Protection Equipment Inspection',
  pdfFooterLabel: 'EN 363:2008 · EN 795:2012 · EN 354:2010 · EN 355:2002 · EN 1891:2020 · EN 361:2002',
  pdfNameLabel: 'FallProtectionInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({
    docId: d.id.slice(-8).toUpperCase(),
    docDate: fmtDate(d.completedAt ?? d.createdAt),
  }),

  collectPhotoPaths: (d) =>
    d.deviceData.flatMap((dev) => [
      ...dev.items.flatMap((i) => i.photo_paths ?? []),
      ...(dev.customItem.photo_paths ?? []),
      ...(dev.photoPaths ?? []),
    ]),

  blocks: [
    { kind: 'custom', render: (d: FallProtectionInspection) => renderGeneralInfo(d) },
    { kind: 'custom', render: (d: FallProtectionInspection, photos: PhotoMap) => renderDeviceSections(d, photos) },
    { kind: 'custom', render: (d: FallProtectionInspection) => renderSignature(d) },
  ],
};
