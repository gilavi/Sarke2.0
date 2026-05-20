import type { LaborSafetyOrderFormData, AlcoholControlOrderFormData, FireSafetyOrderFormData, FireSafetyOrderEnterpriseFormData, CraneOperatorOrderFormData, CraneTechnicalOrderFormData } from '../types/models';

export interface OrderPdfArgs {
  formData: LaborSafetyOrderFormData;
  projectName: string;
}

function fmtDate(iso: string): string {
  if (!iso) return '___________';
  return new Date(iso).toLocaleDateString('ka-GE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
  <li>საქართველოს ორგანული კანონის „შრომის უსაფრთხოების შესახებ" მე-5 მუხლის მე-9 პუნქტი (დამსაქმებლის ვალდებულება — ჰყავდეს შრომის უსაფრთხოების სპეციალისტი);</li>
  <li>საქართველოს მთავრობის 2018 წლის 27 ივლისის №381 დადგენილება;</li>
  <li>კომპანიის წესდება და შიდა დებულებები.</li>
</ul>

<!-- Decree -->
<p class="decree-title">ვ ბ რ ძ ა ნ ე ბ:</p>
<ol class="decree">
  <li>
    ობიექტზე — <strong>„${escHtml(f.facilityName)}"</strong> — შრომის უსაფრთხოების სპეციალისტად დაინიშნოს
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

export interface FireSafetyOrderPdfArgs {
  formData: FireSafetyOrderFormData;
  projectName: string;
}

/**
 * Builds HTML for "სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნის შესახებ".
 * Signatures (base64 PNG) are embedded directly if present.
 */
export function buildFireSafetyOrderHtml({ formData: f }: FireSafetyOrderPdfArgs): string {
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
    content: counter(duty-counter, lower-georgian) ") ";
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

<!-- Company header -->
<div class="company-header">${escHtml(f.companyName)}</div>
<div class="company-sub">შრომის უსაფრთხოების სამსახური</div>

<!-- Decree title -->
<h1>ბ რ ძ ა ნ ე ბ ა</h1>
<h2>სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>

<!-- City / date -->
<div class="header-line">
  <span>ქ. ${escHtml(f.city)}</span>
  <span>${orderDate} წ.</span>
</div>

<!-- Company info table -->
<table class="company-info">
  <tr><td>კომპანიის დასახელება</td><td>${escHtml(f.companyName)}</td></tr>
  <tr><td>საიდენტიფიკაციო კოდი</td><td>${escHtml(f.identificationCode)}</td></tr>
  <tr><td>იურიდიული მისამართი</td><td>${escHtml(f.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${escHtml(f.directorName)}</td></tr>
</table>

<!-- Legal basis -->
<div class="section-title">სამართლებრივი საფუძველი</div>
<ul class="legal-basis">
  <li>„საზოგადოებრივი უსაფრთხოების შესახებ" საქართველოს კანონი;</li>
  <li>საქართველოს მთავრობის 2015 წლის 23 ივლისის №370 დადგენილება;</li>
  <li>„შრომის უსაფრთხოების შესახებ" საქართველოს ორგანული კანონის მე-5 მუხლი.</li>
</ul>

<!-- Decree body -->
<p class="decree-title">ვ ბ რ ძ ა ნ ე ბ:</p>
<ol class="decree">
  <li>
    <strong>${escHtml(f.appointedName)}</strong>, ტელ.: ${escHtml(f.appointedPhone)},
    დაინიშნოს სახანძრო უსაფრთხოებაზე პასუხისმგებელ პირად ობიექტზე —
    <strong>„${escHtml(f.objectName)}"</strong>${f.objectAddress ? `, ${escHtml(f.objectAddress)}` : ''}.
  </li>
  <li>
    პასუხისმგებელ პირს დაევალოს:
    <ol class="duties">
      <li>ობიექტის სახანძრო-ტექნიკური მდგომარეობის რეგულარული შემოწმება და კონტროლი;</li>
      <li>სახანძრო ევაკუაციის გეგმის შემუშავება, განახლება და ხელმისაწვდომობის უზრუნველყოფა;</li>
      <li>პირველადი სახანძრო-ხანძარსაწინააღმდეგო ინვენტარის (ცეცხლმაქრების, კოლოფების) სათანადო მდგომარეობის კონტროლი;</li>
      <li>თანამშრომელთა სახანძრო უსაფრთხოების ინსტრუქტაჟის ჩატარება ობიექტზე სამუშაოდ დაშვებამდე და ყოველ 6 თვეში;</li>
      <li>სახანძრო სიგნალიზაციისა და ხანძარის ჩაქრობის ავტომატური სისტემების მუშაობის კონტროლი;</li>
      <li>სახანძრო-ევაკუაციური გამოსასვლელებისა და გზების გაწმენდა ყოველგვარი დამაბრკოლებლისაგან;</li>
      <li>სახანძრო სავარჯიშოს (ევაკუაცია) ჩატარება წელიწადში მინიმუმ ერთხელ, ჩანიშვნა ჟურნალში;</li>
      <li>ხანძრის შემთხვევაში — 112-ის გამოძახება, თანამშრომლების ევაკუაცია, ხელმძღვანელობის ინფორმირება და ინციდენტის დოკუმენტირება.</li>
    </ol>
  </li>
  <li>ობიექტზე უზრუნველყოფილ იქნეს სახანძრო-ევაკუაციური ნიშნების, განათებული გამოსასვლელების, პირველადი ხანძარსაწინააღმდეგო საშუალებებისა და სიგნალიზაციის ყოველდღიური მზადყოფნა.</li>
</ol>
<p class="decree-footer">ბრძანება ძალაში შედის ხელმოწერის დღიდან.</p>

<!-- Signature table -->
<table class="signature-table" style="margin-top:24pt;">
  <tr>
    <td>
      <div class="sig-role">დირექტორი</div>
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

<!-- Footer -->
<div class="footer">
  <span>გვერდი 1 / 1</span>
  <span>ბრძანება №${escHtml(f.orderNumber)} — სახანძრო უსაფრთხოება</span>
</div>

</body>
</html>`;
}

export interface FireSafetyOrderEnterprisePdfArgs {
  formData: FireSafetyOrderEnterpriseFormData;
  projectName: string;
}

/**
 * Builds HTML for "საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნის შესახებ".
 * Differs from fire_safety_order: 4 legal bullets, 5 clauses, position + ID fields in clause 1.
 */
export function buildFireSafetyOrderEnterpriseHtml({ formData: f }: FireSafetyOrderEnterprisePdfArgs): string {
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
    content: counter(duty-counter, lower-georgian) ") ";
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
<div class="company-sub">შრომის უსაფრთხოების სამსახური</div>

<h1>ბ რ ძ ა ნ ე ბ ა</h1>
<h2>საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>

<div class="header-line">
  <span>ქ. ${escHtml(f.city)}</span>
  <span>${orderDate} წ.</span>
</div>

<table class="company-info">
  <tr><td>კომპანიის დასახელება</td><td>${escHtml(f.companyName)}</td></tr>
  <tr><td>საიდენტიფიკაციო კოდი</td><td>${escHtml(f.identificationCode)}</td></tr>
  <tr><td>იურიდიული მისამართი</td><td>${escHtml(f.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${escHtml(f.directorName)}</td></tr>
</table>

<div class="section-title">სამართლებრივი საფუძველი</div>
<ul class="legal-basis">
  <li>„საზოგადოებრივი უსაფრთხოების შესახებ" საქართველოს კანონი;</li>
  <li>საქართველოს მთავრობის 2015 წლის 23 ივლისის №370 დადგენილება;</li>
  <li>„შრომის უსაფრთხოების შესახებ" საქართველოს ორგანული კანონის მე-5 მუხლი;</li>
  <li>საქართველოს მთავრობის 2017 წლის 27 ოქტომბრის №477 დადგენილება (სამშენებლო ობიექტებისთვის).</li>
</ul>

<p class="decree-title">ვ ბ რ ძ ა ნ ე ბ:</p>
<ol class="decree">
  <li>
    <strong>${escHtml(f.appointedName)}</strong>
    (თანამდებობა — ${escHtml(f.appointedPosition)}, პირადი №${escHtml(f.appointedIdNumber)}),
    ტელ.: ${escHtml(f.appointedPhone)},
    დაინიშნოს სახანძრო უსაფრთხოებაზე პასუხისმგებელ პირად ობიექტზე —
    <strong>„${escHtml(f.objectName)}"</strong>${f.objectAddress ? `, ${escHtml(f.objectAddress)}` : ''}.
  </li>
  <li>
    პასუხისმგებელ პირს დაევალოს:
    <ol class="duties">
      <li>ობიექტის სახანძრო-ტექნიკური მდგომარეობის რეგულარული შემოწმება და კონტროლი;</li>
      <li>სახანძრო ევაკუაციის გეგმის შემუშავება, განახლება და ხელმისაწვდომობის უზრუნველყოფა;</li>
      <li>საქართველოს მთავრობის №457 დადგენილებით გათვალისწინებული სახანძრო უსაფრთხოების ნორმებისა და მოთხოვნების დაცვის კონტროლი;</li>
      <li>ცეცხლსაშიში სამუშაოებისათვის (შედუღება, ჭრა, სხვ.) ნებართვის (Permit to Work) გაფორმება და კონტროლი;</li>
      <li>სახანძრო უსაფრთხოების ინსტრუქტაჟის ჩატარება, ჟურნალის წარმოება და ხელმოწერების უზრუნველყოფა;</li>
      <li>სახანძრო-ევაკუაციური სავარჯიშოს ჩატარება წელიწადში მინიმუმ ერთხელ, ჩანიშვნა ჟურნალში;</li>
      <li>შეკუმშული გაზების (ჟანგბადი, პროპანი) შენახვისა და გამოყენების სახანძრო უსაფრთხოების წესების კონტროლი;</li>
      <li>ხანძრის შემთხვევაში — 112-ის გამოძახება, თანამშრომლების ევაკუაცია, ხელმძღვანელობის ინფორმირება და ინციდენტის დოკუმენტირება.</li>
    </ol>
  </li>
  <li>ობიექტზე უზრუნველყოფილ იქნეს სახანძრო-ევაკუაციური ნიშნების, განათებული გამოსასვლელების, საევაკუაციო გეგმის, პირველადი ხანძარსაწინააღმდეგო საშუალებებისა და სიგნალიზაციის ყოველდღიური მზადყოფნა.</li>
  <li>ბრძანების შესრულების კონტროლი დაეკისროს შრომის უსაფრთხოების სპეციალისტსა და ობიექტის უფროსს.</li>
  <li>ბრძანება ძალაში შედის ხელმოწერის დღიდან.</li>
</ol>

<table class="signature-table" style="margin-top:24pt;">
  <tr>
    <td>
      <div class="sig-role">დირექტორი</div>
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

<div class="footer">
  <span>გვერდი 1 / 1</span>
  <span>ბრძანება №${escHtml(f.orderNumber)} — სახანძრო უსაფრთხოება (საწარმო)</span>
</div>

</body>
</html>`;
}

export interface CraneOperatorOrderPdfArgs {
  formData: CraneOperatorOrderFormData;
  projectName: string;
}

/**
 * Builds HTML for "კოშკურა ამწის ოპერატორის დანიშვნის შესახებ ბრძანება".
 * Fixed duties list (ა–კ). Signatures embedded as base64 if present.
 */
export function buildCraneOperatorOrderHtml({ formData: f }: CraneOperatorOrderPdfArgs): string {
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
<h2>კოშკურა ამწის ოპერატორის დანიშვნის შესახებ</h2>

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

<div class="section-title">დანიშნული ოპერატორი</div>
<table class="info-table">
  <tr><td>სახელი, გვარი</td><td>${escHtml(f.craneOperatorName)}</td></tr>
  <tr><td>პირადობის ნომერი</td><td>${escHtml(f.craneOperatorPersonalId)}</td></tr>
  ${f.craneOperatorPosition ? `<tr><td>სამუშაო პოზიცია</td><td>${escHtml(f.craneOperatorPosition)}</td></tr>` : ''}
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
    დაინიშნოს კოშკურა ამწის ოპერატორად ობიექტზე —
    <strong>„${escHtml(f.objectAddress)}"</strong>${f.craneModel ? `, ამწეზე: ${escHtml(f.craneModel)}` : ''}${f.craneNumber ? ` №${escHtml(f.craneNumber)}` : ''}.
    <br/>დაევალოს შემდეგი ვალდებულებები:
    <ol class="duties">
      <li>ა) ამწის ექსპლუატაციის წინ ყოველდღიური ვიზუალური შემოწმება — კაბელები, ბოლნები, სამუხრუჭე სისტემა, საბაჟო კონტroლები;</li>
      <li>ბ) ამწის მაქსიმალური ასაწევი ტვირთის (${escHtml(f.craneMaxLoad) || '—'} ტ.) ნორმების გათვალისწინება და ჭარბი დატვირთვის გამორიცხვა;</li>
      <li>გ) ამწის ოპერაციის განხორციელება მხოლოდ სათანადო სიგნალებისა და ბრიგადირის ნებართვის საფუძველზე;</li>
      <li>დ) ობიექტის სამუშაო ზონაში პერსონალის უსაფრთხო განლაგების უზრუნველყოფა ტვირთის ასაწევ/ჩამოსაწევ მომენტში;</li>
      <li>ე) ამინდის არასახარბიელო პირობებისას (ქარი &gt;15 მ/წმ, ელჭექი, მხედველობის მოკლება) სამუშაოს შეჩერება;</li>
      <li>ვ) ამწის ოპერაციის მიმდინარეობის სამუშაო ჟურნალში ყოველდღიური ასახვა;</li>
      <li>ზ) ამწის ნებისმიერი გაუმართაობის (მექანიკური ან ელექტრული) დაუყოვნებლივ შეტყობინება პასუხისმგებელი ლინია;</li>
      <li>თ) ამწის პერიოდული ტექნიკური მომსახურების ვადების დაცვა ობიექტის ტექნიკური სამსახურთან კოორდინაციით;</li>
      <li>ი) ამწის ოპერაციის განხორციელება მხოლოდ ამ ბრძანებით განსაზღვრულ ამწეზე${f.craneNumber ? ` №${escHtml(f.craneNumber)}` : ''};</li>
      <li>კ) ბრძანებით ნაკისრი ვალდებულებების შეუსრულებლობისთვის კანონმდებლობით დადგენილი სრული პასუხისმგებლობის ტვირთის ტარება.</li>
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
      <div class="sig-role">პასუხისმგებელი სპეციალისტი (ოპერატორი)</div>
      <div>${escHtml(f.craneOperatorName)}</div>
      ${sigImg(f.operatorSignature, 'Operator signature')}
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
  <span>ბრძანება №${escHtml(f.orderNumber)} — ამწის ოპერატორის დანიშვნა</span>
</div>

</body>
</html>`;
}

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

function escHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
