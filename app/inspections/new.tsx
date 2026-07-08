// Unified entry for starting a შემოწმების აქტი from anywhere (Home, a project
// screen, a deep link). Two possible pre-wizard steps, each skipped when already
// resolved (see lib/inspection/startFlow.ts):
//
//   1. template (type) — a 2-column illustration grid. Tapping a card advances
//      immediately (no Next button). Skipped when a templateId is supplied or
//      only one system template exists.
//   2. project — the project picker. Skipped when launched from a project
//      (`projectId`) or only one project exists.
//
// The inspection row is created ONLY when the flow reaches the wizard (both
// template + project known), so picking a type and backing out never leaves a
// draft. Equipment categories dispatch via `inspectionRegistry`; everything else
// (xaracho, harness, …) falls back to the generic `questionnairesApi.create`.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Plus, ChevronRight } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FlowHeader } from '../../components/FlowHeader';
import { InspectionShell, ProjectPickerStep, TemplatePickerStep } from '../../components/inspection-steps';
import { ProjectPickerSheet } from '../../components/home/ProjectPickerSheet';
import { routeForInspection } from '../../lib/inspectionRouting';
import { inspectionRegistry } from '../../lib/inspection/registry';
import { planInspectionStart, type StartStep } from '../../lib/inspection/startFlow';
import { questionnairesApi } from '../../lib/services';
import { useQueryClient } from '@tanstack/react-query';
import { useProjects, useTemplates, invalidateRecordLists, qk } from '../../lib/apiHooks';
import { querySettled } from '../../hooks/useListLoadState';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errorMap';
import { a11y } from '../../lib/accessibility';
import type { Project, Template } from '../../types/models';

