async function d(o){const r=await(await fetch(o)).blob();return new Promise((i,e)=>{const t=new FileReader;t.onload=()=>i(t.result),t.onerror=()=>e(t.error??new Error("FileReader failed")),t.readAsDataURL(r)})}function p(o=500){typeof window>"u"||setTimeout(()=>{try{window.print()}catch{}},o)}const a=`
  @page { size: A4; margin: 18mm 16mm; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  .doc {
    font-family: 'Inter', system-ui, sans-serif;
    color: #111827;
    max-width: 178mm;
    margin: 0 auto;
    font-size: 11pt;
    line-height: 1.5;
  }
  .doc h1 {
    font-size: 18pt;
    margin: 0 0 4pt 0;
    text-align: center;
    font-weight: 700;
  }
  .doc h2 {
    font-size: 13pt;
    margin: 16pt 0 6pt 0;
    border-bottom: 1px solid #E5E7EB;
    padding-bottom: 4pt;
    font-weight: 700;
  }
  .doc .muted { color: #6B7280; font-size: 10pt; }
  .doc .field { margin: 4pt 0; }
  .doc .field-label { font-weight: 600; color: #374151; display: inline-block; min-width: 32mm; }
  .doc .row { display: flex; gap: 8pt; flex-wrap: wrap; }
  .doc .photo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6pt;
    margin-top: 6pt;
  }
  .doc .photo-grid img {
    width: 100%;
    height: auto;
    border: 1px solid #D1D5DB;
    border-radius: 2pt;
  }
  .doc table { width: 100%; border-collapse: collapse; margin: 6pt 0; }
  .doc th, .doc td {
    border: 1px solid #D1D5DB;
    padding: 4pt 6pt;
    text-align: left;
    font-size: 10pt;
    vertical-align: top;
  }
  .doc th { background: #F3F4F6; font-weight: 700; }
  .doc .signature-block {
    margin-top: 24pt;
    display: flex;
    justify-content: space-between;
    gap: 16pt;
  }
  .doc .signature-block > div {
    flex: 1;
    border-top: 1px solid #111827;
    padding-top: 4pt;
    font-size: 10pt;
  }
  .print-toolbar {
    position: sticky;
    top: 0;
    background: #FAFAFA;
    border-bottom: 1px solid #E5E7EB;
    padding: 10px 16px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    z-index: 10;
  }
  .print-toolbar button {
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid #D1D5DB;
    background: #fff;
  }
  .print-toolbar button.primary {
    background: #2F855A;
    color: #fff;
    border-color: #2F855A;
  }
`;export{a as A,p,d as u};
