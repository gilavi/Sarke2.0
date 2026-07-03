import type { CraneTechnicalOrderFormData } from '../../../types/models';
import { escHtml, fmtDate, renderOrderPhoto, renderBlankSignatureRows } from './_shared';

export interface CraneTechnicalOrderPdfArgs {
  formData: CraneTechnicalOrderFormData;
  projectName: string;
  /** Data URLs (from `pdfPhotoEmbed`) for the specialist certificate photo and
   *  the crane inspection-certificate photo; resolved by the caller before this
   *  synchronous builder runs. Null/undefined → the photo block is omitted. */
  certPhotoDataUrl?: string | null;
  inspCertPhotoDataUrl?: string | null;
  /** Director's captured signature (base64 PNG) from the success screen; falls
   *  back to `formData.directorSignature`. The specialist block stays blank
   *  (hand-signed on the printed copy). */
  directorSignatureBase64?: string | null;
  /** Extra blank hand-sign slots added on the success screen. */
  extraSignatureRows?: number;
}

/**
 * Builds HTML for "კოშკურა ამწის ტექნიკური გამართულობაზე პასუხისმგებელი პირის
 * დანიშვნის შესახებ" — the director's order appointing the person responsible
 * for the tower crane's technical fitness + periodic inspections. Body text
 * (legal basis, duties ა–ზ, load tests) mirrors the authoritative source.
 */
export function buildCraneTechnicalOrderHtml({
  formData: f,
  certPhotoDataUrl,
  inspCertPhotoDataUrl,
  directorSignatureBase64,
  extraSignatureRows,
}: CraneTechnicalOrderPdfArgs): string {
  const directorSig = directorSignatureBase64 ?? f.directorSignature;
  const orderDate = fmtDate(f.orderDate);
  const certExpiry = fmtDate(f.craneOperatorCertExpiry);

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
  .duties-intro { margin-bottom: 6pt; }
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
<h2>კოშკურა ამწის ტექნიკური გამართულობაზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>

<div class="header-line">
  <span>${escHtml(f.objectAddress)}</span>
  <span>${orderDate} წ.</span>
</div>

<div class="section-title">კომპანიის ინფო</div>
<table class="info-table">
  <tr><td>კომპანიის დასახელება</td><td>${escHtml(f.companyName)}</td></tr>
  <tr><td>ობიექტის მისამართი</td><td>${escHtml(f.objectAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${escHtml(f.directorName)}</td></tr>
</table>

<p class="legal-basis">
  საქართველოს შრომის კოდექსის, შრომის დაცვისა და სამშენებლო საქმიანობაში მოქმედი
  №429 დადგენილების „ამწე მოწყობილობების მოწყობისა და უსაფრთხო ექსპლუატაციის შესახებ
  ტექნიკური რეგლამენტის" შესაბამისად, კოშკურა ამწის საიმედო და უსაფრთხო
  ექსპლუატაციის უზრუნველსაყოფად,
</p>

<p class="decree-cmd">ვ ბ რ ძ ა ნ ე ბ:</p>

<p class="appointment">
  „${escHtml(f.companyName)}"-ს სამშენებლო ობიექტზე${f.objectAddress ? ` (მის: ${escHtml(f.objectAddress)})` : ''},
  კოშკურა ამწის ტექნიკური გამართულობის უზრუნველყოფასა და მისი პერიოდული შემოწმებების
  ჩატარებაზე პასუხისმგებელ პირად დაინიშნოს შემდეგი პირი:
</p>

<div class="section-title">ტექნიკური პასუხისმგებელი პირი</div>
<table class="info-table">
  <tr><td>სახელი, გვარი</td><td>${escHtml(f.craneOperatorName)}</td></tr>
  <tr><td>პირადობის ნომერი</td><td>${escHtml(f.craneOperatorPersonalId)}</td></tr>
  ${f.craneOperatorQualification ? `<tr><td>კვალიფიკაცია / სპეციალობა</td><td>${escHtml(f.craneOperatorQualification)}</td></tr>` : ''}
  <tr><td>სერტიფიკატის ნომერი</td><td>${escHtml(f.craneOperatorCertNumber)}</td></tr>
  <tr><td>სერტ. მოქმედების ვადა</td><td>${certExpiry}</td></tr>
  ${f.craneOperatorPhone ? `<tr><td>საკონტ. ტელეფონი</td><td>${escHtml(f.craneOperatorPhone)}</td></tr>` : ''}
</table>
${renderOrderPhoto(certPhotoDataUrl, 'სერტიფიკატის ფოტო')}

<div class="section-title">2. პასუხისმგებელ პირს დაევალოს:</div>
<p class="duties-intro">
  ყოველთვიურად (არანაკლებ 30 დღეში ერთხელ) ჩაატაროს კოშკურა ამწის ტექნიკური
  შემოწმება შემდეგი კომპონენტების მიხედვით:
</p>
<ol class="duties">
  <li>ა) მექანიკური და ელექტრო სისტემები (ელექტროძრავები, რედუქტორები, გადაცემათა მექანიზმები);</li>
  <li>ბ) მბრუნავი და გადაადგილების მექანიზმები (მბრუნავი პლატფორმა, სვლითი მექანიზმები, ტვირთამწე ეტლის გადაადგილების სისტემა);</li>
  <li>გ) ტვირთის აწევა-დაწევის მექანიზმი (ლიფტინგის ბარაბანი, ფოლადის ბაგირი (ტროსი), კაუჭი (Hook block));</li>
  <li>დ) სამუხრუჭე სისტემა (სამუხრუჭეების გამართულობა, ავარიული შეჩერების მოწყობილობა);</li>
  <li>ე) ფოლადის ბაგირი (ტროსი) — ცვეთა, დაზიანება, მავთულების გაწყვეტა, დეფორმაცია;</li>
  <li>ვ) ბაგირის დამაგრების კვანძები და სამაგრები (ბუდეები, ჩამკეტები);</li>
  <li>ზ) ტვირთამწე მოწყობილობების უსაფრთხოების ელემენტები (კაუჭის საკეტი, შემაკავებელი და დამცავი მოწყობილობები);</li>
  <li>• აგრეთვე საჭირო პერიოდულობით ჩაატაროს სტატიკური დატვირთვის გამოცდა და დინამიკური დატვირთვის გამოცდა, მოქმედი ნორმებისა და მოთხოვნების შესაბამისად;</li>
  <li>• შემოწმების შედეგად შეადგინოს შესაბამისი აქტი და წარუდგინოს დამსაქმებელს;</li>
  <li>• ნებისმიერი გაუმართაობის, დეფექტის ან საფრთხის გამოვლენის შემთხვევაში დაუყოვნებლივ შეაჩეროს ამწის ექსპლუატაცია და აცნობოს ხელმძღვანელობას.</li>
