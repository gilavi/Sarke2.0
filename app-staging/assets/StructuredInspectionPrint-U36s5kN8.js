import{al as L,a6 as B,u as I,r as w,L as D,j as g}from"./vendor-BfsXFn1x.js";import{M as n,N,L as T,O as H,i as _,p as M}from"./index-BkWPmHGR.js";import"./threejs-DsWYiBl6.js";import"./supabase-9NZ6MRFe.js";import"./icons-B6HnT3dZ.js";import"./leaflet-DtNId1PC.js";const O=`
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
`,R="შიდა სამსახურებრივი დოკუმენტი",U=["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"];function K(t){const e=new Date(t);return Number.isNaN(e.getTime())?"":`${e.getDate()} ${U[e.getMonth()]} ${e.getFullYear()}`}function q(t){if(!t)return"";const e=!!t.creatorSignature,i=Math.max(0,t.additionalRowsCount|0);if(!e&&i===0)return"";const a="ხელმოწერები",s=e?G(t.creatorSignature):"",l=i>0?W(i):"";return`
    <div class="signatures-section">
      <div class="signatures-heading">
        <span class="signatures-heading-text">${n(a)}</span>
        <div class="signatures-heading-rule"></div>
      </div>
      ${s}
      ${l}
    </div>
  `}function G(t){const e=K(t.capturedAtIso);return`
    <div class="signatures-creator">
      <div class="signatures-creator-img">
        <img src="data:image/png;base64,${n(t.pngBase64)}" alt="ხელმოწერა" />
      </div>
      <div class="signatures-creator-rule"></div>
      <div class="signatures-creator-meta">
        <span class="signatures-creator-name">${n(t.creatorName||"-")}</span>
        ${e?`<span class="signatures-creator-date">${n(e)}</span>`:""}
      </div>
    </div>
  `}function W(t){const e=[];for(let i=0;i<t;i+=1)e.push(`
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
    `);return e.join("")}function Q(t,e,i){const{inspection:a,projectName:s,signaturesSession:l=null}=e,{docId:p,docDate:o}=t.meta(a),c=S(t.docTitle,a)??"",r=S(t.docSubtitle,a),d=S(t.pdfFooterLabel,a)??"",h=S(t.internalBadge,a)??R,v=t.headerMetaLines?t.headerMetaLines(a):[],f=t.blocks.map(F=>J(F,a,i)).filter(Boolean).join(`
`),y=q(l),u=`${O}
${t.extraCss??""}`,k=c.replace(/<br\s*\/?>/gi," ");return`<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${n(k)}</title>
  <style>${u}</style>
</head>
<body>
  <div class="page">
    ${V({docTitle:c,docSubtitle:r,badge:h,projectName:s,docId:p,docDate:o,metaLines:v})}
    ${f}
    ${y}
    ${Y(d,p,o)}
  </div>
</body>
</html>`}function S(t,e){return typeof t=="function"?t(e):t}function V(t){const{docTitle:e,docSubtitle:i,badge:a,projectName:s,docId:l,docDate:p,metaLines:o}=t,c=i?`<div class="doc-sub">${n(i)}</div>`:"",r=o.map(d=>`${n(d)}<br>`).join("");return`
    <div class="header">
      <div class="header-left">
        <div class="logo-box"><span class="logo-text">SR</span></div>
        <div class="project-name">${n(s)}</div>
      </div>
      <div class="header-center">
        <div class="doc-title">${e}</div>
        ${c}
      </div>
      <div class="header-right">
        <span class="internal-badge">${n(a)}</span>
        <div class="doc-meta">${r}${n(p)}<br>ID: ${n(l)}</div>
      </div>
    </div>
  `}function Y(t,e,i){return`
    <div class="footer">
      <span>${n(t)}</span>
      <span>${n(i)} · ID ${n(e)}</span>
    </div>
  `}function J(t,e,i){switch(t.kind){case"machineSpecs":return X(t.title,t.specs(e));case"infoFields":return Z(t.title,t.fields(e));case"checklist":return it(t,t.sections(e),i);case"maintenance":return rt(t,t.rows(e));case"verdict":return ot(t,e,i);case"signatures":return lt(t.title,t.lines(e));case"custom":return t.render(e,i);default:return t}}function b(t){return`<div class="section-title">${n(t)}</div>`}function X(t,e){const i=e.map(s=>`<th>${n(s.label)}</th>`).join(""),a=e.map(s=>`<td>${n(s.value)||"-"}</td>`).join("");return`
    ${b(t)}
    <table class="specs-table">
      <thead><tr>${i}</tr></thead>
      <tbody><tr>${a}</tr></tbody>
    </table>
  `}function j(t){return!t.label&&!t.value?"":`<span class="lbl">${n(t.label)}</span><span class="val">${n(t.value)||"-"}</span>`}function Z(t,e){let i="",a=0;for(;a<e.length;){const s=e[a];if(s.full){i+=`<tr><td colspan="2">${j(s)}</td></tr>`,a+=1;continue}const l=a+1<e.length&&!e[a+1].full?e[a+1]:null;i+=`<tr><td>${j(s)}</td><td>${l?j(l):""}</td></tr>`,a+=l?2:1}return`
    ${b(t)}
    <table class="info-table">${i}</table>
  `}const tt={good:"ck-good",warn:"ck-def",bad:"ck-bad",neutral:""},et={good:"dot-good",warn:"dot-def",bad:"dot-bad"};function at(t){return`<div class="legend">${t.map(i=>`<span class="legend-item"><span class="dot ${et[i.tone]??""}"></span>${n(i.text)}</span>`).join("")}</div>`}function nt(t,e){if(!t||t.length===0)return"";const i=t.map(a=>{const s=e[a];return s?`<span class="item-photo"><img src="${n(s)}" alt="ფოტო" /></span>`:""}).join("");return i?`<div style="margin-top:4px;">${i}</div>`:""}function it(t,e,i){const a=t.resultOptions,s=2+a.length,l="შემოწმების პუნქტი",p=t.layout==="checks"?a.map(c=>`<th class="col-check">${n(c.short??c.label)}</th>`).join(""):'<th class="col-result">შედეგი</th>';let o="";for(const c of e){c.title&&(o+=`<tr class="cl-sec-row"><td colspan="${t.layout==="checks"?s:3}">${n(c.title)}</td></tr>`);for(const r of c.items){const d=r.comment?`<div class="item-comment">${n(r.comment)}</div>`:"",h=r.description?`<div style="color:var(--inkSoft);font-size:10px;margin-top:2px;">${n(r.description)}</div>`:"",v=nt(r.photoPaths,i),f=`
        <td>
          <strong>${n(r.label)}</strong>
          ${h}${d}${v}
        </td>`;if(t.layout==="checks"){const y=a.map(u=>r.result!==u.value||!u.mark?'<td class="col-check"></td>':`<td class="col-check"><span class="${tt[u.tone??"neutral"]??""}">${u.mark}</span></td>`).join("");o+=`<tr><td class="col-num">${n(String(r.id))}</td>${f}${y}</tr>`}else o+=`<tr><td class="col-num">${n(String(r.id))}</td>${f}<td class="col-result">${st(a,r.result)}</td></tr>`}}return`
    ${b(t.title)}
    ${t.legend?at(t.legend):""}
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>${n(l)}</th>
          ${p}
        </tr>
      </thead>
      <tbody>${o}</tbody>
    </table>
  `}function st(t,e){const i=t.find(l=>l.value===e);if(!i)return'<span class="pill pill-null">-</span>';const a=i.tone??"neutral";return`<span class="pill ${a==="good"?"pill-good":a==="warn"?"pill-def":a==="bad"?"pill-bad":"pill-null"}">${i.mark?`${i.mark} `:""}${n(i.label)}</span>`}function rt(t,e){const i=e.map(a=>{const s=a.answer==="yes"?'<span class="ck-good">✓</span>':"",l=a.answer==="no"?'<span class="ck-bad">✗</span>':"";return`
      <tr>
        <td class="col-num">${n(String(a.id))}</td>
        <td>${n(a.label)}</td>
        <td class="col-maint-check">${s}</td>
        <td class="col-maint-check">${l}</td>
        <td class="col-maint-date">${a.date?n(N(a.date)):""}</td>
      </tr>`}).join("");return`
    ${b(t.title)}
    <table class="maint-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>${n("შემოწმების პუნქტი")}</th>
          <th class="col-maint-check">${n(t.yesLabel)}</th>
          <th class="col-maint-check">${n(t.noLabel)}</th>
          <th class="col-maint-date">${n(t.dateLabel)}</th>
        </tr>
      </thead>
      <tbody>${i}</tbody>
    </table>
  `}function ot(t,e,i){const a=t.selected(e),s=t.options.map(d=>`
      <div class="verdict-option ${d.value===a?"selected":""}">
        <div class="verdict-box ${d.value===a?"checked":""}"></div>
        <span class="verdict-label">${n(d.label)}</span>
      </div>`).join(""),l=t.notes?t.notes(e):null,p=l?`<div class="notes-label" style="margin-top:14px;">${n(t.notesLabel??"შენიშვნები / ხარვეზები")}</div>
       <div class="notes-block">${n(l)}</div>`:"",c=(t.summaryPhotos?t.summaryPhotos(e):[]).map(d=>i[d]?`<img src="${n(i[d])}" alt="ფოტო" />`:"").join(""),r=c?`<div class="notes-label" style="margin-top:14px;">${n("ფოტოები")}</div>
       <div class="summary-photos">${c}</div>`:"";return`
    ${b(t.title)}
    <div class="verdict-block">${s}</div>
    ${p}
    ${r}
  `}function lt(t,e){const i=e.map(a=>{const s=a.pngDataUrl?`<img class="sig-img" src="${n(a.pngDataUrl)}" alt="ხელმოწერა" />`:'<div style="height:48px;border-bottom:1px dashed var(--hairline);"></div>';return`
      <div class="sig-cell">
        ${a.role?`<div class="sig-lbl">${n(a.role)}</div>`:""}
        ${a.name?`<div class="sig-name">${n(a.name)}</div>`:""}
        ${a.position?`<div class="sig-role">${n(a.position)}</div>`:""}
        ${s}
        ${a.date?`<div class="sig-date">${n(a.date)}</div>`:""}
      </div>`}).join("");return`
    ${b(t)}
    <div class="sig-block">${i}</div>
  `}function xt({actKey:t}){var z,E;const{id:e}=L(),[i]=B(),a=i.get("preview")==="1",l=((z=I().state)==null?void 0:z.signaturesSession)??null,p=w.useRef(null),o=T(t),c=D({queryKey:o?o.descriptor.detailKey(e):["structured-print-missing",e],queryFn:()=>o.descriptor.get(e),enabled:!!o&&!!e}),r=c.data??null,d=r&&o?o.descriptor.getProjectId(r):null,h=D({queryKey:M.detail(d),queryFn:()=>_(d),enabled:!!d}),[v,f]=w.useState({}),[y,u]=w.useState(!1);w.useEffect(()=>{if(!o||!r)return;const x=o.schema.collectPhotoPaths(r);let m=!1;return Promise.all(x.map(async $=>{try{return[$,await H($)]}catch{return[$,""]}})).then($=>{if(m)return;const P={};for(const[A,C]of $)C&&(P[A]=C);f(P),u(!0)}),()=>{m=!0}},[o,r]);const k=c.isSuccess&&(h.isSuccess||!d)&&y;if(!o)return g.jsx("p",{style:{padding:24},children:"უცნობი შემოწმების ტიპი."});if(c.isLoading)return g.jsx("p",{style:{padding:24},children:"იტვირთება…"});if(!r)return g.jsx("p",{style:{padding:24},children:"აქტი ვერ მოიძებნა."});if(!k)return g.jsx("p",{style:{padding:24},children:"იტვირთება…"});const F=Q(o.schema,{inspection:r,projectName:((E=h.data)==null?void 0:E.name)??"",signaturesSession:l},v);return g.jsxs(g.Fragment,{children:[g.jsxs("div",{style:{position:"sticky",top:0,background:"#FAFAFA",borderBottom:"1px solid #E5E7EB",padding:"10px 16px",display:"flex",gap:8,justifyContent:"flex-end",zIndex:10},children:[g.jsx("button",{onClick:()=>window.history.back(),style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #D1D5DB",background:"#fff"},children:"დახურვა"}),g.jsx("button",{onClick:()=>{var x,m;return(m=(x=p.current)==null?void 0:x.contentWindow)==null?void 0:m.print()},style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #2F855A",background:"#2F855A",color:"#fff"},children:"ბეჭდვა"})]}),g.jsx("iframe",{ref:p,srcDoc:F,style:{width:"100%",height:"calc(100vh - 53px)",border:"none",display:"block"},title:o.descriptor.title,onLoad:()=>{var x,m;a||(m=(x=p.current)==null?void 0:x.contentWindow)==null||m.print()}})]})}export{xt as default};
