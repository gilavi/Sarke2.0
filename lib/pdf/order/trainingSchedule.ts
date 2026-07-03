import type { TrainingScheduleOrderFormData } from '../../../types/models';
import { escHtml, fmtDate, renderBlankSignatureRows } from './_shared';

export interface TrainingScheduleOrderPdfArgs {
  formData: TrainingScheduleOrderFormData;
  projectName: string;
  /** Director's captured signature (base64 PNG) from the success screen; falls
   *  back to `formData.directorSignature`. */
  directorSignatureBase64?: string | null;
  /** Extra blank hand-sign slots added on the success screen. */
  extraSignatureRows?: number;
}

/**
 * Builds HTML for "სწავლება-ინსტრუქტაჟის გეგმა-გრაფიკი" (training/instruction
 * plan-schedule). Body is fixed legal text from the source document; only the
 * company name + director are variable.
 */
export function buildTrainingScheduleOrderHtml({
  formData: f,
  directorSignatureBase64,
  extraSignatureRows,
}: TrainingScheduleOrderPdfArgs): string {
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
    margin-bottom: 10pt;
  }
  h1 {
    font-size: 15pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 12pt;
  }
  .header-line {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12pt;
    font-size: 11pt;
  }
  .legal-basis {
    font-size: 10.5pt;
    font-style: italic;
    margin-bottom: 10pt;
    text-align: justify;
  }
  .body-para { margin-bottom: 8pt; text-align: justify; }
  .section-title { font-size: 11pt; font-weight: bold; margin: 12pt 0 6pt; }
  ul.topics { padding-left: 20pt; margin-bottom: 10pt; }
  ul.topics li { margin-bottom: 5pt; text-align: justify; }
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
  .sig-label { font-size: 9pt; color: #555; display: block; margin-top: 2pt; }
  .sig-role { font-weight: bold; margin-bottom: 6pt; }
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

<h1>სწავლება-ინსტრუქტაჟის გეგმა-გრაფიკი</h1>

<div class="header-line"><span>${orderDate} წ.</span></div>

<p class="legal-basis">
  სამართლებრივი საფუძველი: საქართველოს ორგანული კანონი „შრომის უსაფრთხოების შესახებ"
  და „საქართველოს შრომის კოდექსი".
</p>

<p class="body-para">
  წინამდებარე გეგმა-გრაფიკი განსაზღვრავს, თუ რა თემატიკაზე და რა პერიოდულობით
  უტარდება დასაქმებულებს სწავლება/ინსტრუქტაჟი შრომის უსაფრთხოების უზრუნველსაყოფად.
</p>
<p class="body-para">
  ობიექტის სიდიდის, დასაქმებულთა რაოდენობის, სამუშაო პირობების, საფრთხის ხარისხისა
  და ხასიათისა და შესაბამისი რისკების გათვალისწინებით, კომპანია უზრუნველყოფს
  დასაქმებულთათვის ქვემოთ მითითებული თემატიკის სწავლება-ინსტრუქტაჟის ჩატარებას:
</p>

<ul class="topics">
  <li>შრომის უსაფრთხოების უზრუნველსაყოფად სამართლებრივი ნორმებისა და უსაფრთხოების პრინციპების შესახებ;</li>
  <li>საგანგებო სიტუაციების, საევაკუაციო ღონისძიებების და მათი განხორციელების წესის შესახებ;</li>
  <li>არსებული საფრთხისა და რისკის, ასევე მათი კონტროლის მიზნით გატარებული ღონისძიებების შესახებ;</li>
  <li>სწორი ერგონომიკული დისციპლინის დაცვის შესახებ;</li>
  <li>სამუშაო ტექნიკისა / აღჭურვილობის უსაფრთხო გამოყენების წესების შესახებ;</li>
  <li>ელექტრო უსაფრთხოება / ტვირთის სწორი ჩაბმა, გადადგილება და განთავსება / უსაფრთხოების ნიშნების მნიშვნელობა და განთავსების წესი და ა.შ.</li>
</ul>

<div class="section-title">სწავლება-ინსტრუქტაჟი ტარდება კომპანიის შრომის უსაფრთხოების სპეციალისტის მიერ:</div>
<ul class="topics">
  <li>დასაქმებულის სამუშაო პროცედურების დაწყებამდე;</li>
  <li>დასაქმებულის სამუშაოზე პირველად დაშვებამდე (შესავალი და პირველადი ინსტრუქტაჟი);</li>
  <li>სამუშაო ადგილის, სამუშაო პროცესის, ტექნოლოგიის, დანადგარის, ხელსაწყოს ან გამოყენებული მასალების ცვლილების შემთხვევაში;</li>
  <li>ახალ სამუშაოზე, ახალ პოზიციაზე ან სხვა სამუშაო ადგილზე გადაყვანისას;</li>
  <li>ახალი საფრთხეების ან პროფესიული რისკების გამოვლენის შემთხვევაში;</li>
  <li>უბედური შემთხვევის, სახიფათო ინციდენტის ან ავარიული სიტუაციის შემდეგ;</li>
  <li>თუ გამოვლინდა, რომ დასაქმებული არ იცავს შრომის უსაფრთხოების მოთხოვნებს, არასწორად ასრულებს სამუშაოს ან არასაკმარისად ფლობს უსაფრთხო სამუშაო მეთოდებს — უტარდება განმეორებითი (არაგეგმური) ინსტრუქტაჟი;</li>
  <li>სამუშაოში ხანგრძლივი შეწყვეტის შემდეგ, თუ უსაფრთხო მუშაობის ცოდნის განახლება აუცილებელია;</li>
  <li>კანონმდებლობით, დამსაქმებლის შიდა წესებით ან პასუხისმგებელი პირის გადაწყვეტილებით განსაზღვრულ სხვა შემთხვევებში.</li>
</ul>

<p class="body-para">
  განმეორებითი ინსტრუქტაჟი ტარდება არანაკლებ 3 თვეში ერთხელ, ან საჭიროებისამებრ
  უფრო ხშირად.
</p>
<p class="body-para">
  სწავლება და ინსტრუქტაჟი ტარდება სამუშაო საათებში. ამ მიზნით გაცდენილი დღეები
  საპატიოდ ითვლება და ანაზღაურდება დამსაქმებლის მიერ; სწავლება/ინსტრუქტაჟი
  დასაქმებულთათვის უფასოა.
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
  <span>სწავლება-ინსტრუქტაჟის გეგმა-გრაფიკი</span>
</div>

</body>
</html>`;
}
