import type { LaborSafetyOrderFormData } from '../../../types/models';
import { escHtml, fmtDate } from './_shared';

export interface OrderPdfArgs {
  formData: LaborSafetyOrderFormData;
  projectName: string;
}

/**
 * Builds a plain, document-like HTML string matching the
 * "ბრძანება შრომის უსაფრთხოების სპეციალისტის დანიშვნა" template.
 */
export function buildLaborSafetyOrderHtml({ formData: f }: OrderPdfArgs): string {
  const orderDate = fmtDate(f.orderDate);
  const certDate  = fmtDate(f.certificateDate);

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
  h1 {
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 4pt;
  }
  h2 {
    font-size: 12pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 16pt;
  }
  .header-line {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20pt;
    font-size: 11pt;
  }
  table.company-info {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 18pt;
    font-size: 10.5pt;
  }
  table.company-info td {
    border: 1px solid #000;
    padding: 4pt 8pt;
    vertical-align: top;
  }
  table.company-info td:first-child {
    font-weight: bold;
    width: 40%;
  }
  .section-title {
    font-size: 11pt;
    font-weight: bold;
    margin-bottom: 6pt;
    margin-top: 14pt;
    text-decoration: underline;
  }
  ul.legal-basis {
    list-style: none;
    padding-left: 0;
    margin-bottom: 16pt;
  }
  ul.legal-basis li {
    padding-left: 18pt;
    text-indent: -18pt;
    margin-bottom: 4pt;
  }
  ul.legal-basis li::before {
    content: "• ";
    font-weight: bold;
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
    counter-reset: duty-counter;
    margin-top: 4pt;
  }
  ol.duties li {
    counter-increment: duty-counter;
    padding-left: 20pt;
    text-indent: -20pt;
    margin-bottom: 4pt;
  }
  ol.duties li::before {
    content: counter(duty-counter, lower-alpha) ") ";
  }
  table.signature-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20pt;
    font-size: 10.5pt;
  }
  table.signature-table th {
    border: 1px solid #000;
    padding: 5pt 8pt;
    text-align: center;
    font-weight: bold;
    background: #f5f5f5;
  }
  table.signature-table td {
    border: 1px solid #000;
    padding: 16pt 8pt 5pt;
    vertical-align: bottom;
    text-align: center;
  }
  .sig-underline {
    border-bottom: 1px solid #000;
    display: inline-block;
    width: 100%;
    min-height: 18pt;
  }
  .sig-label {
    font-size: 9pt;
    color: #555;
    display: block;
    margin-top: 2pt;
  }
</style>
</head>
<body>

<!-- Order number + title -->
<h1>ბრძანება №${escHtml(f.orderNumber)}</h1>
<h2>შრომის უსაფრთხოების სპეციალისტის დანიშვნის შესახებ</h2>

<!-- City / date header -->
<div class="header-line">
  <span>ქ. ${escHtml(f.city)}</span>
  <span>${orderDate} წ.</span>
</div>

<!-- Company info table -->
<table class="company-info">
  <tr>
    <td>ორგანიზაციის დასახელება</td>
    <td>${escHtml(f.companyName)}</td>
  </tr>
  <tr>
    <td>საიდენტიფიკაციო კოდი</td>
    <td>${escHtml(f.identificationCode)}</td>
  </tr>
  <tr>
    <td>იურიდიული მისამართი</td>
    <td>${escHtml(f.legalAddress)}</td>
  </tr>
  <tr>
    <td>დირექტორი</td>
    <td>${escHtml(f.directorName)}</td>
  </tr>
</table>

<!-- Legal basis -->
<div class="section-title">სამართლებრივი საფუძველი</div>
<ul class="legal-basis">
  <li>საქართველოს ორგანული კანონის „შრომის უსაფრთხოების შესახებ" მე-5 მუხლის პირველი პუნქტი (დამსაქმებლის ვალდებულებები);</li>
  <li>საქართველოს ორგანული კანონის „შრომის უსაფრთხოების შესახებ" მე-5 მუხლის მე-9 პუნქტი (დამსაქმებლის ვალდებულება - ჰყავდეს შრომის უსაფრთხოების სპეციალისტი);</li>
  <li>საქართველოს მთავრობის 2018 წლის 27 ივლისის №381 დადგენილება;</li>
  <li>კომპანიის წესდება და შიდა დებულებები.</li>
