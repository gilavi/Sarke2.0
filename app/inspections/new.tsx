// Project-selection entry for inspections started without a project (i.e. from
// Home). Renders the project picker as the first full-screen step, then creates
// the inspection for the given template and replaces into the real inspection
// flow. Inspections launched from a project screen skip this - they are created
// with a project already attached.
//
// Handles every template category uniformly: equipment categories dispatch via
// `inspectionRegistry`; anything else (xaracho, mobile_scaffold, harness, …)
// falls back to the generic `questionnairesApi.create`.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Plus, ChevronRight } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { InspectionShell, ProjectPickerStep } from '../../components/inspection-steps';
import { ProjectPickerSheet } from '../../components/home/ProjectPickerSheet';
import { routeForInspection } from '../../lib/inspectionRouting';
import { inspectionRegistry } from '../../lib/inspection/registry';
import { questionnairesApi } from '../../lib/services';
import { useProjects, useTemplates } from '../../lib/apiHooks';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errorMap';
import { a11y } from '../../lib/accessibility';
import type { Project } from '../../types/models';

// Total steps shown in the progress bar before we enter the real wizard. The
// registry entries each have their own step count; for non-registry generic
// templates 4 is the post-creation wizard's effective length (info → photos →
// questions → finish), so step 0 + 3 wizard steps + finish ≈ 4. The real
// wizard's progress bar re-anchors on mount, so this only matters cosmetically
// for the brief moment between "next" and the route replace.
const DEFAULT_TOTAL_STEPS = 5;

export default function NewInspectionProjectStep() {
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { category, templateId } = useLocalSearchParams<{ category?: string; templateId: string }>();
  const { data: projects = [], isFetched: projectsFetched } = useProjects();
  const { data: templates = [] } = useTemplates();

  const [selected, setSelected] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const template = useMemo(
    () => templates.find(t => t.id === templateId) ?? null,
    [templates, templateId],
  );

  // category from query param takes precedence; fall back to the template's own
  // category. Either may be missing for generic templates.
  const resolvedCategory: string | null =
    (category && category.length > 0 ? category : template?.category) ?? null;
  const registryEntry = resolvedCategory ? inspectionRegistry[resolvedCategory] : undefined;

  // Defer the redirect into an effect - calling router.back() during render
  // can re-fire on every render and looks like a freeze (the user gets bounced
  // back to wherever they came from before any of their state can persist).
  useEffect(() => {
    if (!templateId) router.back();
  }, [templateId, router]);

  const startForProject = async (project: Project) => {
    setCreating(true);
    try {
      const created = registryEntry
        ? await registryEntry.create({ projectId: project.id, templateId })
        : await questionnairesApi.create({ projectId: project.id, templateId });
      router.replace(routeForInspection(resolvedCategory, created.id, false) as any);
    } catch (e) {
      toast.error(friendlyError(e, 'ვერ შეიქმნა'));
      setCreating(false);
    }
  };

  // With a single project there's nothing to choose - skip this step entirely
  // and create the inspection straight away. Guarded by a ref so it fires once
  // (and only once the query has settled, never on a racy empty/stale result).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !projectsFetched || !templateId) return;
    if (projects.length === 1) {
      autoStarted.current = true;
      void startForProject(projects[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsFetched, projects, templateId]);

  if (!templateId) return null;

  const title = template?.name
    ? inspectionDisplayName(template.name)
    : 'შემოწმება';

  const onNext = () => {
    if (!selected || creating) return;
    void startForProject(selected);
  };

  return (
    <>
      <InspectionShell
        title={title}
        projectName={selected ? (selected.company_name || selected.name) : ''}
        step={0}
        totalSteps={DEFAULT_TOTAL_STEPS}
        direction="next"
        animate={false}
        canGoNext={!!selected}
        completing={creating}
        onNext={onNext}
        onPrev={() => router.back()}
        onClose={() => router.back()}
      >
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
          <ProjectPickerStep selectedId={selected?.id ?? null} onSelect={setSelected} />
        </View>
      </InspectionShell>

      {/* New-project creation reuses the home sheet; on create it starts the
          inspection and routes directly into the flow. */}
      <ProjectPickerSheet
        visible={sheetVisible}
        initialView="new"
        action="inspection"
        projects={projects}
        templates={templates}
        preselectedTemplateId={templateId}
        onClose={() => setSheetVisible(false)}
        onCreated={async () => {}}
      />
    </>
  );
}
