import{aN as i,aP as k}from"./index-B-4iyvtm.js";const w=`
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink:       #1A1A1A;
    --inkSoft:   #6B7280;
    --inkFaint:  #9CA3AF;
    --hairline:  #E5E7EB;
    --card:      #FFFFFF;
    --page:      #F9FAFB;
    --accent:    #1D9E75;
    --green:     #10B981;
    --greenSoft: #D1FAE5;
    --amber:     #F59E0B;
    --amberSoft: #FEF3C7;
    --red:       #EF4444;
    --redSoft:   #FEE2E2;
    --catHdr:    #F3F4F6;
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

  .page { max-width: 800px; margin: 0 auto; background: var(--card); padding: 28px 32px 40px; }

  /* Header */
  .header {
    display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px;
    align-items: start; padding-bottom: 16px;
    border-bottom: 2px solid var(--accent); margin-bottom: 20px;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo-box {
    width: 44px; height: 44px; border-radius: 10px; background: var(--accent);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
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
    margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--hairline);
  }

  /* Info grid */
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .info-table td {
    padding: 6px 8px; font-size: 11px; border: 0.5px solid var(--hairline);
    vertical-align: top; width: 50%;
  }
  .info-table .lbl { color: var(--inkSoft); font-weight: 600; display: block; font-size: 10px; margin-bottom: 2px; }
  .info-table .val { color: var(--ink); font-weight: 400; }

  /* Specs table */
  .specs-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .specs-table th {
    background: var(--catHdr); border: 0.5px solid var(--hairline);
    padding: 5px 8px; font-size: 10px; color: var(--inkSoft);
    text-transform: uppercase; letter-spacing: 0.4px; text-align: left;
  }
  .specs-table td { border: 0.5px solid var(--hairline); padding: 6px 8px; font-size: 11px; color: var(--ink); }

  /* Legend */
  .legend {
    display: flex; gap: 16px; align-items: center;
    padding: 7px 10px; background: var(--catHdr);
    border-radius: 6px; margin-bottom: 8px; flex-wrap: wrap;
  }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--inkSoft); }
  .dot { width: 8px; height: 8px; border-radius: 4px; }
  .dot-good { background: var(--green); }
  .dot-def  { background: var(--amber); }
  .dot-bad  { background: var(--red); }

  /* Checklist table (base - result columns are type-specific, see extraCss) */
  .cl-table { width: 100%; border-collapse: collapse; }
  .cl-table th, .cl-table td {
    border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top;
  }
  .cl-table thead tr { background: var(--catHdr); }
  .cl-table th {
    font-weight: 700; color: var(--inkSoft); font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.4px; text-align: center;
  }
  .cl-sec-row td {
    background: var(--catHdr); font-weight: 700;
    font-size: 11px; color: var(--inkSoft); padding: 6px 8px; text-align: left;
  }
  .col-num { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-check { width: 44px; text-align: center; }
  .item-comment { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 4px; }
  .item-photo { display: inline-block; margin: 4px 4px 0 0; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Maintenance table */
  .maint-table { width: 100%; border-collapse: collapse; }
  .maint-table th, .maint-table td {
    border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top;
  }
  .maint-table thead tr { background: var(--catHdr); }
  .maint-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; text-align: center; }
  .col-maint-check { width: 56px; text-align: center; }
  .col-maint-date { width: 110px; }

  /* Verdict */
  .verdict-block { margin-top: 14px; }
  .verdict-option {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 8px 10px; border: 1px solid var(--hairline);
    border-radius: 8px; margin-bottom: 6px; font-size: 11px;
  }
  .verdict-option.selected { border-color: var(--accent); background: #F0FDF9; }
  .verdict-box {
    width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid var(--hairline);
    flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center;
  }
  .verdict-box.checked { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked::after { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-label { line-height: 1.4; }

  /* Notes */
  .notes-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .notes-block {
    margin-top: 4px; padding: 10px 12px;
    border: 0.5px solid var(--hairline); border-radius: 8px;
    min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5;
  }

  /* Summary photos */
  .summary-photos { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .summary-photos img { width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Signature (grid columns are type-specific, set in extraCss) */
  .sig-block {
    display: grid; gap: 0; margin-top: 8px;
    border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden;
  }
  .sig-cell { padding: 10px 12px; border-right: 0.5px solid var(--hairline); }
  .sig-cell:last-child { border-right: none; }
  .sig-lbl { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
  .sig-name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .sig-role { font-size: 10px; color: var(--inkSoft); margin-top: 2px; }
  .sig-img  { max-height: 48px; max-width: 100%; }
  .sig-date { font-size: 11px; color: var(--ink); margin-top: 4px; }

  /* Footer */
  .footer {
    margin-top: 32px; padding-top: 10px;
    border-top: 1px solid var(--hairline);
    display: flex; justify-content: space-between;
    font-size: 10px; color: var(--inkFaint);
  }

  /* ── Unified signatures section (wizard creator + empty hand-sign slots) ── */
  .signatures-section { margin-top: 18px; page-break-inside: avoid; }
  .signatures-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .signatures-heading-text {
    font-size: 12px; font-weight: 700; color: var(--ink);
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .signatures-heading-rule { flex: 1; height: 1px; background: var(--hairline); }

  .signatures-creator { margin-bottom: 14px; }
  .signatures-creator-img {
    height: 90px;
    display: flex; align-items: center; justify-content: flex-start;
    padding: 2px 0;
  }
  .signatures-creator-img img { max-height: 90px; max-width: 260px; display: block; }
  .signatures-creator-rule { height: 1px; background: var(--ink); margin-bottom: 4px; }
  .signatures-creator-meta { display: flex; align-items: baseline; gap: 10px; }
  .signatures-creator-name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .signatures-creator-date { font-size: 10px; color: var(--inkSoft); }

  .signatures-empty-slot {
    padding: 8px 0;
    border-top: 1px solid var(--hairline);
  }
  .signatures-empty-slot:first-child { border-top: none; }
  .signatures-empty-row {
    display: flex; align-items: flex-end; gap: 8px;
    margin-bottom: 10px;
  }
  .signatures-empty-row:last-child { margin-bottom: 0; }
  .signatures-empty-row-split { gap: 24px; }
  .signatures-empty-half {
    display: flex; align-items: flex-end; gap: 6px; flex: 1;
  }
  .signatures-empty-label {
    font-size: 10px; color: var(--inkSoft); font-weight: 600; white-space: nowrap;
  }
  .signatures-empty-line {
    display: inline-block; border-bottom: 1px solid var(--ink); align-self: flex-end;
  }
  .signatures-empty-line-long { flex: 1; height: 70px; }
  .signatures-empty-line-short { flex: 1; height: 32px; }

  @media print {
    html, body { background: #fff; }
    .page { padding: 0; max-width: none; }
    @page { margin: 18mm 14mm; }
  }
`,S="შიდა სამსახურებრივი დოკუმენტი",F=["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"];function z(t){const a=new Date(t);return Number.isNaN(a.getTime())?"":`${a.getDate()} ${F[a.getMonth()]} ${a.getFullYear()}`}function j(t){if(!t)return"";const a=!!t.creatorSignature,n=Math.max(0,t.additionalRowsCount|0);if(!a&&n===0)return"";const e="ხელმოწერები",s=a?C(t.creatorSignature):"",r=n>0?D(n):"";return`
    <div class="signatures-section">
      <div class="signatures-heading">
        <span class="signatures-heading-text">${i(e)}</span>
        <div class="signatures-heading-rule"></div>
      </div>
      ${s}
      ${r}
    </div>
  `}function C(t){const a=z(t.capturedAtIso);return`
    <div class="signatures-creator">
      <div class="signatures-creator-img">
        <img src="data:image/png;base64,${i(t.pngBase64)}" alt="ხელმოწერა" />
      </div>
      <div class="signatures-creator-rule"></div>
      <div class="signatures-creator-meta">
        <span class="signatures-creator-name">${i(t.creatorName||"-")}</span>
        ${a?`<span class="signatures-creator-date">${i(a)}</span>`:""}
      </div>
    </div>
  `}function D(t){const a=[];for(let n=0;n<t;n+=1)a.push(`
      <div class="signatures-empty-slot">
        <div class="signatures-empty-row">
          <span class="signatures-empty-label">ხელმოწერა:</span>
          <span class="signatures-empty-line signatures-empty-line-long"></span>
        </div>
        <div class="signatures-empty-row signatures-empty-row-split">
          <span class="signatures-empty-half">
            <span class="signatures-empty-label">სახელი:</span>
            <span class="signatures-empty-line signatures-empty-line-short"></span>
          </span>
          <span class="signatures-empty-half">
            <span class="signatures-empty-label">თარიღი:</span>
            <span class="signatures-empty-line signatures-empty-line-short"></span>
          </span>
        </div>
      </div>
    `);return a.join("")}function K(t,a,n){const{inspection:e,projectName:s,signaturesSession:r=null}=a,{docId:p,docDate:d}=t.meta(e),l=u(t.docTitle,e)??"",o=u(t.docSubtitle,e),c=u(t.pdfFooterLabel,e)??"",h=u(t.internalBadge,e)??S,f=t.headerMetaLines?t.headerMetaLines(e):[],x=t.blocks.map(y=>H(y,e,n)).filter(Boolean).join(`
`),v=j(r),g=`${w}
${t.extraCss??""}`,$=l.replace(/<br\s*\/?>/gi," ");return`<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${i($)}</title>
  <style>${g}</style>
</head>
<body>
  <div class="page">
    ${E({docTitle:l,docSubtitle:o,badge:h,projectName:s,docId:p,docDate:d,metaLines:f})}
    ${x}
    ${v}
    ${T(c,p,d)}
  </div>
</body>
</html>`}function u(t,a){return typeof t=="function"?t(a):t}function E(t){const{docTitle:a,docSubtitle:n,badge:e,projectName:s,docId:r,docDate:p,metaLines:d}=t,l=n?`<div class="doc-sub">${i(n)}</div>`:"",o=d.map(c=>`${i(c)}<br>`).join("");return`
    <div class="header">
      <div class="header-left">
        <div class="logo-box"><span class="logo-text">SR</span></div>
        <div class="project-name">${i(s)}</div>
      </div>
      <div class="header-center">
        <div class="doc-title">${a}</div>
        ${l}
      </div>
      <div class="header-right">
        <span class="internal-badge">${i(e)}</span>
        <div class="doc-meta">${o}${i(p)}<br>ID: ${i(r)}</div>
      </div>
    </div>
  `}function T(t,a,n){return`
    <div class="footer">
      <span>${i(t)}</span>
      <span>${i(n)} · ID ${i(a)}</span>
    </div>
  `}function H(t,a,n){switch(t.kind){case"machineSpecs":return L(t.title,t.specs(a));case"infoFields":return N(t.title,t.fields(a));case"checklist":return I(t,t.sections(a),n);case"maintenance":return O(t,t.rows(a));case"verdict":return U(t,a,n);case"signatures":return G(t.title,t.lines(a));case"custom":return t.render(a,n);default:return t}}function m(t){return`<div class="section-title">${i(t)}</div>`}function L(t,a){const n=a.map(s=>`<th>${i(s.label)}</th>`).join(""),e=a.map(s=>`<td>${i(s.value)||"-"}</td>`).join("");return`
    ${m(t)}
    <table class="specs-table">
      <thead><tr>${n}</tr></thead>
      <tbody><tr>${e}</tr></tbody>
    </table>
  `}function b(t){return!t.label&&!t.value?"":`<span class="lbl">${i(t.label)}</span><span class="val">${i(t.value)||"-"}</span>`}function N(t,a){let n="",e=0;for(;e<a.length;){const s=a[e];if(s.full){n+=`<tr><td colspan="2">${b(s)}</td></tr>`,e+=1;continue}const r=e+1<a.length&&!a[e+1].full?a[e+1]:null;n+=`<tr><td>${b(s)}</td><td>${r?b(r):""}</td></tr>`,e+=r?2:1}return`
    ${m(t)}
    <table class="info-table">${n}</table>
  `}const A={good:"ck-good",warn:"ck-def",bad:"ck-bad",neutral:""},B={good:"dot-good",warn:"dot-def",bad:"dot-bad"};function P(t){return`<div class="legend">${t.map(n=>`<span class="legend-item"><span class="dot ${B[n.tone]??""}"></span>${i(n.text)}</span>`).join("")}</div>`}function _(t,a){if(!t||t.length===0)return"";const n=t.map(e=>{const s=a[e];return s?`<span class="item-photo"><img src="${i(s)}" alt="ფოტო" /></span>`:""}).join("");return n?`<div style="margin-top:4px;">${n}</div>`:""}function I(t,a,n){const e=t.resultOptions,s=2+e.length,r="შემოწმების პუნქტი",p=t.layout==="checks"?e.map(l=>`<th class="col-check">${i(l.short??l.label)}</th>`).join(""):'<th class="col-result">შედეგი</th>';let d="";for(const l of a){l.title&&(d+=`<tr class="cl-sec-row"><td colspan="${t.layout==="checks"?s:3}">${i(l.title)}</td></tr>`);for(const o of l.items){const c=o.comment?`<div class="item-comment">${i(o.comment)}</div>`:"",h=o.description?`<div style="color:var(--inkSoft);font-size:10px;margin-top:2px;">${i(o.description)}</div>`:"",f=_(o.photoPaths,n),x=`
        <td>
          <strong>${i(o.label)}</strong>
          ${h}${c}${f}
        </td>`;if(t.layout==="checks"){const v=e.map(g=>o.result!==g.value||!g.mark?'<td class="col-check"></td>':`<td class="col-check"><span class="${A[g.tone??"neutral"]??""}">${g.mark}</span></td>`).join("");d+=`<tr><td class="col-num">${i(String(o.id))}</td>${x}${v}</tr>`}else d+=`<tr><td class="col-num">${i(String(o.id))}</td>${x}<td class="col-result">${M(e,o.result)}</td></tr>`}}return`
    ${m(t.title)}
    ${t.legend?P(t.legend):""}
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>${i(r)}</th>
          ${p}
        </tr>
      </thead>
      <tbody>${d}</tbody>
    </table>
  `}function M(t,a){const n=t.find(r=>r.value===a);if(!n)return'<span class="pill pill-null">-</span>';const e=n.tone??"neutral";return`<span class="pill ${e==="good"?"pill-good":e==="warn"?"pill-def":e==="bad"?"pill-bad":"pill-null"}">${n.mark?`${n.mark} `:""}${i(n.label)}</span>`}function O(t,a){const n=a.map(e=>{const s=e.answer==="yes"?'<span class="ck-good">✓</span>':"",r=e.answer==="no"?'<span class="ck-bad">✗</span>':"";return`
      <tr>
        <td class="col-num">${i(String(e.id))}</td>
        <td>${i(e.label)}</td>
        <td class="col-maint-check">${s}</td>
        <td class="col-maint-check">${r}</td>
        <td class="col-maint-date">${e.date?i(k(e.date)):""}</td>
      </tr>`}).join("");return`
    ${m(t.title)}
    <table class="maint-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>${i("შემოწმების პუნქტი")}</th>
          <th class="col-maint-check">${i(t.yesLabel)}</th>
          <th class="col-maint-check">${i(t.noLabel)}</th>
          <th class="col-maint-date">${i(t.dateLabel)}</th>
        </tr>
      </thead>
      <tbody>${n}</tbody>
    </table>
  `}function U(t,a,n){const e=t.selected(a),s=t.options.map(c=>`
      <div class="verdict-option ${c.value===e?"selected":""}">
        <div class="verdict-box ${c.value===e?"checked":""}"></div>
        <span class="verdict-label">${i(c.label)}</span>
      </div>`).join(""),r=t.notes?t.notes(a):null,p=r?`<div class="notes-label" style="margin-top:14px;">${i(t.notesLabel??"შენიშვნები / ხარვეზები")}</div>
       <div class="notes-block">${i(r)}</div>`:"",l=(t.summaryPhotos?t.summaryPhotos(a):[]).map(c=>n[c]?`<img src="${i(n[c])}" alt="ფოტო" />`:"").join(""),o=l?`<div class="notes-label" style="margin-top:14px;">${i("ფოტოები")}</div>
       <div class="summary-photos">${l}</div>`:"";return`
    ${m(t.title)}
    <div class="verdict-block">${s}</div>
    ${p}
    ${o}
  `}function G(t,a){const n=a.map(e=>{const s=e.pngDataUrl?`<img class="sig-img" src="${i(e.pngDataUrl)}" alt="ხელმოწერა" />`:'<div style="height:48px;border-bottom:1px dashed var(--hairline);"></div>';return`
      <div class="sig-cell">
        ${e.role?`<div class="sig-lbl">${i(e.role)}</div>`:""}
        ${e.name?`<div class="sig-name">${i(e.name)}</div>`:""}
        ${e.position?`<div class="sig-role">${i(e.position)}</div>`:""}
        ${s}
        ${e.date?`<div class="sig-date">${i(e.date)}</div>`:""}
      </div>`}).join("");return`
    ${m(t)}
    <div class="sig-block">${n}</div>
  `}export{K as b};
