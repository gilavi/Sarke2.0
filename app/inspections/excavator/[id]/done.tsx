// Excavator inspection done screen.
//
// Thin data-loader for the shared <InspectionDoneView />: fetches the
// excavator row + project name and maps the verdict onto the shared view.
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { InspectionDoneView, type DoneVerdictTone } from '../../../../components/success';
import { projectsApi } from '../../../../lib/services';
import { excavatorApi } from '../../../../lib/excavatorService';
import { EXCAVATOR_VERDICT_LABEL } from '../../../../types/excavator';
import type { ExcavatorInspection } from '../../../../types/excavator';

export default function ExcavatorInspectionDoneScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inspection, setInspection] = useState<ExcavatorInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await excavatorApi.getById(id).catch(() => null);
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
          EXCAVATOR_VERDICT_LABEL[inspection.verdict as keyof typeof EXCAVATOR_VERDICT_LABEL]?.split(
            ' – ',
          )[0] ?? inspection.verdict;
        const head =
          inspection.verdict === 'approved'
            ? t('inspections.verdictPositive')
            : inspection.verdict === 'conditional'
              ? t('inspections.verdictConditional')
              : t('inspections.verdictNegative');
        const tone: DoneVerdictTone =
          inspection.verdict === 'rejected'
            ? 'danger'
            : inspection.verdict === 'conditional'
              ? 'warn'
              : 'success';
        return { text: `${head} – ${label}`, tone };
      })()
    : null;

  return (
    <InspectionDoneView
      loading={loading}
      loaded={!!inspection}
      typeLabel={t('inspections.excavatorDoneType')}
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
