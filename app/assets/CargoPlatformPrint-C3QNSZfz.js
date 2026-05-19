import{a0 as N,H as V,K as P,r as h,j as S}from"./vendor-RgCJidSG.js";import{g as U}from"./cargoPlatform-DzoqnG2T.js";import{W as q,g as G}from"./index-8deJTrE6.js";import{p as M}from"./printable-Cf_S6Vk4.js";import"./threejs-CGh6g2ET.js";import"./supabase-BlZULfNW.js";import"./icons-C2row9jV.js";import"./leaflet-CTx783fO.js";const K=[{id:1,section:"A",label:"ძირის ფილები",description:"პლატფორმის ძირის (ფილების) მდგომარეობა — ბზარები, დეფორმაცია, კოროზია თუ არის — ცუდია"},{id:2,section:"A",label:"მზიდი ჩარჩო",description:"მზიდი ჩარჩოს (ლითონის) მდგომარეობა — ბზარი, გახსნილი, დეფორმირებული — ცუდია"},{id:3,section:"A",label:"სვეტები",description:"სვეტების (ვერტიკალური დგარების) მდგომარეობა — დეფორმირებული, გამოძრავდა, მოშვებული — ცუდია"},{id:4,section:"A",label:"ანკერული გამაგრება",description:"ანკერული გამაგრებების მდგომარეობა — სიმჭიდროვე დარღვეულია, კოროზიულია — ცუდია"},{id:5,section:"B",label:"გვ. მოაჯირის სიმ.",description:"გვერდითი მოაჯირების სიმაღლე (მინ. 90–120 სმ)"},{id:6,section:"B",label:"მოაჯირის სიმტკ.",description:"მოაჯირების სტრუქტურული სიმტკიცე — აკლია, ბზარი — ცუდია"},{id:7,section:"B",label:"წინა მოაჯირი",description:"წინა მოძრავი (დასაკეცი) მოაჯირების ფუნქციონირება — გახსნა/დაკეტვა — თუ არ ფუნქციონირებს ცუდია"},{id:8,section:"B",label:"ჩამკეტი მოწყ.",description:"მოძრავი მოაჯირის ჩამკეტი მოწყობილობა — არ გააჩნია, არ იკეტება — ცუდია"},{id:9,section:"B",label:"კავშირები",description:"მოაჯირის ყველა კავშირი (სახსრები) — ბზარი, დაზიანებული — ცუდია"}],W={A:"A — სტრუქტურული მთლიანობა",B:"B — მოაჯირები"},O={approved:"პლატფორმა შეესაბამება მოთხოვნებს და დაშვებულია ექსპლუატაციაში",conditional:"პლატფორმა პირობით დაშვებულია — საჭიროა ქვემოთ მითითებული ღონისძიებების შესრულება",rejected:"პლატფორმა არ შეესაბამება მოთხოვნებს — ექსპლუატაცია შეჩერებულია"};function Q(o){return o.reduce((e,s)=>e+(s.total_weight_kg??0),0)}function a(o){return o?o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function v(o){if(!o)return"—";const e=new Date(o);return isNaN(e.getTime())?o:e.toLocaleDateString("ka-GE",{year:"numeric",month:"long",day:"numeric"})}const Y=`
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink:        #1A1A1A;
    --inkSoft:    #6B7280;
    --inkFaint:   #9CA3AF;
    --hairline:   #E5E7EB;
    --card:       #FFFFFF;
    --page:       #F9FAFB;
    --accent:     #1D9E75;
    --green:      #10B981;
    --greenSoft:  #D1FAE5;
    --amber:      #F59E0B;
    --amberSoft:  #FEF3C7;
    --amberBdr:   #D97706;
    --catHdr:     #F3F4F6;
    --na:         #E5E7EB;
    --naText:     #6B7280;
  }

  html, body {
    font-family: 'Noto Sans Georgian', 'Arial Unicode MS', Arial, sans-serif;
    font-size: 11px;
    color: var(--ink);
    background: var(--page);
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    max-width: 800px;
    margin: 0 auto;
    background: var(--card);
    padding: 28px 32px 40px;
  }

  /* Header */
  .header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 12px;
    align-items: start;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--accent);
    margin-bottom: 20px;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo-box {
    width: 44px; height: 44px; border-radius: 10px;
    background: var(--accent); display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
  }
  .logo-text { color: #fff; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; }
  .project-name { font-size: 12px; font-weight: 600; color: var(--inkSoft); max-width: 160px; }
  .header-center { text-align: center; }
  .doc-title { font-size: 14px; font-weight: 800; color: var(--ink); line-height: 1.3; }
  .doc-sub { font-size: 11px; color: var(--inkSoft); margin-top: 3px; }
  .header-right { text-align: right; }
  .internal-badge {
    display: inline-block; font-size: 10px; font-weight: 600;
    color: var(--inkSoft); border: 1px solid var(--hairline);
    border-radius: 4px; padding: 2px 6px; margin-bottom: 6px;
  }
  .doc-meta { font-size: 10px; color: var(--inkFaint); line-height: 1.6; }

  /* Section title */
  .section-title {
    font-size: 11px; font-weight: 700; color: var(--inkSoft);
    text-transform: uppercase; letter-spacing: 0.6px;
    margin: 18px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--hairline);
  }

  /* Info grid */
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .info-table td { padding: 6px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: top; width: 50%; }
  .info-table .lbl { color: var(--inkSoft); font-weight: 600; display: block; font-size: 10px; margin-bottom: 2px; }
  .info-table .val { color: var(--ink); }

  /* Platform ID table (2-col: parameter | value) */
  .param-table { width: 100%; border-collapse: collapse; }
  .param-table td { padding: 5px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: middle; }
  .param-table td:first-child { width: 52%; color: var(--inkSoft); font-weight: 600; }
  .param-table td:last-child { color: var(--ink); }
  .param-table tr:nth-child(even) td { background: var(--catHdr); }

  /* Cargo table */
  .cargo-table { width: 100%; border-collapse: collapse; }
  .cargo-table th, .cargo-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .cargo-table thead tr { background: var(--catHdr); }
  .cargo-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .cargo-total td { background: var(--catHdr); font-weight: 700; }
  .col-num-sm { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-weight { width: 88px; text-align: right; }

  /* Legend */
  .legend {
    display: flex; gap: 16px; align-items: center;
    padding: 7px 10px; background: var(--catHdr);
    border-radius: 6px; margin-bottom: 8px; flex-wrap: wrap;
  }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--inkSoft); }
  .dot { width: 8px; height: 8px; border-radius: 4px; }
  .dot-good { background: var(--green); }
  .dot-fix  { background: var(--amber); }
  .dot-na   { background: var(--na); border: 1px solid var(--hairline); }

  /* Checklist table */
  .cl-table { width: 100%; border-collapse: collapse; }
  .cl-table th, .cl-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .cl-table thead tr { background: var(--catHdr); }
  .cl-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .cl-cat-row td { background: var(--catHdr); font-weight: 700; font-size: 11px; color: var(--inkSoft); padding: 6px 8px; }
  .col-num { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-result { width: 80px; white-space: nowrap; }
  .col-comment { width: 180px; }
  .item-fix { border-left: 3px solid var(--amberBdr) !important; }
  .item-comment { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 4px; }
  .item-photo { display: inline-block; margin: 4px 4px 0 0; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Result pills */
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-good { background: var(--greenSoft); color: #065F46; }
  .pill-fix  { background: var(--amberSoft); color: #92400E; }
  .pill-na   { background: var(--na); color: var(--naText); }
  .pill-null { background: var(--catHdr); color: var(--inkFaint); }

  /* Verdict block */
  .verdict-block { margin-top: 14px; }
  .verdict-option {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 8px 10px; border: 1px solid var(--hairline);
    border-radius: 8px; margin-bottom: 6px; font-size: 11px;
  }
  .verdict-option.selected { border-color: var(--accent); background: #F0FDF9; }
  .verdict-box {
    width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid var(--hairline);
    flex-shrink: 0; margin-top: 1px;
    display: flex; align-items: center; justify-content: center;
  }
  .verdict-box.checked { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked::after { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-label { line-height: 1.4; }
  .comment-block {
    margin-top: 12px; padding: 10px 12px;
    border: 0.5px solid var(--hairline); border-radius: 8px;
    min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5;
  }
  .comment-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

  /* Photos */
  .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
  .photo-item img { width: 100%; border-radius: 6px; border: 0.5px solid var(--hairline); display: block; }
  .photo-caption { font-size: 10px; color: var(--inkFaint); margin-top: 3px; text-align: center; }

  /* Signatures — two blocks side by side */
  .sig-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
  .sig-block {
    border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden;
  }
  .sig-cell { padding: 10px 12px; border-bottom: 0.5px solid var(--hairline); }
  .sig-cell:last-child { border-bottom: none; }
  .sig-lbl { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .sig-name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .sig-role { font-size: 10px; color: var(--inkSoft); margin-top: 2px; }
  .sig-org  { font-size: 10px; color: var(--inkSoft); }
  .sig-img  { max-height: 48px; max-width: 100%; margin-top: 4px; }
  .sig-line { height: 36px; border-bottom: 1px dashed var(--hairline); margin: 4px 0; }
  .sig-date { font-size: 11px; color: var(--ink); }

  /* Legal note */
  .legal-note {
    margin-top: 16px; font-size: 9px; color: var(--inkFaint);
    text-align: center; line-height: 1.5; font-style: italic;
  }

  /* Footer */
  .footer {
    margin-top: 32px; padding-top: 10px;
    border-top: 1px solid var(--hairline);
    display: flex; justify-content: space-between;
    font-size: 10px; color: var(--inkFaint);
  }

  @media print {
    html, body { background: #fff; }
    .page { padding: 0; max-width: none; }
    @page { margin: 18mm 14mm; }
  }
`;function Z(o){const{inspection:e,projectName:s="პროექტი",photoUrls:r}=o,c=e.id.slice(-8).toUpperCase(),g=v(e.completedAt??e.inspectionDate),b=`
    <div class="header">
      <div class="header-left">
        <div class="logo-box"><span class="logo-text">SR</span></div>
        <div class="project-name">${a(s)}</div>
      </div>
      <div class="header-center">
        <div class="doc-title">ტვირთის მიმღები პლატფორმის<br>შემოწმების აქტი</div>
        <div class="doc-sub">Cargo Receiving Platform — Technical Inspection &amp; Safety Acceptance Act</div>
      </div>
      <div class="header-right">
        <span class="internal-badge">შიდა სამსახურებრივი დოკუმენტი</span>
        <div class="doc-meta">
          ${a(g)}<br>
          ID: ${a(c)}
        </div>
      </div>
    </div>
  `,u=`
    <div class="section-title">I — ზოგადი ინფორმაცია</div>
    <table class="info-table">
      <tr>
        <td><span class="lbl">კომპანიის დასახელება</span><span class="val">${a(e.company)||"—"}</span></td>
        <td><span class="lbl">შემოწმების თარიღი</span><span class="val">${v(e.inspectionDate)}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">მდებარეობა / მისამართი</span><span class="val">${a(e.address)||"—"}</span></td>
        <td><span class="lbl">სართული / ზონა</span><span class="val">${a(e.floorZone)||"—"}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">შემოწმების ჩამტარებელი</span><span class="val">${a(e.inspectorName)||"—"}</span></td>
        <td></td>
      </tr>
    </table>
  `;function d(t,i,l){return t==="none"?`☑ ${i} &nbsp; ☐ ${l}`:t==="complete"?`☐ ${i} &nbsp; ☑ ${l}`:"—"}function p(t){return t==="non_standard"?"☑ ვერ აკმაყოფილებს სტანდარტს &nbsp; ☐ სტანდარტს აკმაყოფილებს":t==="standard"?"☐ ვერ აკმაყოფილებს სტანდარტს &nbsp; ☑ სტანდარტს აკმაყოფილებს":"—"}const k=`
    <div class="section-title">II — პლატფორმის იდენტიფიკაცია</div>
    <table class="param-table">
      <tr><td>პლატფორმის ტიპი / მოდელი</td><td>${a(e.platformTypeModel)||"—"}</td></tr>
      <tr><td>სიგრძე (მ)</td><td>${e.platformLength!=null?e.platformLength:"—"}</td></tr>
      <tr><td>სიგანე (მ)</td><td>${e.platformWidth!=null?e.platformWidth:"—"}</td></tr>
      <tr><td>ვიზუალური აღწერა / ფერი</td><td>${a(e.platformColorDesc)||"—"}</td></tr>
      <tr><td>გვერდის დამცავი მოაჯირი</td><td>${d(e.sideGuardrail,"არ გააჩნია","მოაჯირი სრულია")}</td></tr>
      <tr><td>წინა დამცავი მოაჯირი</td><td>${d(e.frontGuardrail,"არ გააჩნია","მოაჯირი სრულია")}</td></tr>
      <tr><td>მოაჯირის სიმაღლე (სტანდ. 90–120 სმ)</td><td>${p(e.guardrailHeight)}</td></tr>
    </table>
  `,m=Q(e.cargo),x=`
    <div class="section-title">III — ტვირთის იდენტიფიკაცია</div>
    <p style="font-size:10px;color:var(--inkSoft);font-style:italic;margin-bottom:8px;">
      ყველა ტვირთი, რომელიც განთავსდება პლატფორმაზე, ექვემდებარება იდენტიფიკაციას და წინასწარ წონის დადასტურებას
    </p>
    <table class="cargo-table">
      <thead>
        <tr>
          <th class="col-num-sm">#</th>
          <th>დასახელება</th>
          <th class="col-weight">ერთ. წონა კგ</th>
          <th class="col-weight">სრ. წონა კგ</th>
          <th>შენიშვნა</th>
        </tr>
      </thead>
      <tbody>
        ${e.cargo.map((t,i)=>`
    <tr>
      <td class="col-num-sm">${i+1}</td>
      <td>${a(t.name)||"—"}</td>
      <td class="col-weight">${t.unit_weight_kg!=null?t.unit_weight_kg:"—"}</td>
      <td class="col-weight">${t.total_weight_kg!=null?t.total_weight_kg:"—"}</td>
      <td>${a(t.note)||""}</td>
    </tr>
  `).join("")}
        <tr class="cargo-total">
          <td colspan="3" style="text-align:right;">სულ:</td>
          <td class="col-weight">${m} კგ</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `;function f(t){return t==="good"?'<span class="pill pill-good">✓ კარგი</span>':t==="fix"?'<span class="pill pill-fix">✗ გამოსასწ.</span>':t==="na"?'<span class="pill pill-na">— N/A</span>':'<span class="pill pill-null">—</span>'}let n="",I="";for(const t of K){t.section!==I&&(I=t.section,n+=`
        <tr class="cl-cat-row">
          <td colspan="4">${a(W[t.section])}</td>
        </tr>
      `);const i=e.items.find(y=>y.id===t.id),l=(i==null?void 0:i.result)??null,F=(i==null?void 0:i.comment)??null,L=(i==null?void 0:i.photo_paths)??[],R=l==="fix";let $="";for(const y of L){const j=r[y];j&&($+=`<span class="item-photo"><img src="${j}" alt="ფოტო" /></span>`)}n+=`
      <tr${R?' class="item-fix"':""}>
        <td class="col-num">${t.id}</td>
        <td>
          <strong>${a(t.label)}</strong><br>
          <span style="color:var(--inkSoft)">${a(t.description)}</span>
          ${F?`<div class="item-comment">${a(F)}</div>`:""}
          ${$?`<div style="margin-top:4px;">${$}</div>`:""}
        </td>
        <td class="col-result">${f(l)}</td>
      </tr>
    `}const A=`
    <div class="section-title">IV — პლატფორმის შემოწმება</div>
    <div class="legend">
      <span class="legend-item"><span class="dot dot-good"></span>✓ კარგი</span>
      <span class="legend-item"><span class="dot dot-fix"></span>✗ გამოსასწორებელი</span>
      <span class="legend-item"><span class="dot dot-na"></span>N/A — არ ვრცელდება</span>
    </div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>შემოწმების პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${n}</tbody>
    </table>
  `,H=t=>e.verdict===t?"selected":"",E=t=>e.verdict===t?"checked":"",B=`
    <div class="section-title">V — დასკვნა</div>
    <div class="verdict-block">
      ${["approved","conditional","rejected"].map(t=>`
        <div class="verdict-option ${H(t)}">
          <div class="verdict-box ${E(t)}"></div>
          <span class="verdict-label">${a(O[t])}</span>
        </div>
      `).join("")}
    </div>
    <div class="comment-label" style="margin-top:14px;">კომენტარი</div>
    <div class="comment-block">${a(e.verdictComment)||"&nbsp;"}</div>
  `,_=e.summaryPhotos.map((t,i)=>{const l=r[t];return l?`
      <div class="photo-item">
        <img src="${l}" alt="ფოტო ${i+1}" />
        <div class="photo-caption">ფოტო ${i+1}</div>
      </div>
    `:""}).filter(Boolean).join(""),C=e.summaryPhotos.length>0?`
    <div class="section-title">VI — ფოტო / ვიდეო მასალა</div>
    <p style="font-size:10px;color:var(--inkSoft);font-style:italic;margin-bottom:8px;">
      დოკუმენტს თან ერთვის ტესტირების ამსახველი ფოტო/ვიდეო მასალა
    </p>
    <div class="photo-grid">${_}</div>
  `:"";function z(t,i){const l=t.signature?`<img class="sig-img" src="data:image/png;base64,${t.signature}" alt="ხელმოწერა" />`:'<div class="sig-line"></div>';return`
      <div class="sig-block">
        <div class="sig-cell">
          <div class="sig-lbl">${a(i)}</div>
          <div class="sig-name">${a(t.name)||"—"}</div>
          <div class="sig-role">${a(t.position)||""}</div>
          <div class="sig-org">${a(t.organization)||""}</div>
        </div>
        <div class="sig-cell">
          <div class="sig-lbl">ხელმოწერა</div>
          ${l}
        </div>
        <div class="sig-cell">
          <div class="sig-lbl">თარიღი</div>
          <div class="sig-date">${t.date?v(t.date):v(e.completedAt??e.inspectionDate)}</div>
        </div>
      </div>
    `}const D=`
    <div class="section-title">VII — ხელმოწერები</div>
    <div class="sig-two-col">
      ${z(e.signatures[0],"I ხელმომწერი")}
      ${z(e.signatures[1],"II ხელმომწერი")}
    </div>
    <div class="legal-note">
      წინამდებარე შემოწმების აქტი წარმოადგენს სამართლებრივი ძალის მქონე დოკუმენტს.
      ხელმოწერის გარეშე ამ დოკუმენტს იურიდიული ძალა არ გააჩნია.
    </div>
  `,T=`
    <div class="footer">
      <span>Sarke 2.0 — ტვირთის მიმღები პლატფორმის შემოწმების აქტი</span>
      <span>${a(g)} · ID ${a(c)}</span>
    </div>
  `;return`<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ტვირთის მიმღები პლატფორმის შემოწმების აქტი</title>
  <style>${Y}</style>
</head>
<body>
  <div class="page">
    ${b}
    ${u}
    ${k}
    ${x}
    ${A}
    ${B}
    ${C}
    ${D}
    ${T}
  </div>
</body>
</html>`}function nt(){var m,w,x;const{id:o}=N(),[e]=V(),s=e.get("preview")==="1",r=P({queryKey:["cargoPlatformInspection",o],queryFn:()=>U(o),enabled:!!o}),c=P({queryKey:["project",(m=r.data)==null?void 0:m.projectId],queryFn:()=>G(r.data.projectId),enabled:!!((w=r.data)!=null&&w.projectId)}),[g,b]=h.useState({}),[u,d]=h.useState(!1);h.useEffect(()=>{if(!r.data)return;const f=[...r.data.items.flatMap(n=>n.photo_paths??[]),...r.data.summaryPhotos];if(!f.length){d(!0);return}Promise.all(f.map(async n=>[n,await q(n)])).then(n=>{b(Object.fromEntries(n)),d(!0)}).catch(()=>d(!0))},[r.data]);const p=r.isSuccess&&c.isSuccess&&u;if(h.useEffect(()=>{p&&!s&&M(500)},[p,s]),!r.data)return S.jsx("p",{style:{padding:24},children:r.isLoading?"იტვირთება…":"ვერ მოიძებნა."});if(!p)return S.jsx("p",{style:{padding:24},children:"იტვირთება…"});const k=Z({inspection:r.data,projectName:(x=c.data)==null?void 0:x.name,photoUrls:g});return S.jsx("div",{dangerouslySetInnerHTML:{__html:k}})}export{nt as default};
