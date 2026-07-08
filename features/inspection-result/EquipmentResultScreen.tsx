// EquipmentResultScreen — the shared COMPLETED-view for every per-type equipment
// inspection route (bobcat, excavator, forklift, cargo-platform, fall-protection,
// general-equipment, lifting-accessories, mobile-ladder, safety-net, forklift).
//
// Each route's `status === 'completed'` branch used to repeat a byte-identical
// wiring block: `<EquipmentResultDetails … onEdit={reopen} onShare={handlePdf}
// onBack={router.back} sharing={generatingPdf} pdfLocked={pdfLocked} />` followed
// by the subscription-limit `<SubscriptionNotice />`. Only the *data*
// (title / verdict pill / info rows / checklist sections / result vocabulary)
// differs per type. This component owns the shared wiring so each route passes
// only its normalized data; the type-specific mapping stays in the type-specific
// screen, per features/inspection-result/AGENTS.md.
//
// REGULATORY: captured signatures live inside EquipmentResultDetails'
// `useSignaturesState` and are never persisted — the snapshot is only handed to
// `handlePdf` for rasterization into the PDF. See features/signatures/AGENTS.md.
import { useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { EquipmentResultDetails } from './EquipmentResultDetails';
import { SubscriptionNotice } from '../../components/SubscriptionNotice';
import type { DocumentInfoRow, StatusTone } from '../../components/document-details';
import type { ChecklistSection, ResultOption } from '../../lib/inspection/schema';
import type { InspectionFlowResult } from '../../lib/inspection/useInspectionFlow';

/**
 * The `useInspectionFlow` fields this screen wires into the result UI. Picked from
 * `InspectionFlowResult` so the shape can never drift from the hook. Each route
 * hands these straight through from its `useInspectionFlow` state.
 */
export type EquipmentResultFlow = Pick<
  InspectionFlowResult<any>,
  | 'creatorName'
  | 'reopen'
  | 'handlePdf'
  | 'generatingPdf'
  | 'pdfLocked'
  | 'limitNoticeVisible'
  | 'setLimitNoticeVisible'
>;

export interface EquipmentResultScreenProps {
  /** The route's shared inspection-flow state (from `useInspectionFlow`). */
  flow: EquipmentResultFlow;
  /** Document / screen title (e.g. "ბადის შემოწმება"). */
  title: string;
  /** Header tile glyph; defaults to ClipboardCheck inside EquipmentResultDetails. */
  tileIcon?: LucideIcon;
  /** Verdict status pill; pass null to hide it. */
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
}

/**
 * Renders the completed equipment-inspection detail page + the subscription
 * limit notice, wiring Edit / Share PDF / Back / lock state from the shared
 * inspection flow. Behaviour is identical to the per-route inline blocks it
 * replaces (Back pops the current route, exactly as `router.back()` did there).
 */
export function EquipmentResultScreen({ flow, ...details }: EquipmentResultScreenProps) {
  const router = useRouter();
  return (
    <>
      <EquipmentResultDetails
        {...details}
        creatorName={flow.creatorName}
        onEdit={() => void flow.reopen()}
        onShare={(sig) => void flow.handlePdf(sig)}
        onBack={() => router.back()}
        sharing={flow.generatingPdf}
        pdfLocked={flow.pdfLocked}
      />
      <SubscriptionNotice
        visible={flow.limitNoticeVisible}
        onClose={() => flow.setLimitNoticeVisible(false)}
      />
    </>
  );
}
