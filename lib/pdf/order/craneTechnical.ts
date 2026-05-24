import type { CraneTechnicalOrderFormData } from '../../../types/models';
import { escHtml, fmtDate } from './_shared';

export interface CraneTechnicalOrderPdfArgs {
  formData: CraneTechnicalOrderFormData;
  projectName: string;
}

/**
 * Builds HTML for "კოშკურა ამწის ტექნიკური გამართულობის...პასუხისმგებელი პირის დანიშვნის შესახებ".
 * Mirrors buildCraneOperatorOrderHtml — same layout, different title, legal basis, field label, and duties.
 */
export function buildCraneTechnicalOrderHtml({ formData: f }: CraneTechnicalOrderPdfArgs): string {
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
  }
  .company-header {
    text-align: center;
    font-size: 13pt;
    font-weight: bold;
    margin-bottom: 2pt;
  }
  .company-sub {
    text-align: center;
    font-style: italic;
    font-size: 10.5pt;
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
    margin-bottom: 20pt;
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
    width: 42%;
  }
  .section-title {
    font-size: 11pt;
    font-weight: bold;
    margin-bottom: 6pt;
    margin-top: 14pt;
    text-decoration: underline;
  }
  .legal-basis {
    font-size: 10.5pt;
    font-style: italic;
    margin-bottom: 14pt;
    margin-top: 10pt;
  }
  .decree-title {
    font-size: 12pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 10pt;
  }
  ol.decree {
    padding-left: 0;
    list-style: none;
    counter-reset: decree-counter;
  }
  ol.decree > li {
    counter-increment: decree-counter;
    padding-left: 24pt;
    text-indent: -24pt;
    margin-bottom: 8pt;
  }
  ol.decree > li::before {
    content: counter(decree-counter) ". ";
    font-weight: bold;
  }
  ol.duties {
    list-style: none;
    padding-left: 24pt;
    margin-top: 6pt;
  }
  ol.duties li {
    padding-left: 0;
    margin-bottom: 5pt;
  }
  .decree-footer {
    margin-top: 10pt;
    font-style: italic;
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
    position: fixed;
    bottom: 10mm;
    left: 25mm;
    right: 25mm;
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
<div class="company-sub">ტექნიკური და სამშენებლო სამსახური</div>

<h1>ბ რ ძ ა ნ ე ბ ა</h1>
<h2>კოშკურა ამწის ტექნიკური გამართულობის უზრუნველყოფასა და პერიოდული შემოწმებების ჩატარებაზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>

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

<p class="legal-basis">საქართველოს შრომის კოდექსის, შრომის დაცვისა და სამშენებლო საქმიანობაში მოქმედი 429 დადგენილების „ამწე მოწყობილობების მოწყობისა და უსაფრთხო ექსპლუატაციის შესახებ ტექნიკური რეგლამენტის" შესაბამისად,</p>

<div class="section-title">ტექნიკური პასუხისმგებელი პირი</div>
<table class="info-table">
  <tr><td>სახელი, გვარი</td><td>${escHtml(f.craneOperatorName)}</td></tr>
  <tr><td>პირადობის ნომერი</td><td>${escHtml(f.craneOperatorPersonalId)}</td></tr>
  ${f.craneOperatorQualification ? `<tr><td>კვალიფიკაცია / სპეციალობა</td><td>${escHtml(f.craneOperatorQualification)}</td></tr>` : ''}
  <tr><td>სერტიფიკატის ნომერი</td><td>${escHtml(f.craneOperatorCertNumber)}</td></tr>
  <tr><td>სერტ. მოქმედების ვადა</td><td>${certExpiry}</td></tr>
  ${f.craneOperatorPhone ? `<tr><td>საკონტ. ტელეფონი</td><td>${escHtml(f.craneOperatorPhone)}</td></tr>` : ''}
</table>

<div class="section-title">ამწის მახასიათებლები</div>
<table class="info-table">
  ${f.craneModel ? `<tr><td>მოდელი / ტიპი</td><td>${escHtml(f.craneModel)}</td></tr>` : ''}
  ${f.craneNumber ? `<tr><td>ამწის ნომერი</td><td>${escHtml(f.craneNumber)}</td></tr>` : ''}
  ${f.craneMaxLoad ? `<tr><td>მაქს. ასაწევი ტვირთი</td><td>${escHtml(f.craneMaxLoad)} ტ.</td></tr>` : ''}
</table>

<p class="decree-title">ვ ბ რ ძ ა ნ ე ბ:</p>
<ol class="decree">
  <li>
    <strong>${escHtml(f.craneOperatorName)}</strong>, პ/ნ ${escHtml(f.craneOperatorPersonalId)},
    სერტ. №${escHtml(f.craneOperatorCertNumber)} (ვადა: ${certExpiry}),
    დაინიშნოს კოშკურა ამწის ტექნიკური გამართულობაზე პასუხისმგებელ პირად ობიექტზე —
    <strong>„${escHtml(f.objectAddress)}"</strong>${f.craneModel ? `, ამწეზე: ${escHtml(f.craneModel)}` : ''}${f.craneNumber ? ` №${escHtml(f.craneNumber)}` : ''}.
    <br/>დაევალოს შემდეგი ვალდებულებები:
    <ol class="duties">
      <li>ა) მექანიკური და ელექტრო სისტემების პერიოდული შემოწმება და ტექნიკური გამართულობის კონტროლი;</li>
      <li>ბ) მბრუნავი და გადაადგილების მექანიზმების (ბრჭყალების, სახსრების, ბლოკების) კვება, შეზეთვა და ცვეთის კონტროლი;</li>
      <li>გ) ტვირთის აწევა-დაწევის მექანიზმის — ლებედკის, ჭოჭოს, კარკასის — ფუნქციონალური შემოწმება;</li>
      <li>დ) სამუხრუჭე სისტემის (სამომჭირავე და სამარჯვე მუხრუჭების) მდგომარეობის შემოწმება და გამართვა;</li>
      <li>ე) ფოლადის ბაგირის (ტროსის) ვიზუალური და ზომითი შემოწმება გაგლეჯებზე, კინკებსა და კოროზიაზე;</li>
      <li>ვ) ბაგირის დამაგრების კვანძების (სარჭების, ბოლო სამჭედელების, ბაგირის გამტარი ბლოკების) მდგომარეობის კონტროლი;</li>
      <li>ზ) ტვირთამწე მოწყობილობების უსაფრთხოების ელექტრო სისტემის (საბოლოო ლიმიტების, დამიწების, ავარიული გათიშვის) შემოწმება.</li>
      <li>• სტატიკური და დინამიკური სატვირთო გამოცდის ჩატარება პერიოდულობის შესაბამისად;</li>
      <li>• შემოწმების შედეგების ასახვა სათანადო აქტში;</li>
      <li>• ამწის გაუმართაობის გამოვლენის შემთხვევაში მისი ექსპლუატაციის დაუყოვნებლივ შეჩერება.</li>
    </ol>
  </li>
  <li>ბრძანების შესრულებაზე პასუხისმგებლობა დაეკისროს კომპანიის ტექნიკურ ხელმძღვანელს / დირექტორს.</li>
  <li>წინამდებარე ბრძანება ძალაში შედის ხელმოწერის დღიდან და მოქმედებს ობიექტზე სამუშაოს დასრულებამდე ან ცალკე ბრძანებით გაუქმებამდე.</li>
</ol>
<p class="decree-footer">ბრძანება ძალაში შედის ხელმოწერის დღიდან.</p>

<table class="signature-table" style="margin-top:24pt;">
  <tr>
    <td>
      <div class="sig-role">კომპანიის დირექტორი</div>
      <div>${escHtml(f.directorName)}</div>
      ${sigImg(f.directorSignature, 'Director signature')}
      <span class="sig-label">ხელმოწერა · ${sigDate(f.directorSignedAt)}</span>
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

<div class="footer">
  <span>გვერდი 1 / 1</span>
  <span>ბრძანება №${escHtml(f.orderNumber)} — ამწის ტექ. გამართულობა</span>
</div>

</body>
</html>`;
}

