import type { AlcoholControlOrderFormData } from '../../../types/models';
import { escHtml, fmtDate } from './_shared';

export interface AlcoholControlPdfArgs {
  formData: AlcoholControlOrderFormData;
  projectName: string;
}

/**
 * Builds a plain, document-style HTML string matching the
 * "ბრძანება ალკოჰოლური და ნარკოტიკული თრობის კონტროლზე პასუხისმგებელი პირის დანიშვნის შესახებ" template.
 */
export function buildAlcoholControlOrderHtml({ formData: f }: AlcoholControlPdfArgs): string {
  const orderDate = fmtDate(f.orderDate);

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

<h1>ბრძანება №${escHtml(f.orderNumber)}</h1>
<h2>ალკოჰოლური და ნარკოტიკული თრობის კონტროლზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>

<div class="header-line">
  <span>ქ. ${escHtml(f.city)}</span>
  <span>${orderDate} წ.</span>
</div>

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

<div class="section-title">სამართლებრივი საფუძველი</div>
<ul class="legal-basis">
  <li>„შრომის უსაფრთხოების შესახებ" საქართველოს ორგანული კანონის მე-5 მუხლი;</li>
  <li>საქართველოს შრომის კოდექსის 47-ე და 48-ე მუხლები;</li>
  <li>საქართველოს მთავრობის 2018 წლის 27 ივლისის №381 დადგენილება (მძიმე, მავნე და საშიშროებიანი სამუშაოები);</li>
  <li>კომპანიის შინაგანაწესი.</li>
</ul>

<p class="decree-title">ვ ბ რ ძ ა ნ ე ბ:</p>
<ol class="decree">
  <li>
    ობიექტზე — <strong>„${escHtml(f.facilityName)}"</strong> — ალკოჰოლური, ნარკოტიკული და ფსიქოტროპული საშუალებებით თრობის კონტროლზე პასუხისმგებელ პირად დაინიშნოს
    <strong>${escHtml(f.responsiblePersonName)}</strong>
    (თანამდებობა — ${escHtml(f.responsiblePersonPosition)}, პირადი №${escHtml(f.responsiblePersonPersonalId)}).
  </li>
  <li>
    პასუხისმგებელ პირს დაევალოს:
    <ol class="duties">
      <li>ყოველდღიური სამორიგეო შემოწმება ცვლის დაწყებამდე — ვიზუალური დათვალიერება და, საჭიროების შემთხვევაში, ალკოტესტერით შემოწმება;</li>
      <li>დასაქმებულის თრობის ნიშნების გამოვლენის შემთხვევაში — სამუშაოდან მისი დაუყოვნებლივი ჩამოშორება და ფაქტის წერილობით ფიქსირება აქტში;</li>
      <li>თრობაზე შემოწმების ჟურნალის წარმოება, აქტების შედგენა და ხელმოწერების უზრუნველყოფა;</li>
      <li>ცვლის დასაწყისში დასაქმებულთა საინფორმაციო შეხვედრის ჩატარება და ინფორმირება ნულოვანი ტოლერანტობის პოლიტიკის შესახებ;</li>
      <li>ფაქტის შესახებ უშუალოდ შრომის უსაფრთხოების სპეციალისტისა და კომპანიის ხელმძღვანელობის ინფორმირება იმავე დღეს;</li>
      <li>სანქციების გამოყენებაზე წინადადების მომზადება — გაფრთხილებიდან შრომითი ხელშეკრულების შეწყვეტამდე.</li>
    </ol>
  </li>
  <li>ობიექტზე მოქმედებს ნულოვანი ტოლერანტობის პოლიტიკა — ალკოჰოლური, ნარკოტიკული ან ფსიქოტროპული საშუალებების ზემოქმედების ქვეშ მყოფი დასაქმებული სამუშაოზე არ დაიშვება.</li>
  <li>ალკოტესტერი და შემოწმების ჟურნალი მუდმივად განთავსდეს ობიექტის შესასვლელთან / სამორიგეო პუნქტში.</li>
  <li>ბრძანების შესრულების კონტროლი დაეკისროს შრომის უსაფრთხოების სპეციალისტს.</li>
  <li>ბრძანება ძალაში შედის ხელმოწერის დღიდან.</li>
</ol>

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
    <td>დანიშნული პასუხისმგებელი პირი</td>
    <td>${escHtml(f.responsiblePersonName)}</td>
    <td><span class="sig-underline"></span><span class="sig-label">ხელმოწერა</span></td>
    <td><span class="sig-underline"></span><span class="sig-label">გაცნობის თარიღი</span></td>
  </tr>
</table>

</body>
</html>`;
}