</ul>

<!-- Decree -->
<p class="decree-title">ვ ბ რ ძ ა ნ ე ბ:</p>
<ol class="decree">
  <li>
    ობიექტზე - <strong>„${escHtml(f.facilityName)}"</strong> - შრომის უსაფრთხოების სპეციალისტად დაინიშნოს
    <strong>${escHtml(f.specialistName)}</strong>
    (პ/ნ ${escHtml(f.specialistPersonalId)}),
    რომელმაც გაიარა აკრედიტებული პროგრამა და ფლობს სერტიფიკატს №${escHtml(f.certificateNumber)},
    გაცემული ${certDate}.
  </li>
  <li>
    შრომის უსაფრთხოების სპეციალისტი ვალდებულია:
    <ol class="duties">
      <li>რისკის შეფასების დოკუმენტებისა და პრევენციის პოლიტიკის შემუშავება, განახლება და კონტროლი;</li>
      <li>თანამშრომელთა შესავალი, სამუშაო ადგილზე, განმეორებითი და საგანგებო ინსტრუქტაჟების ჩატარება და დოკუმენტირება;</li>
      <li>ინდივიდუალური დამცავი საშუალებებით სრული უზრუნველყოფისა და გაცემის აღრიცხვის კონტროლი;</li>
      <li>სამუშაო ადგილის საფრთხეების იდენტიფიცირება, რისკის შეფასება და საკონტროლო ზომების განხორციელება;</li>
      <li>უბედური შემთხვევების რეგისტრაცია, გამოძიება და კანონით დადგენილ ვადებში შრომის ინსპექციის ინფორმირება;</li>
      <li>სამუშაო ობიექტის პერიოდული შემოწმება და გამოვლენილ დარღვევებზე დაუყოვნებელი რეაგირება;</li>
      <li>ანგარიშის წარდგენა დამსაქმებლისა და სახელმწიფო სამეთვალყურეო სამსახურისათვის.</li>
    </ol>
  </li>
  <li>შრომის უსაფრთხოების სპეციალისტი უშუალოდ ექვემდებარება კომპანიის დირექტორს.</li>
  <li>ბრძანების შესრულებაზე პასუხისმგებლობა დაეკისროს კომპანიის HSE მენეჯერს / დირექტორს.</li>
  <li>წინამდებარე ბრძანება ძალაში შედის ხელმოწერის დღიდან და მოქმედებს ობიექტზე სამუშაოს დასრულებამდე ან ცალკე ბრძანებით გაუქმებამდე.</li>
</ol>

<!-- Signature table -->
<p style="margin-top:20pt; font-weight:bold;">გაცნობა</p>
<p style="margin-bottom:10pt; font-size:10.5pt;">გავეცანი ბრძანებას და ვიღებ ვალდებულებებს:</p>
<table class="signature-table">
  <tr>
    <th>როლი</th>
    <th>სახელი, გვარი</th>
    <th>ხელმოწერა</th>
    <th>თარიღი</th>
  </tr>
  <tr>
    <td>დირექტორი</td>
    <td>${escHtml(f.directorName)}</td>
    <td><span class="sig-underline"></span><span class="sig-label">ხელმოწერა</span></td>
    <td><span class="sig-underline"></span><span class="sig-label">თარიღი</span></td>
  </tr>
  <tr>
    <td>დანიშნული სპეციალისტი</td>
    <td>${escHtml(f.specialistName)}</td>
    <td><span class="sig-underline"></span><span class="sig-label">ხელმოწერა</span></td>
    <td><span class="sig-underline"></span><span class="sig-label">გაცნობის თარიღი</span></td>
  </tr>
</table>

</body>
</html>`;
}

