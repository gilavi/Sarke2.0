// Bobcat inspection done screen.
//
// Thin data-loader for the shared <InspectionDoneView />: fetches the
// bobcat row + project name and maps the verdict onto the shared view.
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { InspectionDoneView, type DoneVerdictTone } from '../../../../components/success';
import { projectsApi } from '../../../../lib/services';
import { bobcatApi } from '../../../../lib/bobcatService';
import { VERDICT_LABEL } from '../../../../types/bobcat';
import type { BobcatInspection } from '../../../../types/bobcat';

export default function BobcatInspectionDoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inspection, setInspection] = useState<BobcatInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await bobcatApi.getById(id).catch(() => null);
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
    ? (() => {
        const label =
          VERDICT_LABEL[inspection.verdict as keyof typeof VERDICT_LABEL]?.split(' – ')[0] ??
          inspection.verdict;
        const head =
          inspection.verdict === 'approved'
            ? '✓ დადებითი'
            : inspection.verdict === 'limited'
              ? '⚠ შეზღუდული'
              : '✗ უარყოფითი';
        const tone: DoneVerdictTone =
          inspection.verdict === 'rejected'
            ? 'danger'
            : inspection.verdict === 'limited'
              ? 'warn'
              : 'success';
        return { text: `${head} – ${label}`, tone };
      })()
    : null;

  return (
    <InspectionDoneView
      loading={loading}
      loaded={!!inspection}
      typeLabel="ბობკატის შემოწმების აქტი"
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
      conclusion={inspection?.notes}
      onViewPdf={() => router.back()}
    />
  );
}
