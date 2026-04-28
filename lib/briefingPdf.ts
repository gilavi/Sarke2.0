import type { Briefing } from '../types/models';
import type { Project } from '../types/models';

/** Predefined topic labels (matches the setup screen chips). */
const TOPIC_LABELS: Record<string, string> = {
  'scaffold_safety': 'ხარაჩოს უსაფრთხოება',
  'height_work': 'სიმაღლეზე მუშაობა',
  'ppe': 'დამცავი აღჭურვილობა',
  'evacuation': 'საევაკუაციო გეგმა',
  'fire_safety': 'ხანძარსაწინააღმდეგო',
};

/** Resolve a topic key or 'custom:...' value to a display label. */
function topicLabel(t: string): string {
  if (t.startsWith('custom:')) return t.slice(7);
  return TOPIC_LABELS[t] ?? t;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const KA_MONTHS = [
    'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
  ];
  const day = d.getDate();
  const month = KA_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

function sigImg(b64: string | null): string {
  if (!b64) return '<span style="color:#999">—</span>';
  return `<img src="data:image/png;base64,${b64}" style="max-width:160px;max-height:56px;display:block;" alt="ხელმოწერა" />`;
}

/** Build a full HTML string for the briefing PDF. */
export function buildBriefingPdfHtml(briefing: Briefing, project: Project): string {
  const participantRows = briefing.participants
    .map(
      (p, i) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #D4D0C8;text-align:center;font-size:13px;">${i + 1}</td>
        <td style="padding:8px 10px;border:1px solid #D4D0C8;font-size:13px;">${p.name}</td>
        <td style="padding:8px 10px;border:1px solid #D4D0C8;">${sigImg(p.signature)}</td>
      </tr>`,
    )
    .join('');

  const topicsList = briefing.topics
    .map(t => `<li style="margin-bottom:4px;">${topicLabel(t)}</li>`)
    .join('');

  const projectLine = [project.name, project.address].filter(Boolean).join(' — ');
  const dateStr = formatDateTime(briefing.dateTime);
  const completedDateStr = briefing.createdAt ? formatDateTime(briefing.createdAt) : '';

  return `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ინსტრუქტაჟის ოქმი</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a1a;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
    padding: 0;
  }
  .header {
    text-align: center;
    border-bottom: 3px solid #147A4F;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .header h1 {
    font-size: 18px;
    font-weight: 800;
    color: #0C4930;
    margin: 0 0 4px 0;
    letter-spacing: -0.3px;
  }
  .header .subtitle {
    font-size: 12px;
    color: #7C7870;
    margin: 0;
  }
  .meta-section {
    background: #FAFAF8;
    border: 1px solid #E8E6E0;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 24px;
  }
  .meta-row {
    display: flex;
    margin-bottom: 8px;
    font-size: 13px;
  }
  .meta-row:last-child { margin-bottom: 0; }
  .meta-label {
    font-weight: 700;
    color: #504C44;
    min-width: 160px;
    flex-shrink: 0;
  }
  .meta-value { color: #1a1a1a; }
  .section-title {
    font-size: 14px;
    font-weight: 800;
    color: #0C4930;
    margin: 0 0 12px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #E8E6E0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .participants-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 32px;
  }
  .participants-table th {
    background: #147A4F;
    color: #fff;
    padding: 10px;
    text-align: left;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.3px;
  }
  .participants-table th:first-child { text-align: center; width: 40px; border-radius: 0; }
  .participants-table th:last-child { width: 180px; }
  .participants-table tr:nth-child(even) td { background: #FAFAF8; }
  .inspector-block {
    border: 2px solid #147A4F;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 32px;
    page-break-inside: avoid;
  }
  .inspector-title {
    font-size: 13px;
    font-weight: 800;
    color: #0C4930;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }
  .inspector-row {
    display: flex;
    margin-bottom: 6px;
    font-size: 13px;
  }
  .inspector-label {
    font-weight: 700;
    color: #504C44;
    min-width: 100px;
  }
  .sig-block {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #E8E6E0;
  }
  .sig-label {
    font-size: 11px;
    color: #7C7870;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .topics-list {
    margin: 0;
    padding-left: 20px;
  }
  .footer {
    text-align: center;
    font-size: 10px;
    color: #A8A49C;
    margin-top: 40px;
    padding-top: 12px;
    border-top: 1px solid #E8E6E0;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>შრომის უსაფრთხოების ინსტრუქტაჟის ოქმი</h1>
    <p class="subtitle">Safety Briefing Protocol</p>
  </div>

  <div class="meta-section">
    <div class="meta-row">
      <span class="meta-label">პროექტი:</span>
      <span class="meta-value">${projectLine || '—'}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">თარიღი და დრო:</span>
      <span class="meta-value">${dateStr}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">მონაწილეთა რაოდენობა:</span>
      <span class="meta-value">${briefing.participants.length}</span>
    </div>
  </div>

  <p class="section-title">ინსტრუქტაჟის თემები</p>
  <ul class="topics-list" style="margin-bottom:24px;">
    ${topicsList || '<li>—</li>'}
  </ul>

  <p class="section-title">მონაწილეთა სია</p>
  <table class="participants-table">
    <thead>
      <tr>
        <th>№</th>
        <th>სახელი გვარი</th>
        <th>ხელმოწერა</th>
      </tr>
    </thead>
    <tbody>
      ${participantRows}
    </tbody>
  </table>

  <div class="inspector-block">
    <div class="inspector-title">ინსპექტორის დასტური</div>
    <div class="inspector-row">
      <span class="inspector-label">სახელი:</span>
      <span>${briefing.inspectorName || '—'}</span>
    </div>
    <div class="inspector-row">
      <span class="inspector-label">პოზიცია:</span>
      <span>შრომის უსაფრთხოების სპეციალისტი</span>
    </div>
    <div class="inspector-row">
      <span class="inspector-label">თარიღი:</span>
      <span>${completedDateStr}</span>
    </div>
    <div class="sig-block">
      <div class="sig-label">ხელმოწერა</div>
      ${sigImg(briefing.inspectorSignature)}
    </div>
  </div>

  <div class="footer">
    დოკუმენტი შედგენილია SARKE აპლიკაციის მეშვეობით
  </div>
</body>
</html>`;
}

/** Build a preview version (no @page rules, adds preview banner). */
export function buildBriefingPreviewHtml(briefing: Briefing, project: Project): string {
  const full = buildBriefingPdfHtml(briefing, project);
  return full
    .replace('@page { size: A4; margin: 20mm 18mm; }', '')
    .replace('<body>', '<body><div style="background:#F59E0B;color:#fff;text-align:center;padding:6px;font-size:12px;font-weight:700;letter-spacing:1px;">გადახედვა / PREVIEW</div>');
}
