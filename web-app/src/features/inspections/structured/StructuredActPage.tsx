/**
 * Route entry for a structured inspection act. Looks the act up in the registry
 * by category, then branches on the row's status:
 *   - `/<type>/new` (no id)        → the creation wizard
 *   - `/<type>/:id` while a draft   → the editing wizard
 *   - `/<type>/:id` once completed  → the read-only result screen (with the
 *                                     SignatureCapture + PDF, like harness)
 *
 * Branching here (not inside the wizard) keeps the wizard a pure draft-builder
 * and puts the signature capture on a proper result page, matching the harness flow.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { EmptyView } from '@/components/async/AsyncBoundary';
import { getStructuredAct } from './acts';
import { StructuredInspectionWizard } from './StructuredInspectionWizard';
import { StructuredInspectionResult } from './StructuredInspectionResult';

export default function StructuredActPage({ actKey }: { actKey: string }) {
  const act = getStructuredAct(actKey);
  const { id } = useParams();
  const isNew = !id || id === 'new';

  // Status decides wizard vs result. Skipped for `/new` (nothing to load yet).
  const statusQ = useQuery({
    queryKey: act ? act.descriptor.detailKey(id) : ['structured-missing', id],
    queryFn: () => act!.descriptor.get(id!),
    enabled: !!act && !isNew,
  });

  if (!act) return <EmptyView message="უცნობი შემოწმების ტიპი." />;

  if (!isNew && statusQ.isLoading) return <SkeletonDetailPage />;

  if (!isNew && statusQ.data?.status === 'completed') {
    return <StructuredInspectionResult act={act} />;
  }

  return <StructuredInspectionWizard descriptor={act.descriptor} detailRoute={act.detail} />;
}
