import type { Incident, Project } from '../types/models';
import { INCIDENT_TYPE_FULL_LABEL } from '../types/models';

export interface IncidentPdfArgs {
  incident: Incident;
  project: Project;
  inspectorName: string;
  inspectorRole?: string;
  /** Base64 data URL of the inspector's saved signature. */
  inspectorSignatureDataUrl?: string;
  /** Ordered array of base64 data URLs for each photo in incident.photos. */
  photoDataUrls?: string[];
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ka-GE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildIncidentPdfHtml(args: IncidentPdfArgs): string {
  const {
    incident,
    project,
    inspectorName,
    inspectorRole = 'შრომის უსაფრთხოების სპეციალისტი',
    inspectorSignatureDataUrl,
    photoDataUrls = [],
  } = args;

  const typeLabel =
    INCIDENT_TYPE_FULL_LABEL[incident.type] ?? incident.type;
  const needsNotice =
    incident.type === 'severe' || incident.type === 'fatal';
  const isNearMiss = incident.type === 'nearmiss';

  const photoGrid =
    photoDataUrls.length > 0
      ? `<div class="photo-grid">${photoDataUrls
          .map(
            (u, i) =>
              `<div class="photo-cell"><img src="${u}" alt="ფოტო ${i + 1}"/></div>`,
          )
          .join('')}</div>`
      : '';

  const witnessRows =
    incident.witnesses.length > 0
      ? incident.witnesses
          .map((w, i) => `<div class="field-value">${i + 1}. ${w}</div>`)
          .join('')
      : '<div class="field-value empty">—</div>';

  const typeCheckboxes = [
    { key: 'minor', label: 'მსუბუქი უბედური შემთხვევა' },
    { key: 'severe', label: 'მძიმე უბედური შემთხვევა' },
    { key: 'fatal', label: 'ფატალური უბედური შემთხვევა' },
    { key: 'mass', label: 'მასობრივი (3+ დაშავებული)' },
    { key: 'nearmiss', label: 'საშიში შემთხვევა (near miss)' },
  ]
    .map(
      ({ key, label }) =>
        `<div class="checkbox-row">
          <span class="checkbox">${incident.type === key ? '☑' : '☐'}</span>
          <span${incident.type === key ? ' class="checked"' : ''}>${label}</span>
        </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'DejaVu Serif', 'Sylfaen', Georgia, serif;
    font-size: 11pt;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  h1 {
    font-size: 13pt;
    font-weight: 700;
    text-align: center;
    line-height: 1.5;
    margin: 0 0 4mm;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .subtitle {
    text-align: center;
    font-size: 9pt;
    color: #555;
    margin-bottom: 6mm;
  }
  .meta-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6mm;
    font-size: 10pt;
  }
  .meta-table td {
    padding: 3px 8px 3px 0;
    vertical-align: top;
  }
  .meta-table td:first-child {
    color: #555;
    white-space: nowrap;
    width: 38%;
  }
  .meta-table td:last-child {
    font-weight: 600;
    border-bottom: 1px solid #ccc;
    padding-bottom: 2px;
  }
  .notice-banner {
    border: 2px solid #dc2626;
    border-radius: 6px;
    background: #fef2f2;
    padding: 8px 12px;
    margin-bottom: 6mm;
    font-size: 10pt;
    color: #991b1b;
    font-weight: 700;
    text-align: center;
    line-height: 1.5;
  }
  .section {
    margin-bottom: 5mm;
    page-break-inside: avoid;
  }
  .section-title {
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #1d4ed8;
    border-bottom: 1.5px solid #1d4ed8;
    padding-bottom: 2px;
    margin-bottom: 4px;
  }
  .field-row {
    display: flex;
    gap: 8px;
    margin-bottom: 3px;
  }
  .field-label {
    color: #555;
    min-width: 130px;
    font-size: 10pt;
  }
  .field-value {
    font-weight: 600;
    font-size: 10pt;
    flex: 1;
  }
  .field-value.empty {
    color: #aaa;
    font-weight: 400;
    font-style: italic;
  }
  .textarea-value {
    font-size: 10pt;
    line-height: 1.6;
    white-space: pre-wrap;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 6px 10px;
    background: #fafafa;
    min-height: 28px;
    margin-top: 3px;
  }
  .checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 10.5pt;
    margin-bottom: 4px;
  }
  .checkbox {
    font-size: 13pt;
    line-height: 1;
    min-width: 18px;
  }
  .checked {
    font-weight: 700;
  }
  .sig-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 8mm;
    page-break-inside: avoid;
  }
  .sig-box {
    width: 55%;
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 8px 12px;
    background: #fafafa;
  }
  .sig-label {
    font-size: 9pt;
    color: #555;
    margin-bottom: 4px;
  }
  .sig-name {
    font-weight: 700;
    font-size: 10pt;
  }
  .sig-role {
    font-size: 9pt;
    color: #555;
    margin-bottom: 6px;
  }
  .sig-img {
    max-height: 52px;
    max-width: 180px;
    object-fit: contain;
    display: block;
    margin-bottom: 4px;
  }
  .sig-date {
    font-size: 9pt;
    color: #555;
    border-top: 1px solid #ddd;
    padding-top: 4px;
    margin-top: 4px;
  }
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-top: 4px;
  }
  .photo-cell img {
    width: 100%;
    height: 90px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  .divider {
    height: 1px;
    background: #e5e7eb;
    margin: 5mm 0;
  }
</style>
</head>
<body>

${
  needsNotice
    ? `<div class="notice-banner">
    ⚠ შრომის ინსპექციის სამსახური უნდა ეცნობოს 24 საათის განმავლობაში:<br>
    <span style="font-size:12pt">0322 43 00 43</span>
  </div>`
    : ''
}

<h1>სამუშაო სივრცეში მომხდარი უბედური შემთხვევის<br>შეტყობინების ოქმი</h1>
<div class="subtitle">მინისტრის ბრძანება №01-11/ნ</div>

<table class="meta-table">
  <tr>
    <td>ობიექტი / ორგანიზაცია:</td>
    <td>${project.company_name ?? project.name}</td>
  </tr>
  <tr>
    <td>პროექტი:</td>
    <td>${project.name}</td>
  </tr>
  <tr>
    <td>მისამართი:</td>
    <td>${project.address ?? '—'}</td>
  </tr>
  <tr>
    <td>ოქმის შედგენის თარიღი:</td>
    <td>${fmt(incident.created_at)}</td>
  </tr>
  <tr>
    <td>ოქმის №:</td>
    <td>${incident.id.slice(0, 8).toUpperCase()}</td>
  </tr>
</table>

<div class="divider"></div>

<!-- 1. Type -->
<div class="section">
  <div class="section-title">1. შემთხვევის სახე</div>
  ${typeCheckboxes}
</div>

<!-- 2. Injured person -->
<div class="section">
  <div class="section-title">2. დაზარალებული</div>
  ${
    isNearMiss
      ? '<div class="field-value" style="color:#6b7280;font-style:italic">საშიში შემთხვევა — დაზიანება არ მომხდარა</div>'
      : `<div class="field-row">
          <span class="field-label">სახელი, გვარი:</span>
          <span class="field-value">${incident.injured_name || '—'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">თანამდებობა:</span>
          <span class="field-value">${incident.injured_role || '—'}</span>
        </div>`
  }
  <div class="field-row">
    <span class="field-label">შემთხვევის თარიღი:</span>
    <span class="field-value">${fmt(incident.date_time)}</span>
  </div>
  <div class="field-row">
    <span class="field-label">დრო:</span>
    <span class="field-value">${fmtTime(incident.date_time)}</span>
  </div>
  <div class="field-row">
    <span class="field-label">ზუსტი ადგილი:</span>
    <span class="field-value">${incident.location || '—'}</span>
  </div>
</div>

<!-- 3. Description -->
<div class="section">
  <div class="section-title">3. შემთხვევის გარემოება</div>
  <div class="textarea-value">${incident.description || '—'}</div>
</div>

<!-- 4. Cause -->
<div class="section">
  <div class="section-title">4. სავარაუდო მიზეზი</div>
  <div class="textarea-value">${incident.cause || '—'}</div>
</div>

<!-- 5. Actions -->
<div class="section">
  <div class="section-title">5. მიღებული ზომები</div>
  <div class="textarea-value">${incident.actions_taken || '—'}</div>
</div>

<!-- 6. Witnesses -->
<div class="section">
  <div class="section-title">6. მოწმეები</div>
  ${witnessRows}
</div>

${
  photoDataUrls.length > 0
    ? `<!-- 7. Photos -->
<div class="section">
  <div class="section-title">7. ფოტო მასალა</div>
  ${photoGrid}
</div>`
    : ''
}

<!-- Inspector signature -->
<div class="sig-section">
  <div class="sig-box">
    <div class="sig-label">შემმდგენელი</div>
    <div class="sig-name">${inspectorName}</div>
    <div class="sig-role">${inspectorRole}</div>
    ${
      inspectorSignatureDataUrl
        ? `<img class="sig-img" src="${inspectorSignatureDataUrl}" alt="ხელმოწერა"/>`
        : '<div style="height:32px;border-bottom:1px solid #aaa;margin-bottom:4px;"></div>'
    }
    <div class="sig-date">თარიღი: ${fmt(incident.created_at)}</div>
  </div>
</div>

</body>
</html>`;
}
