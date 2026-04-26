import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { Answer, AnswerPhoto, Inspection, Project, Qualification, Question, SignatureRecord, Template } from '../types/models';

interface PdfInput {
  questionnaire: Inspection;
  template: Template;
  project: Project;
  questions: Question[];
  answers: Answer[];
  signatures: SignatureRecord[];
  photosByAnswer: Record<string, AnswerPhoto[]>;
  certificates: Array<Qualification & { file_data_url?: string }>;
}

let nitroPdfModule: any = null;

try {
  // Dynamic import so failure doesn't crash the app on load
  nitroPdfModule = require('@flitzinteractive/react-native-nitro-html-pdf');
} catch {
  nitroPdfModule = null;
}

export async function generateInspectionPdf(
  input: PdfInput,
  signatureSvg?: string,
): Promise<string> {
  const html = buildPdfHtml(input, signatureSvg);

  if (nitroPdfModule?.generatePdf) {
    try {
      const uri = await nitroPdfModule.generatePdf({ html });
      return uri;
    } catch {
      // Fallback to expo-print
    }
  }

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function sharePdf(uri: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }
}

export async function compressPhoto(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: 2048 } }],
    { compress: 0.85, format: SaveFormat.JPEG },
  );
  return result.uri;
}

function buildPdfHtml(input: PdfInput, signatureSvg?: string): string {
  const { questionnaire, template, project, questions, answers, signatures, photosByAnswer, certificates } = input;

  const safe = (s: string | null | undefined) =>
    (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const answerMap = new Map(answers.map(a => [a.question_id, a]));

  let questionsHtml = '';
  for (const q of questions) {
    const ans = answerMap.get(q.id);
    let answerText = '—';
    if (q.type === 'yesno') {
      answerText = ans?.value_bool === true ? 'კი' : ans?.value_bool === false ? 'არა' : '—';
    } else if (q.type === 'measure') {
      answerText = ans?.value_num != null ? `${ans.value_num}` : '—';
    } else if (q.type === 'freetext') {
      answerText = safe(ans?.value_text) || '—';
    }

    const photos = photosByAnswer[q.id] || [];
    const photosHtml = photos.length
      ? `<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">${photos.map(p => `<img src="${safe(p.storage_path)}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;"/>`).join('')}</div>`
      : '';

    questionsHtml += `
      <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E8E1D4;">
        <div style="font-weight:700;font-size:14px;color:#1A1A1A;margin-bottom:4px;">${safe(q.title)}</div>
        <div style="font-size:13px;color:#4A4A4A;">${answerText}</div>
        ${photosHtml}
        ${ans?.comment ? `<div style="font-size:12px;color:#666;margin-top:4px;font-style:italic;">შენიშვნა: ${safe(ans.comment)}</div>` : ''}
      </div>
    `;
  }

  const sigsHtml = signatures.length
    ? `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;">${signatures.map(s => `
      <div style="text-align:center;">
        <div style="font-weight:600;font-size:13px;">${safe(s.full_name)}</div>
        <div style="font-size:11px;color:#4A4A4A;">${safe(s.position)}</div>
        ${s.signature_png_url ? `<img src="${s.signature_png_url}" style="width:120px;height:60px;object-fit:contain;margin-top:4px;"/>` : '<div style="width:120px;height:60px;border-bottom:1px solid #000;margin-top:4px;"></div>'}
      </div>
    `).join('')}</div>`
    : '';

  const certsHtml = certificates.length
    ? `<ul style="font-size:13px;color:#4A4A4A;margin-top:8px;padding-left:16px;">${certificates.map(c => `<li>${safe(c.type)}${c.number ? ` №${safe(c.number)}` : ''}</li>`).join('')}</ul>`
    : '<div style="font-size:13px;color:#4A4A4A;margin-top:8px;">—</div>';

  const dateStr = new Date(questionnaire.completed_at ?? questionnaire.created_at).toLocaleString('ka-GE');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 24px; }
  body { font-family: 'Noto Sans Georgian', 'DejaVu Sans', sans-serif; font-size: 13px; color: #1A1A1A; line-height: 1.5; }
  .header { border-bottom: 3px solid #147A4F; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 18px; font-weight: 800; margin: 0; color: #1A1A1A; }
  .meta { font-size: 12px; color: #4A4A4A; margin-top: 4px; }
  .section-title { font-size: 14px; font-weight: 700; color: #147A4F; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .status-safe { color: #147A4F; font-weight: 700; }
  .status-unsafe { color: #C0433C; font-weight: 700; }
</style>
</head>
<body>
  <div class="header">
    <h1>${safe(template.name)}</h1>
    <div class="meta">${safe(project.name)} · ${dateStr}</div>
    <div class="meta">${questionnaire.is_safe_for_use === false ? '<span class="status-unsafe">არ არის უსაფრთხო</span>' : '<span class="status-safe">უსაფრთხოა</span>'}</div>
  </div>

  <div class="section-title">დასკვნა</div>
  <div style="font-size:13px;color:#1A1A1A;margin-bottom:16px;">${safe(questionnaire.conclusion_text) || '—'}</div>

  <div class="section-title">შეკითხვები და პასუხები</div>
  ${questionsHtml}

  <div class="section-title">ხელმოწერები</div>
  ${sigsHtml}
  ${signatureSvg ? `<div style="margin-top:8px;">${signatureSvg}</div>` : ''}

  <div class="section-title">სერტიფიკატები</div>
  ${certsHtml}
</body>
</html>`;
}
