import type { ScaffoldSupervisionOrderFormData } from '../../../types/models';
import { escHtml, fmtDate, renderBlankSignatureRows } from './_shared';

export interface ScaffoldSupervisionOrderPdfArgs {
  formData: ScaffoldSupervisionOrderFormData;
  projectName: string;
  /** Director's captured signature (base64 PNG) from the success screen; falls
   *  back to `formData.directorSignature`. The responsible-person block stays
   *  blank (hand-signed on the printed copy). */
  directorSignatureBase64?: string | null;
  /** Extra blank hand-sign slots added on the success screen. */
  extraSignatureRows?: number;
}

/**
 * Builds HTML for "სამშენებლო ობიექტზე ხარაჩოს უსაფრთხო ექსპლუატაციაზე
 * ზედამხედველი პირის გამოყოფის შესახებ" — the director's order appointing a
 * scaffolding-supervision responsible person. Body text mirrors the
 * authoritative source (duties ა–ე). No certificate/equipment/photo blocks.
 */
export function buildScaffoldSupervisionOrderHtml({
  formData: f,
  directorSignatureBase64,
  extraSignatureRows,
}: ScaffoldSupervisionOrderPdfArgs): string {
  const directorSig = directorSignatureBase64 ?? f.directorSignature;
  const orderDate = fmtDate(f.orderDate);

  const sigImg = (b64: string | null | undefined, label: string) =>
    b64
      ? `<img src="data:image/png;base64,${escHtml(b64)}" alt="${label}" style="max-height:60pt;max-width:180pt;display:block;margin:4pt auto;"/>`
      : `<span class="sig-underline"></span>`;

  const sigDate = (iso: string | null | undefined) =>
    iso ? escHtml(new Date(iso).toLocaleDateString('ka-GE')) : '<span class="sig-underline"></span>';

  return `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  @page { size: A4; margin: 20mm 25mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Sylfaen", "DejaVu Serif", serif;
    font-size: 11pt;
    color: #000;
    line-height: 1.55;
    /* Bottom clearance for the injected security stamp (position:fixed, bottom:8px). */
    padding-bottom: 12mm;
  }
  .company-header {
    text-align: center;
    font-size: 13pt;
    font-weight: bold;
    margin-bottom: 14pt;
  }
  h1 {
    font-size: 16pt;
    font-weight: bold;
    text-align: center;
    letter-spacing: 6pt;
    margin-bottom: 6pt;
  }
  h2 {
    font-size: 11pt;
    font-weight: normal;
    text-align: center;
    margin-bottom: 16pt;
  }
  .header-line {
    display: flex;
    justify-content: space-between;
    margin-bottom: 18pt;
    font-size: 11pt;
  }
  .legal-basis {
    font-size: 10.5pt;
    font-style: italic;
    margin-bottom: 10pt;
    text-align: justify;
  }
  .decree-cmd {
    font-size: 13pt;
    font-weight: bold;
    text-align: center;
    letter-spacing: 4pt;
    margin: 10pt 0;
  }
  .appointment {
    margin-bottom: 12pt;
    text-align: justify;
  }
  table.info-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14pt;
    font-size: 10.5pt;
  }
  table.info-table td {
    border: 1px solid #000;
    padding: 4pt 8pt;
    vertical-align: top;
  }
  table.info-table td:first-child {
    font-weight: bold;
    width: 42%;
  }
  .section-title {
    font-size: 11pt;
    font-weight: bold;
    margin-bottom: 6pt;
    margin-top: 14pt;
  }
  ol.duties {
    list-style: none;
    padding-left: 16pt;
    margin-top: 4pt;
  }
  ol.duties li {
    padding-left: 0;
    margin-bottom: 6pt;
    text-align: justify;
  }
  .confirm {
    margin-top: 14pt;
    margin-bottom: 6pt;
    text-align: justify;
  }
  .confirm-effective {
    font-style: italic;
    margin-bottom: 10pt;
  }
  table.signature-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20pt;
    font-size: 10.5pt;
  }
  table.signature-table td {
    border: 1px solid #000;
    padding: 8pt;
    vertical-align: bottom;
    text-align: center;
    width: 50%;
  }
  .sig-underline {
    border-bottom: 1px solid #000;
    display: inline-block;
    width: 80%;
    min-height: 18pt;
  }
  .sig-label {
    font-size: 9pt;
    color: #555;
    display: block;
    margin-top: 2pt;
  }
  .sig-role {
    font-weight: bold;
    margin-bottom: 6pt;
  }
  .footer {
    /* Normal flow: iOS WKWebView does not reliably reserve the @page bottom
       margin for position:fixed, so a page-filling signature block collided
       with the footer. Flowed like the other doc PDFs. */
    margin-top: 28pt;
    border-top: 0.5px solid #ccc;
    padding-top: 4pt;
    font-size: 8.5pt;
    color: #555;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>

<div class="company-header">${escHtml(f.companyName)}</div>

<h1>დ ი რ ე ქ ტ ო რ ი ს   ბ რ ძ ა ნ ე ბ ა</h1>
<h2>სამშენებლო ობიექტზე ხარაჩოს უსაფრთხო ექსპლუატაციაზე ზედამხედველი პირის გამოყოფის შესახებ</h2>

<div class="header-line">
  <span>${f.orderNumber ? `№${escHtml(f.orderNumber)}` : ''}${f.city ? ` · ${escHtml(f.city)}` : ''}</span>
  <span>${orderDate} წ.</span>
</div>

<div class="section-title">კომპანიის ინფო</div>
<table class="info-table">
  <tr><td>კომპანიის დასახელება</td><td>${escHtml(f.companyName)}</td></tr>
  <tr><td>ობიექტის მისამართი</td><td>${escHtml(f.objectAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${escHtml(f.directorName)}</td></tr>
</table>

<p class="legal-basis">
  საქართველოს შრომის კოდექსის, სამშენებლო საქმიანობაში უსაფრთხოებისა და შრომის
  დაცვის მოქმედი ნორმატიული მოთხოვნების შესაბამისად, სამშენებლო ობიექტზე ხარაჩოს
  უსაფრთხო ექსპლუატაციის უზრუნველსაყოფად,
</p>

<p class="decree-cmd">ვ ბ რ ძ ა ნ ე ბ:</p>

<p class="appointment">
  „${escHtml(f.companyName)}"-ს მართვასა და ოპერირებაში მყოფ
  ობიექტ(ებ)ზე${f.objectAddress ? ` (${escHtml(f.objectAddress)})` : ''} ხარაჩოს
  ექსპლუატაციის ზედამხედველ, პასუხისმგებელ პირად დაინიშნოს კომპანიის წარმომადგენელი:
</p>

<div class="section-title">ზედამხედველი (პასუხისმგებელი პირი)</div>
<table class="info-table">
  <tr><td>სახელი, გვარი</td><td>${escHtml(f.appointedName)}</td></tr>
  ${f.appointedPosition ? `<tr><td>თანამდებობა</td><td>${escHtml(f.appointedPosition)}</td></tr>` : ''}
  ${f.appointedPhone ? `<tr><td>საკონტ. ტელეფონი</td><td>${escHtml(f.appointedPhone)}</td></tr>` : ''}
</table>

<div class="section-title">პასუხისმგებელ პირს დაევალოს შემდეგი ვალდებულებების შესრულება:</div>
<ol class="duties">
  <li>ა) ხარაჩო ააწყოს მისი მწარმოებლის ინსტრუქციის შესაბამისად;</li>
  <li>ბ) განახორციელოს ხარაჩოს პერიოდული ვიზუალური და ტექნიკური შემოწმება მდგრადობასა და სტაბილურობაზე (არანაკლებ კვირაში ერთხელ); ყოველი შემოწმების შემდეგ შეადგინოს შემოწმების აქტი;</li>
  <li>გ) მკაცრად გააკონტროლოს, რომ არ დაუშვას ობიექტზე კუსტარული ან არასტანდარტული დეტალებით აწყობილი ხარაჩოს ექსპლუატაცია;</li>
  <li>დ) ობიექტზე ხარაჩოზე სამუშაოდ დაუშვას მხოლოდ სწავლება-ინსტრუქტაჟგავლილი მომუშავე პერსონალი;</li>
  <li>ე) ნებისმიერი გაუმართაობის ან ავარიული სიტუაციის დადგომის შემთხვევაში დაუყოვნებლივ აცნობოს კომპანიის ხელმძღვანელობას და შეაჩეროს სამუშაოები.</li>
</ol>

<p class="confirm">
  წინამდებარე ბრძანების შესრულებაზე კონტროლი დაეკისროს კომპანიის დირექტორს.
</p>
<p class="confirm-effective">ბრძანება ძალაში შედის ხელმოწერის მომენტიდან.</p>

<table class="signature-table">
  <tr>
    <td>
      <div class="sig-role">კომპანიის დირექტორი</div>
      <div>${escHtml(f.directorName)}</div>
      ${sigImg(directorSig, 'Director signature')}
      <span class="sig-label">ხელმოწერა, სახელი გვარი · ${sigDate(f.directorSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">ბრძანების გამცემი</div>
      <span class="sig-label">თარიღი: ${sigDate(f.directorSignedAt)}</span>
    </td>
  </tr>
  <tr>
    <td>
      <div class="sig-role">პასუხისმგებელი პირი</div>
      <div>${escHtml(f.appointedName)}</div>
      ${sigImg(f.appointedSignature, 'Responsible person signature')}
      <span class="sig-label">ხელმოწერა · ${sigDate(f.appointedSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">გაცნობის თარიღი</div>
      <span class="sig-label">${sigDate(f.appointedSignedAt)}</span>
    </td>
  </tr>
</table>
${renderBlankSignatureRows(extraSignatureRows ?? f.signatureExtraRows)}

<div class="footer">
  <span>გვერდი 1 / 1</span>
  <span>ბრძანება №${escHtml(f.orderNumber)} - ხარაჩოს ზედამხედველობა</span>
</div>

</body>
</html>`;
}
