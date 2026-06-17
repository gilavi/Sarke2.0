/**
 * Excavator inspection schema - web mirror of the Expo app's
 * `lib/inspection/schemas/excavator.ts` (the `@root` import is eslint-banned, so
 * it is kept in sync by hand). machine-specs grid + document-info grid + four
 * "checks" checklist sections + yes/no/date maintenance table + verdict.
 *
 * Regulatory: the persisted single-signature block is NOT rendered here. The
 * captured signature is appended by `buildInspectionPdf` from the in-memory
 * session (never persisted).
 */
import { fmtDate } from '../escape';
import type { InspectionSchema, RenderItem } from '../schema';
import {
  ENGINE_ITEMS,
  UNDERCARRIAGE_ITEMS,
  CABIN_ITEMS,
  SAFETY_ITEMS,
  MAINTENANCE_ITEMS,
  EXCAVATOR_VERDICT_LABEL,
  EXCAVATOR_MACHINE_SPECS,
  EXCAVATOR_TEMPLATE_ID,
  type ExcavatorInspection,
  type ExcavatorChecklistEntry,
  type ExcavatorChecklistItemState,
  type ExcavatorVerdict,
} from '@/lib/types/excavator';

const EXTRA_CSS = `
  .specs-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .specs-table th, .specs-table td { border: 0.5px solid var(--hairline); padding: 6px 8px; text-align: center; font-size: 11px; }
  .specs-table thead tr { background: var(--catHdr); }
  .specs-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .specs-table td { font-weight: 600; color: var(--ink); }

  .col-check { width: 60px; text-align: center; }
  .ck-good { color: #059669; font-size: 14px; font-weight: 800; }
  .ck-def  { color: #D97706; font-size: 13px; font-weight: 800; }
  .ck-bad  { color: #DC2626; font-size: 14px; font-weight: 800; }

  .maint-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .maint-table th, .maint-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .maint-table thead tr { background: var(--catHdr); }
  .maint-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; text-align: center; }
  .col-maint-check { width: 48px; text-align: center; }
  .col-maint-date  { width: 110px; text-align: center; }
`;

function rowFor(entry: ExcavatorChecklistEntry, items: ExcavatorChecklistItemState[]): RenderItem {
  const state = items.find((i) => i.id === entry.id);
  return {
    id: entry.id,
    label: entry.label,
    description: entry.description,
    result: state?.result ?? null,
    comment: state?.comment ?? null,
    photoPaths: state?.photo_paths ?? [],
  };
}

export const excavatorSchema: InspectionSchema<ExcavatorInspection> = {
  category: 'excavator',
  table: 'excavator_inspections',
  pathPrefix: 'excavator',
  templateId: EXCAVATOR_TEMPLATE_ID,

  docTitle: 'ექსკავატორის ტექნიკური<br>შემოწმების აქტი',
  docSubtitle: 'Excavator Technical Inspection Report',
  pdfFooterLabel: 'Hubble - ექსკავატორის ტექნიკური შემოწმების აქტი',
  pdfNameLabel: 'ExcavatorInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({
    docId: d.id.slice(-8).toUpperCase(),
    docDate: fmtDate(d.completedAt ?? d.createdAt),
  }),

  collectPhotoPaths: (d) =>
    [...d.engineItems, ...d.undercarriageItems, ...d.cabinItems, ...d.safetyItems]
      .flatMap((i) => i.photo_paths ?? [])
      .concat(d.summaryPhotos ?? []),

  blocks: [
    {
      kind: 'machineSpecs',
      title: 'I - მანქანის ტექნიკური მახასიათებლები',
      specs: (d) => {
        const sp = d.machineSpecs ?? EXCAVATOR_MACHINE_SPECS;
        return [
          { label: 'წონა', value: sp.weight },
          { label: 'ძრავა', value: sp.engine },
          { label: 'სიმძლავრე', value: sp.power },
          { label: 'სიღრმე', value: sp.depth },
          { label: 'სვლა', value: sp.travel },
          { label: 'მაქს. გამბარი', value: sp.maxReach },
        ];
      },
    },
    {
      kind: 'infoFields',
      title: 'II - დოკუმენტის ინფორმაცია',
      fields: (d) => [
        { label: 'სახელმწიფო / ს.ნ ნომერი', value: d.registrationNumber ?? '' },
        { label: 'სერიული ნომერი', value: d.serialNumber ?? '' },
        { label: 'საინვენტარო ნომერი', value: d.inventoryNumber ?? '' },
        { label: '', value: '' },
        { label: 'ობიექტი / პროექტი', value: d.projectName ?? '' },
        { label: 'განყოფილება', value: d.department ?? '' },
        { label: 'შემოწმების თარიღი', value: fmtDate(d.inspectionDate) },
        { label: 'მოტო საათები', value: d.motoHours != null ? String(d.motoHours) : '' },
        { label: 'შემომწმებელი', value: d.inspectorName ?? '' },
        { label: 'ბოლო შემოწმების თარიღი', value: fmtDate(d.lastInspectionDate) },
      ],
    },
    {
      kind: 'checklist',
      title: 'III - შემოწმების ჩეკლისტი',
      layout: 'checks',
      resultOptions: [
        { value: 'good', label: 'კარგია', short: 'კარგია', mark: '✓', tone: 'good' },
        { value: 'deficient', label: 'ნაკლი', short: 'ნაკლი', mark: '?', tone: 'warn' },
        { value: 'unusable', label: 'გამოუსადეგარია', short: 'გამოუსადეგარია', mark: '✗', tone: 'bad' },
      ],
      legend: [
        { tone: 'good', text: '✓ კარგი - ნორმაში' },
        { tone: 'warn', text: '? ნაკლი - საჭიროებს მომსახურებას' },
        { tone: 'bad', text: '✗ გამოუსადეგარი' },
      ],
      sections: (d) => [
        { title: '1. ძრავი (Engine)', items: ENGINE_ITEMS.map((e) => rowFor(e, d.engineItems)) },
        { title: '2. სავალი ნაწილი (Undercarriage)', items: UNDERCARRIAGE_ITEMS.map((e) => rowFor(e, d.undercarriageItems)) },
        { title: '4. კაბინა (Cabin)', items: CABIN_ITEMS.map((e) => rowFor(e, d.cabinItems)) },
        { title: '5. უსაფრთხოება (Safety)', items: SAFETY_ITEMS.map((e) => rowFor(e, d.safetyItems)) },
      ],
    },
    {
      kind: 'maintenance',
      title: 'VI - ტექნიკური მომსახურება',
      yesLabel: 'კი',
      noLabel: 'არა',
      dateLabel: 'თარიღი',
      rows: (d) =>
        MAINTENANCE_ITEMS.map((entry) => {
          const st = d.maintenanceItems.find((i) => i.id === entry.id);
          return { id: entry.id, label: entry.label, answer: st?.answer ?? null, date: st?.date ?? null };
        }),
    },
    {
      kind: 'verdict',
      title: 'IV - დასკვნა',
      options: (Object.entries(EXCAVATOR_VERDICT_LABEL) as [ExcavatorVerdict, string][]).map(
        ([value, label]) => ({
          value,
          label,
          tone: value === 'approved' ? 'good' : value === 'conditional' ? 'warn' : 'bad',
        }),
      ),
      selected: (d) => d.verdict,
      notesLabel: 'შენიშვნები / ხარვეზები',
      notes: (d) => d.notes,
      summaryPhotos: (d) => d.summaryPhotos ?? [],
    },
  ],
};
