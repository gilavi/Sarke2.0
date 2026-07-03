import type { LaborSafetyOrderFormData } from '../../../types/models';
import { escHtml, fmtDate, renderBlankSignatureRows } from './_shared';

export interface OrderPdfArgs {
  formData: LaborSafetyOrderFormData;
  projectName: string;
  /** Director's captured signature (base64 PNG) from the success screen; falls
   *  back to `formData.directorSignature`. */
  directorSignatureBase64?: string | null;
  /** Extra blank hand-sign slots added on the success screen. */
  extraSignatureRows?: number;
}

/**
 * Builds HTML for "ობიექტზე შრომის უსაფრთხოებაზე პასუხისმგებელი პირის გამოყოფის
 * შესახებ" — appointment of the labor-safety responsible person. Body text
 * (legal basis, responsibility paragraphs) mirrors the authoritative source.
 */
export function buildLaborSafetyOrderHtml({
  formData: f,
  directorSignatureBase64,
  extraSignatureRows,
}: OrderPdfArgs): string {
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
    margin-bottom: 14pt;
    font-size: 11pt;
  }
  .legal-basis {
    font-size: 10.5pt;
    font-style: italic;
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
  .body-para {
    margin-bottom: 8pt;
    text-align: justify;
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
<h2>ობიექტზე შრომის უსაფრთხოებაზე პასუხისმგებელი პირის გამოყოფის შესახებ</h2>

<div class="header-line">
  <span>${f.identificationCode ? `ს/ნ: ${escHtml(f.identificationCode)}` : ''}</span>
  <span>${orderDate} წ.</span>
</div>

<p class="legal-basis">
  სამართლებრივი საფუძველი: საქართველოს ორგანული კანონი „შრომის უსაფრთხოების შესახებ"
  (მათ შორის, მე-7 მუხლი — შრომის უსაფრთხოების სპეციალისტის დანიშვნის თაობაზე) და
  საქართველოს ორგანული კანონი „საქართველოს შრომის კოდექსი".
</p>

<table class="info-table">
  <tr><td>საწარმოს დასახელება</td><td>${escHtml(f.companyName)}</td></tr>
  ${f.identificationCode ? `<tr><td>საიდენტიფიკაციო ნომერი</td><td>${escHtml(f.identificationCode)}</td></tr>` : ''}
  <tr><td>ობიექტის მისამართი</td><td>${escHtml(f.objectAddress)}</td></tr>
  <tr><td>საქმიანობის სფერო</td><td>${escHtml(f.activityField)}</td></tr>
  <tr><td>პასუხისმგებელი პირი</td><td>${escHtml(f.specialistName)}</td></tr>
  <tr><td>თანამდებობა</td><td>შრომის უსაფრთხოების სპეციალისტი</td></tr>
</table>

<p class="body-para">
  საქართველოს ორგანული კანონის „შრომის უსაფრთხოების შესახებ" შესაბამისად, ობიექტზე
  შრომის უსაფრთხოების სპეციალისტად დაინიშნოს ზემოთ ცხრილში მითითებული პირი
  (შემდგომში — „პასუხისმგებელი პირი"), რომელსაც ეკისრება ობიექტზე შრომის
  უსაფრთხოების ნორმების დანერგვისა და მართვის ფუნქცია.
</p>
<p class="body-para">
  პასუხისმგებელმა პირმა უნდა უზრუნველყოს შრომის უსაფრთხოების შესაბამისი
  დოკუმენტაციის (რისკების შეფასება, ინსტრუქციები, უსაფრთხო სამუშაო პირობების
  სტანდარტები) მომზადება და განახლება მოქმედი კანონმდებლობის მოთხოვნათა
  გათვალისწინებით.
</p>
<p class="body-para">
  პასუხისმგებელმა პირმა პერიოდულად, კანონითა და შიდა გეგმით განსაზღვრული ვადებში
  უნდა ჩაატაროს დასაქმებულთა ინსტრუქტაჟი და სწავლება შრომის უსაფრთხოების საკითხებზე,
  ასევე გააკონტროლოს მათი შესრულება პრაქტიკაში.
</p>
<p class="body-para">
  პასუხისმგებელი პირი თავის უფლებამოსილებას ახორციელებს კეთილსინდისიერად,
  კომპეტენტურად და ობიექტურად, კომპანიის და დასაქმებულთა ინტერესების
  პრიორიტეტულობის გათვალისწინებით.
</p>
<p class="body-para">
  ამ ბრძანების საფუძველზე პასუხისმგებელი პირის დანიშვნა არ ათავისუფლებს დამსაქმებელს
  იმ ვალდებულებებისა და პასუხისმგებლობისგან, რომელიც მას ეკისრება საქართველოს მოქმედი
  კანონმდებლობით, მათ შორის „შრომის უსაფრთხოების შესახებ" ორგანული კანონითა და შრომის
  კოდექსით.
</p>
<p class="body-para" style="font-style:italic;">
  ბრძანება ძალაში შედის ხელმოწერისთანავე და მოქმედებს შესაბამისი სამუშაოს/ობიექტის
  ფუნქციონირების მთელი პერიოდის განმავლობაში, შემდგომი ბრძანებით გაუქმებამდე.
  ბრძანებაში ცვლილების ან დამატების შეტანის უფლება აქვს მხოლოდ დირექტორს, ცალკე
  გამოცემული ბრძანების საფუძველზე.
</p>

<table class="signature-table">
  <tr>
    <td>
      <div class="sig-role">დირექტორი</div>
      <div>${escHtml(f.directorName)}</div>
      ${sigImg(directorSig, 'Director signature')}
      <span class="sig-label">ხელმოწერა, სახელი გვარი · ${sigDate(f.directorSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">თარიღი</div>
      <span class="sig-label">${sigDate(f.directorSignedAt)}</span>
    </td>
  </tr>
</table>
${renderBlankSignatureRows(extraSignatureRows ?? f.signatureExtraRows)}

<div class="footer">
  <span>გვერდი 1 / 1</span>
  <span>ბრძანება №${escHtml(f.orderNumber)} - შრომის უსაფრთხოების პასუხისმგებელი</span>
</div>

</body>
</html>`;
}
