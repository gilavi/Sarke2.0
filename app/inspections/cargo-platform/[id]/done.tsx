// Cargo platform inspection done screen.
//
// Thin data-loader for the shared <InspectionDoneView />: fetches the
// cargo-platform row + project name and maps the verdict onto the shared view.
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { InspectionDoneView, type DoneVerdictTone } from '../../../../components/success';
import { projectsApi } from '../../../../lib/services';
import { cargoPlatformApi } from '../../../../lib/cargoPlatformService';
import { CP_VERDICT_LABEL } from '../../../../types/cargoPlatform';
import type { CargoPlatformInspection } from '../../../../types/cargoPlatform';

export default function CargoPlatformDoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inspection, setInspection] = useState<CargoPlatformInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await cargoPlatformApi.getById(id).catch(() => null);
      setInspection(insp);
      if (insp?.projectId) {
        const proj = await projectsApi.getById(insp.projectId).catch(() => null);
        if (proj) setProjectName(proj.company_name || proj.name);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const verdict = inspection?.verdict
    ? {
        text: CP_VERDICT_LABEL[inspection.verdict] ?? inspection.verdict,
        tone: (inspection.verdict === 'rejected'
          ? 'danger'
          : inspection.verdict === 'approved'
            ? 'success'
            : 'warn') as DoneVerdictTone,
      }
    : null;

  return (
    <InspectionDoneView
      loading={loading}
      loaded={!!inspection}
      typeLabel="ტვირთის მიმღები პლატფორმა"
      projectName={projectName || undefined}
      dateText={
        inspection
          ? new Date(inspection.completedAt ?? inspection.inspectionDate).toLocaleDateString('ka-GE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : undefined
      }
      verdict={verdict}
      conclusion={inspection?.verdictComment}
      onViewPdf={() => router.back()}
    />
  );
}
