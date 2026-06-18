/**
 * Inspection schema language.
 *
 * One data-driven engine renders every equipment inspection to a PDF. Each
 * inspection type (excavator, forklift, …) supplies an `InspectionSchema`: a
 * description of *what* to render (header, ordered blocks, result vocabularies)
 * rather than hand-written HTML. This replaces ~10 near-identical lib/<type>Pdf.ts
 * builders (~80% copy-pasted CSS + scaffolding) with shared code + small descriptors.
 *
 * The block list is a discriminated union; the renderer (lib/inspection/pdf.ts)
 * has one function per `kind`. New block kinds are additive - declare the kind
 * here, handle it there. The `custom` kind is the escape hatch for genuinely
 * one-off sections so a type is never un-expressible.
 */

/**
 * Map of storage path → renderable image URL (data: on mobile, https on web).
 * Defined here (not in photos.ts) so the platform-free renderer and schemas can
 * reference the type without transitively importing React Native via photos.ts.
 */
export type PhotoMap = Record<string, string>;

/** A labeled value rendered in an info/specs grid. `full` spans both columns. */
export interface InfoField {
  label: string;
  value: string;
  full?: boolean;
}

/**
 * A result vocabulary entry - reused for checklist item results and for verdict
 * options. `mark`/`tone` drive the "checks" checklist layout and pill colors.
 */
export interface ResultOption {
  value: string;
  label: string;
  /** Short column header in the "checks" checklist layout (defaults to `label`). */
  short?: string;
  /** Glyph shown in a "checks" cell or pill (e.g. '✓', '?', '✗'). */
  mark?: string;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
}

/** A legend row above a checklist (dot color + descriptive text). */
export interface LegendItem {
  tone: 'good' | 'warn' | 'bad';
  text: string;
}

/** A checklist item normalized from a type's native item-state shape. */
export interface RenderItem {
  id: number | string;
  label: string;
  description?: string;
  result: string | null;
  comment?: string | null;
  photoPaths?: string[];
}

/** A group of checklist items under an optional section header row. */
export interface ChecklistSection {
  title?: string;
  items: RenderItem[];
}

/** A yes/no(/date) maintenance row. */
export interface MaintRow {
  id: number | string;
  label: string;
  answer: 'yes' | 'no' | null;
  date?: string | null;
}

/** One rendered signature cell. `pngDataUrl` is a resolved data:/https: URL. */
export interface SignatureLine {
  role?: string | null;
  name?: string | null;
  position?: string | null;
  pngDataUrl?: string | null;
  date?: string | null;
}

/**
 * An ordered PDF section. Selectors receive the (typed) inspection; the renderer
 * supplies resolved photos when rendering checklist item photos / custom blocks.
 */
export type PdfBlock<T> =
  | { kind: 'machineSpecs'; title: string; specs: (d: T) => InfoField[] }
  | { kind: 'infoFields'; title: string; fields: (d: T) => InfoField[] }
  | {
      kind: 'checklist';
      title: string;
      layout: 'checks' | 'pill';
      resultOptions: ResultOption[];
      legend?: LegendItem[];
      sections: (d: T) => ChecklistSection[];
    }
  | {
      kind: 'maintenance';
      title: string;
      yesLabel: string;
      noLabel: string;
      dateLabel: string;
      rows: (d: T) => MaintRow[];
    }
  | {
      kind: 'verdict';
      title: string;
      options: ResultOption[];
      selected: (d: T) => string | null;
      notesLabel?: string;
      notes?: (d: T) => string | null;
      summaryPhotos?: (d: T) => string[];
    }
  | { kind: 'signatures'; title: string; lines: (d: T) => SignatureLine[] }
  | { kind: 'custom'; render: (d: T, photos: PhotoMap) => string };

/**
 * Complete description of one inspection type: dispatch/persistence keys plus
 * the ordered PDF block list. (The service factory, lib/inspection/service.ts,
 * consumes `table`/`pathPrefix`/`columns`; columns are added there to keep PDF
 * and persistence concerns separated within the same descriptor object.)
 */
export interface InspectionSchema<T = any> {
  /** Dispatch key - matches `template.category`. */
  category: string;
  /** Postgres table backing this type. */
  table: string;
  /** Storage path prefix for this type's photos (e.g. 'excavator'). */
  pathPrefix: string;
  /** Seed template UUID. */
  templateId?: string;

  /** Header center title (may contain literal <br>); a fn for per-variant titles. */
  docTitle: string | ((d: T) => string);
  /** English subtitle under the title. */
  docSubtitle?: string | ((d: T) => string);
  /** Top-right badge text; defaults to the standard internal-document label. */
  internalBadge?: string | ((d: T) => string);
  /** Footer left label (e.g. 'Hubble - ექსკავატორის …'). */
  pdfFooterLabel: string | ((d: T) => string);
  /** Stable label for generatePdfName (ASCII, e.g. 'ExcavatorInspection'). */
  pdfNameLabel: string;
  /** Type-specific CSS appended after BASE_PDF_CSS. */
  extraCss?: string;

  /** Header metadata derived from the inspection. */
  meta: (d: T) => { docId: string; docDate: string };
  /** Extra lines prepended to the top-right doc-meta block (e.g. '№ ACT-123'). */
  headerMetaLines?: (d: T) => string[];
  /** Ordered PDF sections. */
  blocks: PdfBlock<T>[];
  /** Every answer/summary photo storage path, for pre-resolution. */
  collectPhotoPaths: (d: T) => string[];
}

/** Standard top-right badge shared by every equipment inspection. */
export const INTERNAL_DOC_BADGE = 'შიდა სამსახურებრივი დოკუმენტი';
