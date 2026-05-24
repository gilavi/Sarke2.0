// Backwards-compatible barrel for the inspection PDF template. The actual
// builder + render helpers live under `./pdf/inspection/`. Keep this file
// so existing imports of `from '../lib/inspectionPdfTemplate'` continue to
// work (mobile callers via lib/pdf.ts, plus the separate web-app codebase).

export * from './pdf/inspection';
