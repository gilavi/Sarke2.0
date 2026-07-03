import type { FireSafetyOrderEnterpriseFormData } from '../../../types/models';
import { escHtml, fmtDate } from './_shared';

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
    /* Bottom clearance for the injected security stamp (position:fixed, bottom:8px). */
    padding-bottom: 12mm;
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
    (თანამდებობა - ${escHtml(f.appointedPosition)}, პირადი №${escHtml(f.appointedIdNumber)}),
    ტელ.: ${escHtml(f.appointedPhone)},
    დაინიშნოს სახანძრო უსაფრთხოებაზე პასუხისმგებელ პირად ობიექტზე -
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
      <li>ხანძრის შემთხვევაში - 112-ის გამოძახება, თანამშრომლების ევაკუაცია, ხელმძღვანელობის ინფორმირება და ინციდენტის დოკუმენტირება.</li>
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
  <span>ბრძანება №${escHtml(f.orderNumber)} - სახანძრო უსაფრთხოება (საწარმო)</span>
</div>

</body>
</html>`;
}