</ol>

<div class="section-title">კოშკურა ამწის დახასიათება</div>
<table class="info-table">
  ${f.craneModel ? `<tr><td>მოდელი / ტიპი</td><td>${escHtml(f.craneModel)}</td></tr>` : ''}
  ${f.craneNumber ? `<tr><td>ამწის ნომერი</td><td>${escHtml(f.craneNumber)}</td></tr>` : ''}
  ${f.craneMaxLoad ? `<tr><td>მაქს. ასაწევი ტვირთი</td><td>${escHtml(f.craneMaxLoad)} ტ.</td></tr>` : ''}
</table>
${renderOrderPhoto(inspCertPhotoDataUrl, 'ამწის ინსპექტირების სერთიფიკატი')}

<p class="confirm">
  პასუხისმგებელმა პირმა ხელი მოაწეროს წინამდებარე ბრძანების გაცნობისა და
  ვალდებულებების აღების დასტურად.
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
      <div class="sig-role">ტექნიკური პასუხისმგებელი სპეციალისტი</div>
      <div>${escHtml(f.craneOperatorName)}</div>
      ${sigImg(f.operatorSignature, 'Specialist signature')}
      <span class="sig-label">ხელმოწერა · ${sigDate(f.operatorSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">გაცნობის თარიღი</div>
      <span class="sig-label">${sigDate(f.operatorSignedAt)}</span>
    </td>
  </tr>
</table>
${renderBlankSignatureRows(extraSignatureRows ?? f.signatureExtraRows)}

<div class="footer">
  <span>გვერდი 1 / 1</span>
  <span>ბრძანება №${escHtml(f.orderNumber)} - ამწის ტექ. გამართულობა</span>
</div>

</body>
</html>`;
}