export default function NewInspectionFlow() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { projectId, templateId } = useLocalSearchParams<{ projectId?: string; templateId?: string }>();

  const templatesQ = useTemplates();
  const projectsQ = useProjects();

  // Seeded once, when both queries have settled, from the pure flow plan.
  const [steps, setSteps] = useState<StartStep[] | null>(null);
  const [tpl, setTpl] = useState<Template | null>(null);
  const [proj, setProj] = useState<Project | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [creating, setCreating] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const seeded = useRef(false);
  const createdRef = useRef(false);
  // The pre-step frames now carry a live back/close (see `frame` below), so the
  // user can leave mid-create; don't navigate them into the wizard afterwards.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const createAndEnter = async (template: Template, project: Project) => {
    if (createdRef.current) return;
    createdRef.current = true;
    setCreating(true);
    try {
      const entry = template.category ? inspectionRegistry[template.category] : undefined;
      const created = entry
        ? await entry.create({ projectId: project.id, templateId: template.id })
        : await questionnairesApi.create({ projectId: project.id, templateId: template.id });
      // Seed the detail caches the wizard reads at flow start so it opens the
      // fresh (possibly offline-queued) act via cachedRead with no network —
      // inspection row + the template/project byId keys the generic wizard
      // needs (byId is a different key from the picker's list, and the async
      // warm-up may not have seeded it yet).
      if (entry && template.category) {
        qc.setQueryData(qk.equipmentInspection.byId(template.category, created.id), created);
      } else {
        qc.setQueryData(qk.inspections.byId(created.id), created);
      }
      qc.setQueryData(qk.templates.byId(template.id), template);
      qc.setQueryData(qk.projects.byId(project.id), project);
      invalidateRecordLists(qc);
      // If the user backed out while the create was in flight, the act exists
      // as a draft (lists were invalidated) — don't yank them into its wizard.
      if (!mountedRef.current) return;
      router.replace(routeForInspection(template.category, created.id, false) as any);
    } catch (e) {
      createdRef.current = false;
      setCreating(false);
      toast.error(friendlyError(e, 'ვერ შეიქმნა'));
    }
  };

  useEffect(() => {
    if (seeded.current) return;
    // Offline-aware settle gate (querySettled, hooks/useListLoadState): a
    // cold-cache offline query sits at fetchStatus 'paused' and never becomes
    // isFetched, so gating on isFetched alone hung this screen blank forever.
    // Seeding from a paused-empty answer renders the picker steps, whose own
    // load guards show OfflineEmptyState; React Query resumes the paused
    // fetches on reconnect, so the pickers fill in by themselves.
    if (!querySettled(templatesQ) || !querySettled(projectsQ)) return;
    seeded.current = true;
    const plan = planInspectionStart({
      templates: templatesQ.data ?? [],
      projects: projectsQ.data ?? [],
      projectId,
      templateId,
    });
    setTpl(plan.preTemplate);
    setProj(plan.preProject);
    setSteps(plan.steps);
    // Nothing left to pick → create straight into the wizard.
    if (plan.steps.length === 0 && plan.preTemplate && plan.preProject) {
      void createAndEnter(plan.preTemplate, plan.preProject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesQ.isFetched, templatesQ.fetchStatus, projectsQ.isFetched, projectsQ.fetchStatus]);

  const onTemplateSelect = (template: Template) => {
    setTpl(template);
    if (steps && stepIdx < steps.length - 1) {
      setDirection('next');
      setStepIdx(stepIdx + 1);
    } else if (proj) {
      // template was the only/last step → project already known, go.
      void createAndEnter(template, proj);
    }
  };

  const onNext = () => {
    if (!proj || !tpl || creating) return;
    void createAndEnter(tpl, proj);
  };

  const onPrev = () => {
    if (stepIdx > 0) {
      setDirection('prev');
      setStepIdx(stepIdx - 1);
    } else {
      router.back();
    }
  };

  // Blank-bodied frame while seeding, auto-creating, or creating — the flow
  // either routes away or paints a real step in the next tick, but the header
  // (back + close) must never wait on loading: if a fetch or create hangs or
  // fails, the user can always leave (see the offline cold-cache dead-end in
  // the 2026-07 UX audit). Never flash a picker here.
  const frame = (children?: ReactNode) => (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <FlowHeader
        flowTitle={t('inspections.title')}
        leading="back"
        trailing="close"
        onBack={() => router.back()}
        onClose={() => router.back()}
        surfaceColor={theme.colors.card}
      />
      {children}
    </View>
  );
  if (!steps || steps.length === 0) return frame();
  if (creating) {
    return frame(
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>,
    );
  }

  const current = steps[stepIdx];
  const isTemplate = current === 'template';
  const title = isTemplate || !tpl ? t('inspections.title') : inspectionDisplayName(tpl.name);

  return (
    <>
      <InspectionShell
        title={title}
        projectName={proj ? (proj.company_name || proj.name) : ''}
        step={stepIdx}
        totalSteps={steps.length}
        direction={direction}
        animate={stepIdx > 0}
        canGoNext={isTemplate ? true : !!proj}
        hideFooter={isTemplate}
        completing={creating}
        onNext={onNext}
        onPrev={onPrev}
        onClose={() => router.back()}
      >
        {isTemplate ? (
          <TemplatePickerStep selectedId={tpl?.id ?? null} onSelect={onTemplateSelect} />
        ) : (
          <View style={{ flex: 1 }}>
            <Pressable
              onPress={() => setSheetVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginHorizontal: 16,
                marginTop: 12,
                marginBottom: 4,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.colors.hairline,
                backgroundColor: theme.colors.accentSoft,
              }}
              {...a11y('ახალი პროექტი', 'ახალი პროექტის შექმნა', 'button')}
            >
              <Plus size={18} color={theme.colors.accent} strokeWidth={1.5} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.accent }}>
                ახალი პროექტი
              </Text>
              <ChevronRight size={16} color={theme.colors.accent} strokeWidth={1.5} />
            </Pressable>
            <ProjectPickerStep selectedId={proj?.id ?? null} onSelect={setProj} />
          </View>
        )}
      </InspectionShell>

      {/* New-project creation reuses the home sheet; on create it selects the
          project so the footer Next can proceed into the flow. */}
      <ProjectPickerSheet
        visible={sheetVisible}
        initialView="new"
        action="inspection"
        projects={projectsQ.data ?? []}
        templates={templatesQ.data ?? []}
        preselectedTemplateId={tpl?.id ?? null}
        onClose={() => setSheetVisible(false)}
        onCreated={async () => {}}
      />
    </>
  );
}
