import type { FireSafetyOrderFormData } from '../../../types/models';
import { escHtml, fmtDate, renderBlankSignatureRows } from './_shared';

export interface FireSafetyOrderPdfArgs {
  formData: FireSafetyOrderFormData;
  projectName: string;
  /** Director's captured signature (base64 PNG) from the success screen; falls
   *  back to `formData.directorSignature`. The appointed-person block stays
   *  blank (hand-signed on the printed copy). */
  directorSignatureBase64?: string | null;
  /** Extra blank hand-sign slots added on the success screen. */
  extraSignatureRows?: number;
}

/**
 * Builds HTML for "სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნის
 * შესახებ". Body text (legal basis, duties ა–ი) mirrors the authoritative
 * source document.
 */
export function buildFireSafetyOrderHtml({
  formData: f,
  directorSignatureBase64,
  extraSignatureRows,
}: FireSafetyOrderPdfArgs): string {
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
    width: 40%;
  }
  .section-title {
    font-size: 11pt;
    font-weight: bold;
    margin-bottom: 6pt;
    margin-top: 14pt;
  }
  ul.legal-basis {
    list-style: none;
    padding-left: 0;
    margin-bottom: 10pt;
  }
  ul.legal-basis li {
    padding-left: 18pt;
    text-indent: -18pt;
    margin-bottom: 4pt;
    text-align: justify;
  }
  ul.legal-basis li::before {
    content: "• ";
    font-weight: bold;
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
  .confirm-effective {
    margin-top: 14pt;
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

<h1>ბ რ ძ ა ნ ე ბ ა</h1>
<h2>სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>

<div class="header-line">
  <span>${f.city ? `ქ. ${escHtml(f.city)}` : ''}</span>
  <span>${orderDate} წ.</span>
</div>

<div class="section-title">კომპანიის ინფო</div>
<table class="info-table">
  <tr><td>კომპანიის დასახელება</td><td>${escHtml(f.companyName)}</td></tr>
  ${f.identificationCode ? `<tr><td>საიდენტიფიკაციო კოდი</td><td>${escHtml(f.identificationCode)}</td></tr>` : ''}
  <tr><td>იურიდიული მისამართი</td><td>${escHtml(f.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${escHtml(f.directorName)}</td></tr>
</table>

<div class="section-title">სამართლებრივი საფუძველი</div>
<ul class="legal-basis">
  <li>„საზოგადოებრივი უსაფრთხოების შესახებ" საქართველოს კანონი;</li>
  <li>საქართველოს მთავრობის 2015 წლის 23 ივლისის №370 დადგენილება (სახანძრო უსაფრთხოების წესები);</li>
  <li>„შრომის უსაფრთხოების შესახებ" საქართველოს ორგანული კანონის მე-5 მუხლი.</li>
</ul>

<p class="decree-cmd">ვ ბ რ ძ ა ნ ე ბ:</p>

<p class="appointment">
  <strong>1.</strong> ობიექტზე — <strong>„${escHtml(f.objectName)}"</strong>${f.objectAddress ? `, ${escHtml(f.objectAddress)}` : ''} —
  სახანძრო უსაფრთხოებაზე პასუხისმგებელ პირად დაინიშნოს
  <strong>${escHtml(f.appointedName)}</strong>${f.appointedPhone ? `, ტელეფონის N: ${escHtml(f.appointedPhone)}` : ''}.
</p>

<div class="section-title">2. პასუხისმგებელ პირს დაევალოს:</div>
<ol class="duties">
  <li>ა) ობიექტის სახანძრო უსაფრთხოების წესების შემუშავება, დანერგვა და მათი დაცვის კონტროლი;</li>
  <li>ბ) ცეცხსაქრების ყოველთვიური ვიზუალური შემოწმება და წელიწადში ერთხელ — ტექნიკური მომსახურება/გადატენვა აკრედიტებულ კომპანიაში;</li>
  <li>გ) სახანძრო ნიშნების, ევაკუაციის გეგმისა და საევაკუაციო გასასვლელების, მარშრუტების უზრუნველყოფა და კონტროლი;</li>
  <li>დ) სახანძრო სისტემის (კვამლის დეტექტორი, განგაშის საყვირი, ავარიული ნათება, საევაკუაციო მიმართულების მანათობელი ნიშნები, ავარიული ციმციმა, ხმოვანი სიგნალი) ასეთის არსებობის შემთხვევაში სრული პერიოდული შემოწმება არაუმეტეს 6 თვეში ერთხელ შესაბამისი კომპეტენციის მქონე პირის/კომპანიის დახმარებით; აგრეთვე ნებისმიერი ისეთი სიტუაციის წარმოქმნისას, რომელსაც შეუძლია სახანძრო სისტემაზე უარყოფითი გავლენის მოხდენა (მაგ.: მექანიკური დაზიანება, რემონტი და ა.შ.);</li>
  <li>ე) ადვილად აალებადი მასალების, ნივთიერებების შენახვისა და ექსპლუატაციის წესების კონტროლი (ასეთის არსებობის შემთხვევაში);</li>
  <li>ვ) ცხელი სამუშაოების (შედუღება, აბრაზიული ჭრა, ღია ცეცხლი) დაშვებისას ნებართვის (Permit to Work) გაცემა და ცეცხმაქრის ადგილზე უზრუნველყოფა;</li>
  <li>ზ) ხანძრის წარმოშობის შემთხვევაში — საგანგებო სიტუაციების მართვის სამსახურის (112) მყისიერი ინფორმირება, ევაკუაციის ხელმძღვანელობა და მოკვლევაში მონაწილეობა;</li>
  <li>თ) პერიოდულად შეამოწმოს პირველადი დახმარების საშუალებები და საჭიროების შემთხვევაში დროულად მოახდინოს მათი შევსება საჭირო ინვენტარით;</li>
  <li>ი) საჭირო პერიოდულობით შეამოწმოს ჰიდრანტები (ასეთის არსებობის შემთხვევაში) შესაბამისი კომპეტენციის მქონე პირის/კომპანიის დახმარებით.</li>
</ol>

<p class="confirm-effective">ბრძანება ძალაში შედის ხელმოწერის დღიდან.</p>

<table class="signature-table">
  <tr>
    <td>
      <div class="sig-role">დირექტორი</div>
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
      <div class="sig-role">დანიშნული პასუხისმგებელი პირი</div>
      <div>${escHtml(f.appointedName)}</div>
      ${sigImg(f.appointedSignature, 'Appointed person signature')}
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
  <span>ბრძანება №${escHtml(f.orderNumber)} - სახანძრო უსაფრთხოება</span>
</div>

</body>
</html>`;
}
