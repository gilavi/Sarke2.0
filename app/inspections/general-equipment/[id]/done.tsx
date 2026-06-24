// General equipment inspection done screen.
//
// Thin data-loader for the shared <InspectionDoneView />: fetches the
// general-equipment row + project name. This type has a free-text
// conclusion rather than an enum verdict, shown in the accent color.
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { InspectionDoneView } from '../../../../components/success';
import { projectsApi } from '../../../../lib/services';
import { generalEquipmentApi } from '../../../../lib/generalEquipmentService';
import type { GeneralEquipmentInspection } from '../../../../types/generalEquipment';

export default function GeneralEquipmentInspectionDoneScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inspection, setInspection] = useState<GeneralEquipmentInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await generalEquipmentApi.getById(id).catch(() => null);
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

  return (
    <InspectionDoneView
      loading={loading}
      loaded={!!inspection}
      typeLabel={t('inspections.geDoneType')}
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
      verdict={inspection?.conclusion ? { text: inspection.conclusion, tone: 'safe' } : null}
      onViewPdf={() => router.back()}
    />
  );
}
