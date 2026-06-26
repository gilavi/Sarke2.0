// EquipmentResultDetails — the saved-record DETAIL page for an equipment
// inspection (bobcat, excavator, forklift, …), reached by TAPPING a completed
// equipment inspection in a list.
//
// This is the equipment counterpart to app/inspections/[id].tsx (the generic
// act detail). It replaces the old full-screen WebView PDF preview
// (components/InspectionResultView) with the reusable DocumentDetails shell so
// every document type looks the same: top bar, header tile + verdict pill, an
// Edit chip, sticky tabs, read-only info, the normalized checklist as content,
// editable signatures, and a Share PDF footer.
//
// Each per-type screen renders this from its useInspectionFlow state when the
// inspection is completed, passing its own normalized info rows + checklist
// sections (the type-specific knowledge stays in the type-specific screen).
//
// REGULATORY: signatures are captured into useSignaturesState here and live in
// component state only — never persisted. The snapshot is handed to onShare so
// the screen's PDF builder can rasterize it. See features/signatures/AGENTS.md.
import { useCallback, useMemo } from 'react';
import { type LucideIcon, ClipboardCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { DocumentDetails, type DocumentInfoRow, type StatusTone } from '../../components/document-details';
import { EquipmentChecklistContent } from '../../components/document-details/content/EquipmentChecklistContent';
import { useSignaturesState, type SignaturesSnapshot } from '../signatures';
import type { ChecklistSection, ResultOption } from '../../lib/inspection/schema';

export interface EquipmentResultDetailsProps {
  /** Screen / document title (e.g. "ციცხვიანი დამტვირთველი"). */
  title: string;
  /** Header tile glyph; defaults to ClipboardCheck. */
  tileIcon?: LucideIcon;
  /** Verdict status pill; pass null to hide. */
  status: { tone: StatusTone; label: string } | null;
  /** Read-only key facts. */
  info: DocumentInfoRow[];
  /** Normalized checklist sections. */
  sections: ChecklistSection[];
  /** Result vocabulary used to resolve each item's result → label + tone. */
  resultOptions: ResultOption[];
  /** Conclusion free-text. */
  notes?: string | null;
  /** Summary photo storage paths. */
  summaryPhotos?: string[];
  /** Inspection creator's display name (the expert), shown above the canvas. */
  creatorName: string;
  /** Reopen the completed inspection back to draft (flips screen to wizard). */
  onEdit: () => void;
  /** Build + share the PDF; receives the live signature snapshot. */
  onShare: (signatures: SignaturesSnapshot) => void;
  /** Back to the list. */
  onBack: () => void;
  sharing?: boolean;
  pdfLocked?: boolean;
}

export function EquipmentResultDetails(props: EquipmentResultDetailsProps) {
  const { t } = useTranslation();
  const signatures = useSignaturesState();

  const onSharePdf = useCallback(() => {
    props.onShare({
      creatorSignature: signatures.creatorSignature,
      additionalRowsCount: signatures.additionalRows.length,
    });
  }, [props, signatures.creatorSignature, signatures.additionalRows.length]);

  const content = useMemo(
    () => (
      <EquipmentChecklistContent
        sections={props.sections}
        resultOptions={props.resultOptions}
        notes={props.notes}
        summaryPhotos={props.summaryPhotos}
      />
    ),
    [props.sections, props.resultOptions, props.notes, props.summaryPhotos],
  );

  return (
    <DocumentDetails
      type="act"
      tileIcon={props.tileIcon ?? ClipboardCheck}
      title={props.title}
      typeLabel={t('details.type.act')}
      status={props.status}
      info={props.info}
      contentLabel={t('details.content.act')}
      contentTab={t('details.content.act')}
      signatures={{ mode: 'edit', state: signatures, creatorName: props.creatorName }}
      onEdit={props.onEdit}
      onSharePdf={onSharePdf}
      sharing={props.sharing}
      pdfLocked={props.pdfLocked}
      onBack={props.onBack}
    >
      {content}
    </DocumentDetails>
  );
}
