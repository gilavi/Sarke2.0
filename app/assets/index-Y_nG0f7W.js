import{k as t,r as x,a3 as Q,a2 as X,ah as Z,Z as J,ao as ee,aj as k}from"./vendor-BMYLj6rE.js";import{c as f,B as v,aM as te,a3 as C,I as c,j as ae,an as ie,aN as ne,r as se,p as le}from"./index-8VpAInaW.js";import{e as re,a8 as oe,af as de,N as ce,X as pe,i as ge,ag as ue,ah as L,ai as B,a4 as M}from"./icons-B-Lph0NP.js";import{P as me}from"./project-picker-DIljhqiM.js";import{S as G}from"./SignatureCanvas-lTRfWOgg.js";import"./rnw-Ctlgrs2k.js";import"./threejs-CZ8NVfN9.js";import"./supabase-DLsv1lFv.js";import"./leaflet-CyNwFjYR.js";function be({steps:e,current:a,className:i}){return t.jsx("div",{className:f("flex items-start",i),children:e.map((o,d)=>{const g=d<a,m=d===a;return t.jsxs(x.Fragment,{children:[t.jsxs("div",{className:"flex flex-col items-center gap-1.5",children:[t.jsx("div",{className:f("flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",g||m?"bg-brand-500 text-white":"bg-neutral-100 text-neutral-400"),children:g?t.jsx(re,{size:14,strokeWidth:2.5}):d+1}),t.jsx("span",{className:f("whitespace-nowrap text-[11px]",g||m?"font-medium text-neutral-700":"text-neutral-400"),children:o})]}),d<e.length-1&&t.jsx("div",{className:f("mt-[15px] h-[2px] flex-1 rounded-full transition-colors",d<a?"bg-brand-500":"bg-neutral-200"),style:{minWidth:20,margin:"15px 6px 0"}})]},d)})})}function he({current:e,total:a,onPrev:i,onNext:o,onFinish:d,isSubmitting:g,prevLabel:m="წინა",nextLabel:u="შემდეგი",finishLabel:N="დასრულება",nextDisabled:r,className:S}){const l=e===0,h=e===a-1;return t.jsxs("div",{className:f("flex shrink-0 items-center justify-between px-4 py-3",S),children:[t.jsxs(v,{variant:"ghost",size:"sm",onClick:i,disabled:l||g,className:f("gap-1.5",l&&"invisible"),children:[t.jsx(oe,{size:16}),m]}),t.jsxs(v,{size:"md",className:"min-w-[140px] gap-1.5",onClick:h?d??o:o,disabled:g||r,children:[g&&t.jsx(de,{size:15,className:"animate-spin"}),h?N:u,!h&&!g&&t.jsx(ce,{size:16})]})]})}function xe({open:e,onClose:a,title:i,steps:o,currentStep:d,children:g,onPrev:m,onNext:u,onFinish:N,isSubmitting:r,nextDisabled:S,finishLabel:l}){return t.jsxs(Q,{opened:e,onClose:a,fullScreen:!0,withCloseButton:!1,closeOnClickOutside:!1,closeOnEscape:!1,padding:0,radius:0,styles:{content:{display:"flex",flexDirection:"column"},body:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:0}},children:[t.jsx("div",{className:"shrink-0 bg-white dark:bg-neutral-900",children:t.jsxs("div",{className:"mx-auto grid max-w-5xl grid-cols-3 items-center px-6 py-4",children:[t.jsx("span",{className:"font-display text-base font-semibold text-neutral-900 dark:text-neutral-100",children:i}),t.jsx("div",{className:"flex justify-center",children:o.length>1&&t.jsx(be,{steps:o,current:d})}),t.jsx("div",{className:"flex justify-end",children:t.jsx(te,{icon:pe,label:"დახურვა",variant:"plain",size:"md",onClick:a})})]})}),t.jsx("div",{className:"flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950",children:t.jsx("div",{className:"mx-auto max-w-2xl px-6 py-8",children:g})}),t.jsx("div",{className:"shrink-0 border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900",children:t.jsx("div",{className:"mx-auto max-w-5xl",children:t.jsx(he,{current:d,total:o.length,onPrev:m,onNext:u,onFinish:N,isSubmitting:r,nextDisabled:S,finishLabel:l})})})]})}function _(e){return e?new Date(e).toLocaleDateString("ka-GE",{day:"2-digit",month:"2-digit",year:"numeric"}):"___________"}function n(e){return e?e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}const D=`
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
`;function je(e){const a=(o,d)=>o?`<img src="data:image/png;base64,${n(o)}" alt="${d}" style="max-height:56pt;max-width:160pt;display:block;margin:4pt auto;"/>`:'<span class="sig-underline"></span>',i=o=>o?n(new Date(o).toLocaleDateString("ka-GE")):'<span class="sig-underline"></span>';return`<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8"/>
<style>
${D}
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

<div class="company-header">${n(e.companyName)}</div>
<div class="company-sub">შრომის უსაფრთხოების სამსახური</div>

<h1>ბ რ ძ ა ნ ე ბ ა</h1>
<h2 style="font-weight:normal;">სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>

<div class="header-line">
  <span>ქ. ${n(e.city)}</span>
  <span>${_(e.orderDate)} წ.</span>
</div>

<table class="company-info">
  <tr><td>კომპანიის დასახელება</td><td>${n(e.companyName)}</td></tr>
  <tr><td>საიდენტიფიკაციო კოდი</td><td>${n(e.identificationCode)}</td></tr>
  <tr><td>იურიდიული მისამართი</td><td>${n(e.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${n(e.directorName)}</td></tr>
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
    <strong>${n(e.appointedName)}</strong>, ტელ.: ${n(e.appointedPhone)},
    დაინიშნოს სახანძრო უსაფრთხოებაზე პასუხისმგებელ პირად ობიექტზე -
    <strong>„${n(e.objectName)}"</strong>${e.objectAddress?`, ${n(e.objectAddress)}`:""}.
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
      <div>${n(e.directorName)}</div>
      ${a(e.directorSignature,"Director signature")}
      <span class="sig-label">ხელმოწერა · ${i(e.directorSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">ბრძანების გამცემი</div>
      <span class="sig-label">თარიღი: ${i(e.directorSignedAt)}</span>
    </td>
  </tr>
  <tr>
    <td>
      <div class="sig-role">დანიშნული პასუხისმგებელი პირი</div>
      <div>${n(e.appointedName)}</div>
      ${a(e.appointedSignature,"Appointed person signature")}
      <span class="sig-label">ხელმოწერა · ${i(e.appointedSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">გაცნობის თარიღი</div>
      <span class="sig-label">${i(e.appointedSignedAt)}</span>
    </td>
  </tr>
</table>

<div class="footer">
  <span>გვერდი 1 / 1</span>
  <span>ბრძანება №${n(e.orderNumber)} - სახანძრო უსაფრთხოება</span>
</div>

</body>
</html>`}function Ne(e){const a=(o,d)=>o?`<img src="data:image/png;base64,${n(o)}" alt="${d}" style="max-height:56pt;max-width:160pt;display:block;margin:4pt auto;"/>`:'<span class="sig-underline"></span>',i=o=>o?n(new Date(o).toLocaleDateString("ka-GE")):'<span class="sig-underline"></span>';return`<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8"/>
<style>
${D}
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

<div class="company-header">${n(e.companyName)}</div>
<div class="company-sub">შრომის უსაფრთხოების სამსახური</div>

<h1>ბ რ ძ ა ნ ე ბ ა</h1>
<h2 style="font-weight:normal;">საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>

<div class="header-line">
  <span>ქ. ${n(e.city)}</span>
  <span>${_(e.orderDate)} წ.</span>
</div>

<table class="company-info">
  <tr><td>კომპანიის დასახელება</td><td>${n(e.companyName)}</td></tr>
  <tr><td>საიდენტიფიკაციო კოდი</td><td>${n(e.identificationCode)}</td></tr>
  <tr><td>იურიდიული მისამართი</td><td>${n(e.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${n(e.directorName)}</td></tr>
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
    <strong>${n(e.appointedName)}</strong>
    (თანამდებობა - ${n(e.appointedPosition)}, პირადი №${n(e.appointedIdNumber)}),
    ტელ.: ${n(e.appointedPhone)},
    დაინიშნოს სახანძრო უსაფრთხოებაზე პასუხისმგებელ პირად ობიექტზე -
    <strong>„${n(e.objectName)}"</strong>${e.objectAddress?`, ${n(e.objectAddress)}`:""}.
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
      <div>${n(e.directorName)}</div>
      ${a(e.directorSignature,"Director signature")}
      <span class="sig-label">ხელმოწერა · ${i(e.directorSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">ბრძანების გამცემი</div>
      <span class="sig-label">თარიღი: ${i(e.directorSignedAt)}</span>
    </td>
  </tr>
  <tr>
    <td>
      <div class="sig-role">დანიშნული პასუხისმგებელი პირი</div>
      <div>${n(e.appointedName)}</div>
      ${a(e.appointedSignature,"Appointed person signature")}
      <span class="sig-label">ხელმოწერა · ${i(e.appointedSignedAt)}</span>
    </td>
    <td>
      <div class="sig-role">გაცნობის თარიღი</div>
      <span class="sig-label">${i(e.appointedSignedAt)}</span>
    </td>
  </tr>
</table>

<div class="footer">
  <span>გვერდი 1 / 1</span>
  <span>ბრძანება №${n(e.orderNumber)} - სახანძრო უსაფრთხოება (საწარმო)</span>
</div>

</body>
</html>`}function ye(e){return`<!DOCTYPE html>
<html lang="ka">
<head><meta charset="UTF-8"/>
<style>${D}</style>
</head>
<body>
<h1>ბრძანება №${n(e.orderNumber)}</h1>
<h2>შრომის უსაფრთხოების სპეციალისტის დანიშვნის შესახებ</h2>
<div class="header-line"><span>ქ. ${n(e.city)}</span><span>${_(e.orderDate)} წ.</span></div>
<table class="company-info">
  <tr><td>ორგანიზაციის დასახელება</td><td>${n(e.companyName)}</td></tr>
  <tr><td>საიდენტიფიკაციო კოდი</td><td>${n(e.identificationCode)}</td></tr>
  <tr><td>იურიდიული მისამართი</td><td>${n(e.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${n(e.directorName)}</td></tr>
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
  <li>ობიექტზე - <strong>„${n(e.facilityName)}"</strong> - შრომის უსაფრთხოების სპეციალისტად დაინიშნოს
    <strong>${n(e.specialistName)}</strong> (პ/ნ ${n(e.specialistPersonalId)}),
    სერტიფიკატი №${n(e.certificateNumber)}, გაცემული ${_(e.certificateDate)}.</li>
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
    <td>დირექტორი</td><td>${n(e.directorName)}</td>
    <td><span class="sig-underline"></span></td><td><span class="sig-underline"></span></td>
  </tr>
  <tr>
    <td>დანიშნული სპეციალისტი</td><td>${n(e.specialistName)}</td>
    <td><span class="sig-underline"></span></td><td><span class="sig-underline"></span></td>
  </tr>
</table>
</body>
</html>`}function ve(e){return`<!DOCTYPE html>
<html lang="ka">
<head><meta charset="UTF-8"/>
<style>${D}</style>
</head>
<body>
<h1>ბრძანება №${n(e.orderNumber)}</h1>
<h2>ალკოჰოლური და ნარკოტიკული თრობის კონტროლზე პასუხისმგებელი პირის დანიშვნის შესახებ</h2>
<div class="header-line"><span>ქ. ${n(e.city)}</span><span>${_(e.orderDate)} წ.</span></div>
<table class="company-info">
  <tr><td>ორგანიზაციის დასახელება</td><td>${n(e.companyName)}</td></tr>
  <tr><td>საიდენტიფიკაციო კოდი</td><td>${n(e.identificationCode)}</td></tr>
  <tr><td>იურიდიული მისამართი</td><td>${n(e.legalAddress)}</td></tr>
  <tr><td>დირექტორი</td><td>${n(e.directorName)}</td></tr>
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
  <li>ობიექტზე - <strong>„${n(e.facilityName)}"</strong> - ალკოჰოლური, ნარკოტიკული და ფსიქოტროპული საშუალებებით თრობის კონტროლზე პასუხისმგებელ პირად დაინიშნოს
    <strong>${n(e.responsiblePersonName)}</strong>
    (თანამდებობა - ${n(e.responsiblePersonPosition)}, პირადი №${n(e.responsiblePersonPersonalId)}).</li>
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
    <td>დირექტორი</td><td>${n(e.directorName)}</td>
    <td><span class="sig-underline"></span></td><td><span class="sig-underline"></span></td>
  </tr>
  <tr>
    <td>დანიშნული პასუხისმგებელი პირი</td><td>${n(e.responsiblePersonName)}</td>
    <td><span class="sig-underline"></span></td><td><span class="sig-underline"></span></td>
  </tr>
</table>
</body>
</html>`}const T=new Date().toISOString().split("T")[0],fe={orderNumber:"",city:"",orderDate:T,companyName:"",identificationCode:"",legalAddress:"",directorName:"",facilityName:"",specialistName:"",specialistPersonalId:"",certificateNumber:"",certificateDate:T,responsiblePersonName:"",responsiblePersonPosition:"",responsiblePersonPersonalId:"",appointedName:"",appointedPhone:"",objectName:"",objectAddress:"",appointedPosition:"",appointedIdNumber:"",directorSignature:null,directorSignedAt:null,appointedSignature:null,appointedSignedAt:null};function $(e){return e==="fire_safety_order"||e==="fire_safety_order_enterprise"}function Se(e){const a=["ტიპი","კომპანია","სპეციფიკა"];return $(e)?[...a,"დირექტ. ხელმ.","პასუხ. ხელმ.","შეჯამება"]:[...a,"შეჯამება"]}function R(e,a){const i={orderNumber:a.orderNumber,city:a.city,orderDate:new Date(a.orderDate).toISOString(),companyName:a.companyName,identificationCode:a.identificationCode,legalAddress:a.legalAddress,directorName:a.directorName};return e==="fire_safety_order"?{...i,appointedName:a.appointedName,appointedPhone:a.appointedPhone,objectName:a.objectName,objectAddress:a.objectAddress,directorSignature:a.directorSignature,directorSignedAt:a.directorSignedAt,appointedSignature:a.appointedSignature,appointedSignedAt:a.appointedSignedAt}:e==="fire_safety_order_enterprise"?{...i,appointedName:a.appointedName,appointedPhone:a.appointedPhone,appointedPosition:a.appointedPosition,appointedIdNumber:a.appointedIdNumber,objectName:a.objectName,objectAddress:a.objectAddress,directorSignature:a.directorSignature,directorSignedAt:a.directorSignedAt,appointedSignature:a.appointedSignature,appointedSignedAt:a.appointedSignedAt}:e==="alcohol_control"?{...i,facilityName:a.facilityName,responsiblePersonName:a.responsiblePersonName,responsiblePersonPosition:a.responsiblePersonPosition,responsiblePersonPersonalId:a.responsiblePersonPersonalId}:{...i,facilityName:a.facilityName,specialistName:a.specialistName,specialistPersonalId:a.specialistPersonalId,certificateNumber:a.certificateNumber,certificateDate:new Date(a.certificateDate).toISOString()}}const Pe=[{type:"labor_safety_specialist",icon:t.jsx(ge,{size:20}),label:C.labor_safety_specialist},{type:"alcohol_control",icon:t.jsx(ue,{size:20}),label:C.alcohol_control},{type:"fire_safety_order",icon:t.jsx(L,{size:20}),label:C.fire_safety_order},{type:"fire_safety_order_enterprise",icon:t.jsx(L,{size:20}),label:C.fire_safety_order_enterprise}];function $e({docType:e,setDocType:a,prefilledProjectId:i,projects:o,selectedProjectId:d,setSelectedProjectId:g}){return t.jsxs("div",{className:"space-y-4",children:[!i&&t.jsx(me,{label:"პროექტი",required:!0,value:d,onChange:g,options:o.map(m=>({value:m.id,label:m.name,logo:m.logo,company:m.company_name}))}),t.jsx("h2",{className:"text-base font-semibold text-neutral-800",children:"ბრძანების ტიპი"}),Pe.map(({type:m,icon:u,label:N})=>{const r=e===m;return t.jsxs("button",{onClick:()=>a(m),className:`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${r?"border-brand-500 bg-brand-50 text-brand-700":"border-neutral-200 bg-white text-neutral-700 hover:border-brand-300 hover:bg-neutral-50"}`,children:[t.jsx("span",{className:r?"text-brand-600":"text-neutral-400",children:u}),t.jsx("span",{className:"flex-1 text-sm font-medium",children:N}),r&&t.jsx("span",{className:"text-xs text-brand-600",children:"✓"})]},m)})]})}function p({label:e,children:a}){return t.jsxs("div",{className:"space-y-1",children:[t.jsx("p",{className:"text-xs font-medium text-neutral-600",children:e}),a]})}function _e({form:e,setField:a}){return t.jsxs("div",{className:"space-y-4",children:[t.jsx("h2",{className:"text-base font-semibold text-neutral-800",children:"ბრძანების ინფო"}),t.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[t.jsx(p,{label:"ბრძანების ნომერი *",children:t.jsx(c,{value:e.orderNumber,onChange:i=>a("orderNumber",i.target.value),placeholder:"მაგ. №01/2025"})}),t.jsx(p,{label:"ქალაქი *",children:t.jsx(c,{value:e.city,onChange:i=>a("city",i.target.value),placeholder:"თბილისი"})})]}),t.jsx(p,{label:"ბრძანების თარიღი",children:t.jsx(c,{type:"date",value:e.orderDate,onChange:i=>a("orderDate",i.target.value)})}),t.jsx("h2",{className:"text-sm font-semibold text-neutral-600 pt-1",children:"კომპანიის ინფო"}),t.jsx(p,{label:"კომპანიის დასახელება *",children:t.jsx(c,{value:e.companyName,onChange:i=>a("companyName",i.target.value),placeholder:"შპს / სს ..."})}),t.jsx(p,{label:"საიდენტიფიკაციო კოდი",children:t.jsx(c,{value:e.identificationCode,onChange:i=>a("identificationCode",i.target.value)})}),t.jsx(p,{label:"იურიდიული მისამართი",children:t.jsx(c,{value:e.legalAddress,onChange:i=>a("legalAddress",i.target.value)})}),t.jsx(p,{label:"დირექტორი (სახელი, გვარი) *",children:t.jsx(c,{value:e.directorName,onChange:i=>a("directorName",i.target.value)})})]})}function we({form:e,setField:a}){return t.jsxs("div",{className:"space-y-4",children:[t.jsx("h2",{className:"text-base font-semibold text-neutral-800",children:"სპეციალისტი"}),t.jsx(p,{label:"ობიექტის სახელი და მისამართი *",children:t.jsx(c,{value:e.facilityName,onChange:i=>a("facilityName",i.target.value)})}),t.jsx(p,{label:"სპეციალისტი (სახელი, გვარი) *",children:t.jsx(c,{value:e.specialistName,onChange:i=>a("specialistName",i.target.value)})}),t.jsx(p,{label:"პირადი ნომერი",children:t.jsx(c,{value:e.specialistPersonalId,onChange:i=>a("specialistPersonalId",i.target.value),maxLength:11})}),t.jsx(p,{label:"სერტიფიკატის ნომერი *",children:t.jsx(c,{value:e.certificateNumber,onChange:i=>a("certificateNumber",i.target.value)})}),t.jsx(p,{label:"სერტიფიკატის გაცემის თარიღი",children:t.jsx(c,{type:"date",value:e.certificateDate,onChange:i=>a("certificateDate",i.target.value)})})]})}function Ae({form:e,setField:a}){return t.jsxs("div",{className:"space-y-4",children:[t.jsx("h2",{className:"text-base font-semibold text-neutral-800",children:"პასუხისმგებელი პირი"}),t.jsx(p,{label:"ობიექტის სახელი და მისამართი *",children:t.jsx(c,{value:e.facilityName,onChange:i=>a("facilityName",i.target.value)})}),t.jsx(p,{label:"სახელი, გვარი *",children:t.jsx(c,{value:e.responsiblePersonName,onChange:i=>a("responsiblePersonName",i.target.value)})}),t.jsx(p,{label:"თანამდებობა *",children:t.jsx(c,{value:e.responsiblePersonPosition,onChange:i=>a("responsiblePersonPosition",i.target.value)})}),t.jsx(p,{label:"პირადი ნომერი",children:t.jsx(c,{value:e.responsiblePersonPersonalId,onChange:i=>a("responsiblePersonPersonalId",i.target.value),maxLength:11})})]})}function Ce({form:e,setField:a}){return t.jsxs("div",{className:"space-y-4",children:[t.jsx("h2",{className:"text-base font-semibold text-neutral-800",children:"დანიშნული პირი"}),t.jsx(p,{label:"სახელი, გვარი *",children:t.jsx(c,{value:e.appointedName,onChange:i=>a("appointedName",i.target.value)})}),t.jsx(p,{label:"ტელეფონის ნომერი *",children:t.jsx(c,{type:"tel",value:e.appointedPhone,onChange:i=>a("appointedPhone",i.target.value)})}),t.jsx("h2",{className:"text-sm font-semibold text-neutral-600 pt-1",children:"ობიექტი"}),t.jsx(p,{label:"ობიექტის დასახელება *",children:t.jsx(c,{value:e.objectName,onChange:i=>a("objectName",i.target.value)})}),t.jsx(p,{label:"ობიექტის მისამართი",children:t.jsx(c,{value:e.objectAddress,onChange:i=>a("objectAddress",i.target.value)})})]})}function De({form:e,setField:a}){return t.jsxs("div",{className:"space-y-4",children:[t.jsx("h2",{className:"text-base font-semibold text-neutral-800",children:"დანიშნული პირი"}),t.jsx(p,{label:"სახელი, გვარი *",children:t.jsx(c,{value:e.appointedName,onChange:i=>a("appointedName",i.target.value)})}),t.jsx(p,{label:"თანამდებობა *",children:t.jsx(c,{value:e.appointedPosition,onChange:i=>a("appointedPosition",i.target.value)})}),t.jsx(p,{label:"პირადი ნომერი *",children:t.jsx(c,{value:e.appointedIdNumber,onChange:i=>a("appointedIdNumber",i.target.value),maxLength:11})}),t.jsx(p,{label:"ტელეფონის ნომერი *",children:t.jsx(c,{type:"tel",value:e.appointedPhone,onChange:i=>a("appointedPhone",i.target.value)})}),t.jsx("h2",{className:"text-sm font-semibold text-neutral-600 pt-1",children:"ობიექტი"}),t.jsx(p,{label:"ობიექტის დასახელება *",children:t.jsx(c,{value:e.objectName,onChange:i=>a("objectName",i.target.value)})}),t.jsx(p,{label:"ობიექტის მისამართი",children:t.jsx(c,{value:e.objectAddress,onChange:i=>a("objectAddress",i.target.value)})})]})}function ke({form:e,signingOpen:a,setSigningOpen:i,onSave:o,onClear:d}){return t.jsxs("div",{className:"space-y-4",children:[t.jsx("h2",{className:"text-base font-semibold text-neutral-800",children:"დირექტორის ხელმოწერა"}),t.jsx("p",{className:"text-sm text-neutral-500",children:e.directorName||"დირექტორი"}),e.directorSignature?t.jsxs("div",{className:"flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3",children:[t.jsx("img",{src:`data:image/png;base64,${e.directorSignature}`,alt:"Director signature",className:"h-12 rounded border border-neutral-200 bg-white p-1"}),t.jsxs("div",{className:"flex-1",children:[t.jsx("p",{className:"text-sm font-medium text-brand-800",children:"ხელმოწერა დადებულია"}),e.directorSignedAt&&t.jsx("p",{className:"text-xs text-brand-600",children:new Date(e.directorSignedAt).toLocaleString("ka-GE")})]}),t.jsx(v,{variant:"ghost",size:"sm",onClick:d,className:"text-neutral-500",children:t.jsx(B,{size:14})})]}):a?t.jsx(G,{onSave:o,onCancel:()=>i(!1)}):t.jsxs(v,{variant:"outline",onClick:()=>i(!0),className:"w-full gap-2",children:[t.jsx(M,{size:16}),"+ ხელმოწერა"]})]})}function ze({form:e,signingOpen:a,setSigningOpen:i,onSave:o,onClear:d}){return t.jsxs("div",{className:"space-y-4",children:[t.jsx("h2",{className:"text-base font-semibold text-neutral-800",children:"პასუხისმგებელი პირის ხელმოწერა"}),t.jsx("p",{className:"text-sm text-neutral-500",children:e.appointedName||"დანიშნული პირი"}),e.appointedSignature?t.jsxs("div",{className:"flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3",children:[t.jsx("img",{src:`data:image/png;base64,${e.appointedSignature}`,alt:"Appointed signature",className:"h-12 rounded border border-neutral-200 bg-white p-1"}),t.jsxs("div",{className:"flex-1",children:[t.jsx("p",{className:"text-sm font-medium text-brand-800",children:"ხელმოწერა დადებულია"}),e.appointedSignedAt&&t.jsx("p",{className:"text-xs text-brand-600",children:new Date(e.appointedSignedAt).toLocaleString("ka-GE")})]}),t.jsx(v,{variant:"ghost",size:"sm",onClick:d,className:"text-neutral-500",children:t.jsx(B,{size:14})})]}):a?t.jsx(G,{onSave:o,onCancel:()=>i(!1)}):t.jsxs(v,{variant:"outline",onClick:()=>i(!0),className:"w-full gap-2",children:[t.jsx(M,{size:16}),"+ ხელმოწერა"]})]})}function Ie({form:e,docType:a,onSaveDraft:i,isPending:o}){return t.jsxs("div",{className:"space-y-4",children:[t.jsx("h2",{className:"text-base font-semibold text-neutral-800",children:"შეჯამება"}),t.jsx("div",{className:"divide-y divide-neutral-100 rounded-lg border border-neutral-200",children:[["ბრძანება №",e.orderNumber],["ქალაქი",e.city],["თარიღი",e.orderDate],["კომპანია",e.companyName],["დირექტორი",e.directorName],...a==="fire_safety_order"?[["დანიშნული პირი",e.appointedName],["ტელეფონი",e.appointedPhone],["ობიექტი",e.objectName],["დირექტ. ხელმოწ.",e.directorSignature?"✓ ხელმოწერილია":"-"],["პასუხისმ. ხელმოწ.",e.appointedSignature?"✓ ხელმოწერილია":"-"]]:a==="fire_safety_order_enterprise"?[["დანიშნული პირი",e.appointedName],["თანამდებობა",e.appointedPosition],["პ/ნ",e.appointedIdNumber],["ტელეფონი",e.appointedPhone],["ობიექტი",e.objectName],["დირექტ. ხელმოწ.",e.directorSignature?"✓ ხელმოწერილია":"-"],["პასუხისმ. ხელმოწ.",e.appointedSignature?"✓ ხელმოწერილია":"-"]]:a==="labor_safety_specialist"?[["სპეციალისტი",e.specialistName],["ობიექტი",e.facilityName]]:[["პასუხისმგებელი",e.responsiblePersonName],["ობიექტი",e.facilityName]]].map(([d,g])=>t.jsxs("div",{className:"flex items-center gap-3 px-4 py-2 text-sm",children:[t.jsx("span",{className:"w-36 shrink-0 text-neutral-500",children:d}),t.jsx("span",{className:"font-medium text-neutral-900 dark:text-neutral-100",children:g||"-"})]},d))}),t.jsx("p",{className:"text-xs text-neutral-500",children:'„PDF გენერირება" - ბრძანება შეინახება და გაიხსნება ახალ ჩანართში ბეჭდვისთვის.'}),t.jsx(v,{variant:"outline",size:"sm",onClick:i,disabled:o,className:"w-full",children:"შენახვა (PDF-ის გარეშე)"})]})}function We(){const e=X(),[a]=Z(),i=a.get("project")??"",[o,d]=x.useState(i),g=o,{data:m}=J({queryKey:le.lists(),queryFn:se,enabled:!i}),[u,N]=x.useState(0),[r,S]=x.useState(null),[l,h]=x.useState(fe),[H,z]=x.useState(!1),[W,I]=x.useState(!1),y=x.useRef(null);x.useEffect(()=>{g&&ae(g).then(s=>{s&&h(b=>({...b,companyName:s.company_name||s.name,legalAddress:s.address??"",facilityName:s.company_name||s.name,objectName:s.name,objectAddress:s.address??""}))}).catch(()=>null)},[g]);const O=Se(r),Y=O.length,F=x.useMemo(()=>{if(u===0)return r!==null&&g.length>0;if(u===1)return l.orderNumber.trim().length>0&&l.city.trim().length>0&&l.companyName.trim().length>0&&l.directorName.trim().length>0;if(u===2){if(r==="labor_safety_specialist")return l.facilityName.trim().length>0&&l.specialistName.trim().length>0&&l.certificateNumber.trim().length>0;if(r==="alcohol_control")return l.facilityName.trim().length>0&&l.responsiblePersonName.trim().length>0&&l.responsiblePersonPosition.trim().length>0;if(r==="fire_safety_order")return l.appointedName.trim().length>0&&l.appointedPhone.trim().length>0&&l.objectName.trim().length>0;if(r==="fire_safety_order_enterprise")return l.appointedName.trim().length>0&&l.appointedPhone.trim().length>0&&l.appointedPosition.trim().length>0&&l.appointedIdNumber.trim().length>0&&l.objectName.trim().length>0}return u===3&&$(r)?!!l.directorSignature:u===4&&$(r)?!!l.appointedSignature:!0},[u,l,r,g]),w=ee({mutationFn:async({asDraft:s,pid:b,dt:j,formData:A})=>{await ne({projectId:b,documentType:j,formData:A,status:s?"draft":"completed"})},onSuccess:(s,{asDraft:b,html:j,destProjectId:A})=>{!b&&y.current&&(y.current.document.write(j),y.current.document.close(),y.current=null),k.success(b?"ბრძანება შენახულია":"ბრძანება შექმნილია"),e(A?`/projects/${A}`:"/")},onError:s=>{var b;(b=y.current)==null||b.close(),y.current=null,ie(s)}});function P(s,b){h(j=>({...j,[s]:b}))}function U(){const s=R(r,l);return r==="fire_safety_order"?je(s):r==="fire_safety_order_enterprise"?Ne(s):r==="alcohol_control"?ve(s):ye(s)}const q=u===Y-1;function E(s){return!r||!g?null:{asDraft:s,pid:g,dt:r,formData:R(r,l),html:U(),destProjectId:g}}function V(){const s=E(!1);if(!s){k.error("პროექტი ან ბრძანების ტიპი არ არის მითითებული");return}y.current=window.open("","_blank","noopener,noreferrer"),w.mutate(s)}function K(){const s=E(!0);if(!s){k.error("პროექტი ან ბრძანების ტიპი არ არის მითითებული");return}w.mutate(s)}return t.jsxs(xe,{open:!0,onClose:()=>e(g?`/projects/${g}`:"/"),title:"ახალი ბრძანება",steps:O,currentStep:u,onPrev:()=>N(s=>s-1),onNext:()=>N(s=>s+1),onFinish:V,isSubmitting:w.isPending,nextDisabled:!F,finishLabel:"PDF გენერირება",children:[u===0&&t.jsx($e,{docType:r,setDocType:S,prefilledProjectId:i,projects:m??[],selectedProjectId:o,setSelectedProjectId:d}),u===1&&t.jsx(_e,{form:l,setField:P}),u===2&&r==="labor_safety_specialist"&&t.jsx(we,{form:l,setField:P}),u===2&&r==="alcohol_control"&&t.jsx(Ae,{form:l,setField:P}),u===2&&r==="fire_safety_order"&&t.jsx(Ce,{form:l,setField:P}),u===2&&r==="fire_safety_order_enterprise"&&t.jsx(De,{form:l,setField:P}),u===3&&$(r)&&t.jsx(ke,{form:l,signingOpen:H,setSigningOpen:z,onSave:s=>{const b=s.replace(/^data:image\/png;base64,/,"");h(j=>({...j,directorSignature:b,directorSignedAt:new Date().toISOString()})),z(!1)},onClear:()=>h(s=>({...s,directorSignature:null,directorSignedAt:null}))}),u===4&&$(r)&&t.jsx(ze,{form:l,signingOpen:W,setSigningOpen:I,onSave:s=>{const b=s.replace(/^data:image\/png;base64,/,"");h(j=>({...j,appointedSignature:b,appointedSignedAt:new Date().toISOString()})),I(!1)},onClear:()=>h(s=>({...s,appointedSignature:null,appointedSignedAt:null}))}),q&&t.jsx(Ie,{form:l,docType:r,onSaveDraft:K,isPending:w.isPending})]})}export{We as default};
