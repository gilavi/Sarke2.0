// Inspection (harness / scaffold) done screen.
//
// Reached immediately after the wizard conclusion step finishes. A thin
// data-loader: fetches the inspection + template + project, maps them onto
// the shared <InspectionDoneView />. All wording/layout live in that view.
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { InspectionDoneView } from '../../../components/success';
import { inspectionsApi, projectsApi, templatesApi } from '../../../lib/services';
import { inspectionDisplayName } from '../../../lib/shared/documentName';
import type { Inspection, Project, Template } from '../../../types/models';

export default function InspectionDoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await inspectionsApi.getById(id).catch(() => null);
      setInspection(insp);
      if (!insp) return;
      const [tpl, proj] = await Promise.all([
        templatesApi.getById(insp.template_id).catch(() => null),
        projectsApi.getById(insp.project_id).catch(() => null),
      ]);
      setTemplate(tpl);
      setProject(proj);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const safe = inspection?.is_safe_for_use !== false;

  return (
    <InspectionDoneView
      loading={loading}
      loaded={!!inspection}
      typeLabel={inspectionDisplayName(template?.name)}
      projectName={project?.name}
      dateText={
        inspection
          ? new Date(inspection.completed_at ?? inspection.created_at).toLocaleString('ka-GE')
          : undefined
      }
      verdict={
        inspection
          ? {
              text: safe
                ? '✓ უსაფრთხოა ექსპლუატაციისთვის'
                : '✗ არ არის უსაფრთხო ექსპლუატაციისთვის',
              tone: safe ? 'safe' : 'danger',
            }
          : null
      }
      conclusion={inspection?.conclusion_text}
      onViewPdf={() => router.replace(`/inspections/${id}` as any)}
    />
  );
}
