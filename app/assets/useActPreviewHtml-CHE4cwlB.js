import{r as d,k as t}from"./vendor-BMYLj6rE.js";import{s as C,u as I,d as U}from"./photoUpload-C45rh8Zg.js";import{h as O,b2 as N,b3 as $}from"./index-8VpAInaW.js";import{a5 as D,X as A}from"./icons-B-Lph0NP.js";import{b as L}from"./pdf-Cn4nBGdm.js";function M({paths:o,prefix:a,inspectionId:l,itemId:s,onAdd:i,onRemove:p,placeholder:f,disabled:m=!1}){const c=d.useRef(null),[g,v]=d.useState(!1),[b,u]=d.useState(!1),[y,j]=d.useState(null),[h,P]=d.useState({});d.useEffect(()=>{let e=!1;const r=o.filter(n=>!h[n]);if(r.length!==0)return Promise.all(r.map(async n=>{try{return[n,await C(n)]}catch{return[n,""]}})).then(n=>{e||P(E=>{const k={...E};for(const[z,R]of n)k[z]=R;return k})}),()=>{e=!0}},[o.join(",")]);async function x(e){if(!(!e||e.length===0)){v(!0),j(null);try{for(const r of Array.from(e)){const n=await I(a,l,s,r);i(n)}}catch(r){j(O(r))}finally{v(!1),c.current&&(c.current.value="")}}}async function S(e){try{await U(e)}catch{}p(e)}const w=o.length>0;return t.jsxs("div",{children:[!m&&!w&&t.jsxs("div",{role:"button",tabIndex:0,onClick:()=>{var e;return(e=c.current)==null?void 0:e.click()},onKeyDown:e=>{var r;(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),(r=c.current)==null||r.click())},onDragOver:e=>{e.preventDefault(),u(!0)},onDragLeave:()=>u(!1),onDrop:e=>{e.preventDefault(),u(!1),x(e.dataTransfer.files)},className:"flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center outline-none transition-colors focus-visible:border-brand-500",style:{borderColor:b?"var(--brand-500)":"var(--border-default)",background:b?"var(--brand-50)":"var(--bg-body)",padding:"28px 16px"},children:[t.jsx(D,{size:20,color:"var(--text-muted)"}),t.jsx("p",{style:{fontSize:13,color:"var(--text-secondary)",fontWeight:500},children:g?"იტვირთება...":"ჩააგდეთ ფოტოები ან დააჭირეთ ასარჩევად"}),f&&t.jsx("p",{style:{fontSize:12,color:"var(--text-muted)"},children:f})]}),w&&t.jsxs("div",{className:"flex flex-wrap gap-2",children:[!m&&t.jsxs("div",{role:"button",tabIndex:0,onClick:()=>{var e;return(e=c.current)==null?void 0:e.click()},onKeyDown:e=>{var r;(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),(r=c.current)==null||r.click())},onDragOver:e=>{e.preventDefault(),u(!0)},onDragLeave:()=>u(!1),onDrop:e=>{e.preventDefault(),u(!1),x(e.dataTransfer.files)},className:"flex cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed text-center outline-none transition-colors focus-visible:border-brand-500",style:{width:120,height:120,borderRadius:8,borderColor:b?"var(--brand-500)":"var(--border-default)",background:b?"var(--brand-50)":"var(--bg-body)"},children:[t.jsx(D,{size:20,color:"var(--text-muted)"}),t.jsx("span",{style:{fontSize:12,color:"var(--text-secondary)",fontWeight:500},children:g?"იტვირთება...":"დამატება"})]}),o.map((e,r)=>t.jsxs("div",{className:"relative",style:{width:120,height:120},children:[t.jsx("a",{href:h[e]||void 0,target:"_blank",rel:"noreferrer",className:"block h-full w-full overflow-hidden border border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",style:{borderRadius:8},children:h[e]?t.jsx("img",{src:h[e],alt:`ფოტო ${r+1}`,className:"h-full w-full object-cover"}):t.jsx("div",{className:"h-full w-full bg-neutral-100"})}),!m&&t.jsx("button",{type:"button",onClick:()=>S(e),"aria-label":"ფოტოს წაშლა",style:{position:"absolute",top:6,right:6,width:20,height:20},className:"flex items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500",children:t.jsx(A,{size:12})})]},e))]}),y&&t.jsx("p",{className:"mt-1 text-xs text-red-600",children:y}),!m&&t.jsx("input",{ref:c,type:"file",accept:"image/*",multiple:!0,className:"hidden",onChange:e=>x(e.target.files)})]})}const H='<span class="ph">— აირჩიეთ</span>';function T(o={}){const a=i=>i?N(i):H,l=new Date().toLocaleDateString("ka-GE",{year:"numeric",month:"long",day:"numeric"}),s=Array.from({length:6},()=>'<div class="dotted-row"></div>').join(`
      `);return`<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>შემოწმების აქტი</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, 'Noto Sans Georgian', sans-serif; background: #fff; color: #111827; }
    .page { padding: 40px 36px; }
    .doc-title { text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 0.3px; }
    .doc-rule { border-bottom: 2px solid #111827; margin: 14px 0 22px; }
    .meta { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    .meta td { border: 0.5px solid #d1d5db; padding: 8px 10px; font-size: 12px; }
    .meta .lbl { width: 130px; background: #f3f4f6; font-weight: 600; color: #4b5563; }
    .ph { color: #9ca3af; font-style: italic; }
    .dotted-row { border-bottom: 1px dotted #d1d5db; height: 26px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="doc-title">შემოწმების აქტი</div>
    <div class="doc-rule"></div>
    <table class="meta">
      <tr><td class="lbl">შაბლონი</td><td>${a(o.templateName)}</td></tr>
      <tr><td class="lbl">ობიექტი</td><td>${a(o.projectName)}</td></tr>
      <tr><td class="lbl">შემმოწმებელი</td><td>${a(o.inspectorName)}</td></tr>
      <tr><td class="lbl">თარიღი</td><td>${N(l)}</td></tr>
    </table>
    ${s}
  </div>
</body>
</html>`}function X(o){const{category:a,item:l,projectName:s,templateName:i,inspectorName:p}=o;return d.useMemo(()=>{const f=$(a);if(f&&l)try{return L(f,{inspection:l,projectName:s,signaturesSession:null},{})}catch{}return T({templateName:i??null,projectName:s||null,inspectorName:p??null})},[a,l,s,i,p])}export{M as P,T as b,X as u};
