function s(t){return t?new Date(t).toLocaleDateString("ka-GE",{day:"2-digit",month:"2-digit",year:"numeric"}):"___________"}function e(t){return t?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function o(t){const l=window.open("","_blank","noopener,noreferrer");l&&(l.document.write(t),l.document.close())}const n=`
  @page { size: A4; margin: 20mm 25mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Sylfaen", "DejaVu Serif", Georgia, serif; font-size: 11pt; color: #000; line-height: 1.55; }
  h1 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 4pt; }
  h2 { font-size: 12pt; font-weight: bold; text-align: center; margin-bottom: 16pt; }
  .header-line { display: flex; justify-content: space-between; margin-bottom: 20pt; }
  table.company-info { width: 100%; border-collapse: collapse; margin-bottom: 18pt; font-size: 10.5pt; }
  table.company-info td { border: 1px solid #000; padding: 4pt 8pt; vertical-align: top; }
  table.company-info td:first-child { font-weight: bold; width: 40%; }
  .section-title { font-size: 11pt; font-weight: bold; margin-bottom: 6pt; margin-top: 14pt; text-decoration: underline; }
  ul.legal-basis { list-style: none; padding-left: 0; margin-bottom: 16pt; }
  ul.legal-basis li { padding-left: 18pt; text-indent: -18pt; margin-bottom: 4pt; }
  ul.legal-basis li::before { content: "• "; font-weight: bold; }
  .decree-title { font-size: 12pt; font-weight: bold; text-align: center; margin-bottom: 10pt; }
  ol.decree { padding-left: 0; list-style: none; counter-reset: decree-counter; }
  ol.decree > li { counter-increment: decree-counter; padding-left: 24pt; text-indent: -24pt; margin-bottom: 8pt; }
  ol.decree > li::before { content: counter(decree-counter) ". "; font-weight: bold; }
  ol.duties { list-style: none; padding-left: 24pt; counter-reset: duty-counter; margin-top: 4pt; }
  ol.duties li { counter-increment: duty-counter; padding-left: 20pt; text-indent: -20pt; margin-bottom: 4pt; }
  ol.duties li::before { content: counter(duty-counter, lower-alpha) ") "; }
  table.signature-table { width: 100%; border-collapse: collapse; margin-top: 20pt; font-size: 10.5pt; }
  table.signature-table th { border: 1px solid #000; padding: 5pt 8pt; text-align: center; font-weight: bold; background: #f5f5f5; }
  table.signature-table td { border: 1px solid #000; padding: 8pt; vertical-align: bottom; text-align: center; }
  .sig-underline { border-bottom: 1px solid #000; display: inline-block; width: 80%; min-height: 18pt; }
  .sig-label { font-size: 9pt; color: #555; display: block; margin-top: 2pt; }
`;function r(t){const l=(i,d)=>i?`<img src="data:image/png;base64,${e(i)}" alt="${d}" style="max-height:56pt;max-width:160pt;display:block;margin:4pt auto;"/>`:'<span class="sig-underline"></span>',a=i=>i?e(new Date(i).toLocaleDateString("ka-GE")):'<span class="sig-underline"></span>';return`<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8"/>
<style>
${n}
.company-header { text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 2pt; }
.company-sub { text-align: center; font-style: italic; font-size: 10.5pt; margin-bottom: 14pt; }
h1 { font-size: 16pt; letter-spacing: 6pt; }
.decree-footer { margin-top: 10pt; font-style: italic; }
table.sig2 { width: 100%; border-collapse: collapse; margin-top: 20pt; font-size: 10.5pt; }
table.sig2 td { border: 1px solid #000; padding: 10pt 8pt; vertical-align: bottom; text-align: center; width: 50%; }
.sig-role { font-weight: bold; margin-bottom: 6pt; }
.footer { position: fixed; bottom: 8mm; left: 25mm; right: 25mm; border-top: 0.5px solid #ccc; padding-top: 4pt; font-size: 8.5pt; color: #555; display: flex; justify-content: space-between; }
ol.duties li::before { content: counter(duty-counter, lower-georgian) ") "; }
</style>
</head>
<body>

<div class="company-header">${e(t.companyName)}</div>
<div class="company-sub">შრომის უსაფრთხოების სამსახური</div>

<h1>ბ რ ძ ა ნ ე ბ ა</h1>
<h2 style="font-weight:normal;">სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>

<div class="header-line">
  <span>ქ. ${e(t.city)}</span>
  <span>${s(t.orderDate)} წ.</span>
</div>

<table class="company-info">
  <tr><td>კომპანიის დასახელება</td><td>${e(t.companyName)}</td></tr>
  <tr><td>საიდენტიფიკაციო კოდი</td><td>${e(t.identificationCode)}</td></tr>
  <tr><td>იურიდიული მისამართი</td><td>${e(t.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${e(t.directorName)}</td></tr>
</table>

<div class="section-title">სამართლებრივი საფუძველი</div>
<ul class="legal-basis">
  <li>„საზოგადოებრივი უსაფრთხოების შესახებ" საქართველოს კანონი;</li>
  <li>საქართველოს მთავრობის 2015 წლის 23 ივლისის №370 დადგენილება;</li>
  <li>„შრომის უსაფრთხოების შესახებ" საქართველოს ორგანული კანონის მე-5 მუხლი.</li>
</ul>

<p class="decree-title">ვ ბ რ ძ ა ნ ე ბ:</p>
<ol class="decree">
  <li>
    <strong>${e(t.appointedName)}</strong>, ტელ.: ${e(t.appointedPhone)},
    დაინიშნოს სახანძრო უსაფრთხოებაზე პასუხისმგებელ პირად ობიექტზე -
    <strong>„${e(t.objectName)}"</strong>${t.objectAddress?`, ${e(t.objectAddress)}`:""}.
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
      <li>ხანძრის შემთხვევაში - 112-ის გამოძახება, თანამშრომლების ევაკუაცია, ხელმძღვანელობის ინფორმირება და ინციდენტის დოკუმენტირება.</li>
    </ol>
  </li>
  <li>ობიექტზე უზრუნველყოფილ იქნეს სახანძრო-ევაკუაციური ნიშნების, განათებული გამოსასვლელების, პირველადი ხანძარსაწინააღმდეგო საშუალებებისა და სიგნალიზაციის ყოველდღიური მზადყოფნა.</li>
</ol>
<p class="decree-footer">ბრძანება ძალაში შედის ხელმოწერის დღიდან.</p>

<table class="sig2" style="margin-top:24pt;">
  <tr>
    <td>
      <div class="sig-role">დირექტორი</div>
      <div>${e(t.directorName)}</div>
      ${l(t.directorSignature,"Director signature")}
      <span class="sig-label">ხელმოწერა · ${a(t.directorSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">ბრძანების გამცემი</div>
      <span class="sig-label">თარიღი: ${a(t.directorSignedAt)}</span>
    </td>
  </tr>
  <tr>
    <td>
      <div class="sig-role">დანიშნული პასუხისმგებელი პირი</div>
      <div>${e(t.appointedName)}</div>
      ${l(t.appointedSignature,"Appointed person signature")}
      <span class="sig-label">ხელმოწერა · ${a(t.appointedSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">გაცნობის თარიღი</div>
      <span class="sig-label">${a(t.appointedSignedAt)}</span>
    </td>
  </tr>
</table>

<div class="footer">
  <span>გვერდი 1 / 1</span>
  <span>ბრძანება №${e(t.orderNumber)} - სახანძრო უსაფრთხოება</span>
</div>

</body>
</html>`}function p(t){const l=(i,d)=>i?`<img src="data:image/png;base64,${e(i)}" alt="${d}" style="max-height:56pt;max-width:160pt;display:block;margin:4pt auto;"/>`:'<span class="sig-underline"></span>',a=i=>i?e(new Date(i).toLocaleDateString("ka-GE")):'<span class="sig-underline"></span>';return`<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8"/>
<style>
${n}
.company-header { text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 2pt; }
.company-sub { text-align: center; font-style: italic; font-size: 10.5pt; margin-bottom: 14pt; }
h1 { font-size: 16pt; letter-spacing: 6pt; }
table.sig2 { width: 100%; border-collapse: collapse; margin-top: 20pt; font-size: 10.5pt; }
table.sig2 td { border: 1px solid #000; padding: 10pt 8pt; vertical-align: bottom; text-align: center; width: 50%; }
.sig-role { font-weight: bold; margin-bottom: 6pt; }
.footer { position: fixed; bottom: 8mm; left: 25mm; right: 25mm; border-top: 0.5px solid #ccc; padding-top: 4pt; font-size: 8.5pt; color: #555; display: flex; justify-content: space-between; }
ol.duties li::before { content: counter(duty-counter, lower-georgian) ") "; }
</style>
</head>
<body>

<div class="company-header">${e(t.companyName)}</div>
<div class="company-sub">შრომის უსაფრთხოების სამსახური</div>

<h1>ბ რ ძ ა ნ ე ბ ა</h1>
<h2 style="font-weight:normal;">საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>

<div class="header-line">
  <span>ქ. ${e(t.city)}</span>
  <span>${s(t.orderDate)} წ.</span>
</div>

<table class="company-info">
  <tr><td>კომპანიის დასახელება</td><td>${e(t.companyName)}</td></tr>
  <tr><td>საიდენტიფიკაციო კოდი</td><td>${e(t.identificationCode)}</td></tr>
  <tr><td>იურიდიული მისამართი</td><td>${e(t.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${e(t.directorName)}</td></tr>
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
    <strong>${e(t.appointedName)}</strong>
    (თანამდებობა - ${e(t.appointedPosition)}, პირადი №${e(t.appointedIdNumber)}),
    ტელ.: ${e(t.appointedPhone)},
    დაინიშნოს სახანძრო უსაფრთხოებაზე პასუხისმგებელ პირად ობიექტზე -
    <strong>„${e(t.objectName)}"</strong>${t.objectAddress?`, ${e(t.objectAddress)}`:""}.
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

<table class="sig2" style="margin-top:24pt;">
  <tr>
    <td>
      <div class="sig-role">დირექტორი</div>
      <div>${e(t.directorName)}</div>
      ${l(t.directorSignature,"Director signature")}
      <span class="sig-label">ხელმოწერა · ${a(t.directorSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">ბრძანების გამცემი</div>
      <span class="sig-label">თარიღი: ${a(t.directorSignedAt)}</span>
    </td>
  </tr>
  <tr>
    <td>
      <div class="sig-role">დანიშნული პასუხისმგებელი პირი</div>
      <div>${e(t.appointedName)}</div>
      ${l(t.appointedSignature,"Appointed person signature")}
      <span class="sig-label">ხელმოწერა · ${a(t.appointedSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">გაცნობის თარიღი</div>
      <span class="sig-label">${a(t.appointedSignedAt)}</span>
    </td>
  </tr>
</table>

<div class="footer">
  <span>გვერდი 1 / 1</span>
  <span>ბრძანება №${e(t.orderNumber)} - სახანძრო უსაფრთხოება (საწარმო)</span>
</div>

</body>
</html>`}function c(t){return`<!DOCTYPE html>
<html lang="ka">
<head><meta charset="UTF-8"/>
<style>${n}</style>
</head>
<body>
<h1>ბრძანება №${e(t.orderNumber)}</h1>
<h2>შრომის უსაფრთხოების სპეციალისტის დანიშვნის შესახებ</h2>
<div class="header-line"><span>ქ. ${e(t.city)}</span><span>${s(t.orderDate)} წ.</span></div>
<table class="company-info">
  <tr><td>ორგანიზაციის დასახელება</td><td>${e(t.companyName)}</td></tr>
  <tr><td>საიდენტიფიკაციო კოდი</td><td>${e(t.identificationCode)}</td></tr>
  <tr><td>იურიდიული მისამართი</td><td>${e(t.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${e(t.directorName)}</td></tr>
</table>
<div class="section-title">სამართლებრივი საფუძველი</div>
<ul class="legal-basis">
  <li>საქართველოს ორგანული კანონის „შრომის უსაფრთხოების შესახებ" მე-5 მუხლის პირველი პუნქტი;</li>
  <li>საქართველოს ორგანული კანონის „შრომის უსაფრთხოების შესახებ" მე-5 მუხლის მე-9 პუნქტი;</li>
  <li>საქართველოს მთავრობის 2018 წლის 27 ივლისის №381 დადგენილება;</li>
  <li>კომპანიის წესდება და შიდა დებულებები.</li>
</ul>
<p class="decree-title">ვ ბ რ ძ ა ნ ე ბ:</p>
<ol class="decree">
  <li>ობიექტზე - <strong>„${e(t.facilityName)}"</strong> - შრომის უსაფრთხოების სპეციალისტად დაინიშნოს
    <strong>${e(t.specialistName)}</strong> (პ/ნ ${e(t.specialistPersonalId)}),
    სერტიფიკატი №${e(t.certificateNumber)}, გაცემული ${s(t.certificateDate)}.</li>
  <li>შრომის უსაფრთხოების სპეციალისტი ვალდებულია:
    <ol class="duties">
      <li>რისკის შეფასების დოკუმენტებისა და პრევენციის პოლიტიკის შემუშავება, განახლება და კონტროლი;</li>
      <li>თანამშრომელთა ინსტრუქტაჟების ჩატარება და დოკუმენტირება;</li>
      <li>ინდივიდუალური დამცავი საშუალებებით უზრუნველყოფის კონტროლი;</li>
      <li>სამუშაო ადგილის საფრთხეების იდენტიფიცირება და კონტროლი;</li>
      <li>უბედური შემთხვევების რეგისტრაცია და გამოძიება;</li>
      <li>სამუშაო ობიექტის პერიოდული შემოწმება;</li>
      <li>ანგარიშის წარდგენა დამსაქმებლისათვის.</li>
    </ol>
  </li>
  <li>შრომის უსაფრთხოების სპეციალისტი უშუალოდ ექვემდებარება კომპანიის დირექტორს.</li>
  <li>ბრძანება ძალაში შედის ხელმოწერის დღიდან.</li>
</ol>
<p style="margin-top:20pt;font-weight:bold;">გაცნობა</p>
<table class="signature-table">
  <tr><th>როლი</th><th>სახელი, გვარი</th><th>ხელმოწერა</th><th>თარიღი</th></tr>
  <tr>
    <td>დირექტორი</td><td>${e(t.directorName)}</td>
    <td><span class="sig-underline"></span></td><td><span class="sig-underline"></span></td>
  </tr>
  <tr>
    <td>დანიშნული სპეციალისტი</td><td>${e(t.specialistName)}</td>
    <td><span class="sig-underline"></span></td><td><span class="sig-underline"></span></td>
  </tr>
</table>
</body>
</html>`}function g(t){return`<!DOCTYPE html>
<html lang="ka">
<head><meta charset="UTF-8"/>
<style>${n}</style>
</head>
<body>
<h1>ბრძანება №${e(t.orderNumber)}</h1>
<h2>ალკოჰოლური და ნარკოტიკული თრობის კონტროლზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>
<div class="header-line"><span>ქ. ${e(t.city)}</span><span>${s(t.orderDate)} წ.</span></div>
<table class="company-info">
  <tr><td>ორგანიზაციის დასახელება</td><td>${e(t.companyName)}</td></tr>
  <tr><td>საიდენტიფიკაციო კოდი</td><td>${e(t.identificationCode)}</td></tr>
  <tr><td>იურიდიული მისამართი</td><td>${e(t.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${e(t.directorName)}</td></tr>
</table>
<div class="section-title">სამართლებრივი საფუძველი</div>
<ul class="legal-basis">
  <li>„შრომის უსაფრთხოების შესახებ" საქართველოს ორგანული კანონის მე-5 მუხლი;</li>
  <li>საქართველოს შრომის კოდექსის 47-ე და 48-ე მუხლები;</li>
  <li>საქართველოს მთავრობის 2018 წლის 27 ივლისის №381 დადგენილება;</li>
  <li>კომპანიის შინაგანაწესი.</li>
</ul>
<p class="decree-title">ვ ბ რ ძ ა ნ ე ბ:</p>
<ol class="decree">
  <li>ობიექტზე - <strong>„${e(t.facilityName)}"</strong> - ალკოჰოლური, ნარკოტიკული და ფსიქოტროპული საშუალებებით თრობის კონტროლზე პასუხისმგებელ პირად დაინიშნოს
    <strong>${e(t.responsiblePersonName)}</strong>
    (თანამდებობა - ${e(t.responsiblePersonPosition)}, პირადი №${e(t.responsiblePersonPersonalId)}).</li>
  <li>პასუხისმგებელ პირს დაევალოს:
    <ol class="duties">
      <li>ყოველდღიური სამორიგეო შემოწმება ცვლის დაწყებამდე;</li>
      <li>თრობის ნიშნების გამოვლენისას - სამუშაოდან ჩამოშორება და ფაქტის ფიქსირება;</li>
      <li>შემოწმების ჟურნალის წარმოება;</li>
      <li>ინფორმირება ნულოვანი ტოლერანტობის პოლიტიკის შესახებ;</li>
      <li>ხელმძღვანელობის ინფორმირება იმავე დღეს;</li>
      <li>სანქციების გამოყენებაზე წინადადების მომზადება.</li>
    </ol>
  </li>
  <li>ობიექტზე მოქმედებს ნულოვანი ტოლერანტობის პოლიტიკა.</li>
  <li>ბრძანება ძალაში შედის ხელმოწერის დღიდან.</li>
</ol>
<table class="signature-table">
  <tr><th>როლი</th><th>სახელი, გვარი</th><th>ხელმოწერა</th><th>თარიღი</th></tr>
  <tr>
    <td>დირექტორი</td><td>${e(t.directorName)}</td>
    <td><span class="sig-underline"></span></td><td><span class="sig-underline"></span></td>
  </tr>
  <tr>
    <td>დანიშნული პასუხისმგებელი პირი</td><td>${e(t.responsiblePersonName)}</td>
    <td><span class="sig-underline"></span></td><td><span class="sig-underline"></span></td>
  </tr>
</table>
</body>
</html>`}export{p as a,r as b,g as c,c as d,o};
