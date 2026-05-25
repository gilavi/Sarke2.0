// Project-selection entry for equipment inspections started without a project
// (i.e. from Home). Renders the project picker as the first full-screen step,
// then creates the inspection for the given category + template and replaces
// into the real inspection flow. Inspections launched from a project screen
// skip this — they are created with a project already attached.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { InspectionShell, ProjectPickerStep } from '../../components/inspection-steps';
import { ProjectPickerSheet } from '../../components/home/ProjectPickerSheet';
import { routeForInspection } from '../../lib/inspectionRouting';
import { inspectionRegistry } from '../../lib/inspection/registry';
import { useProjects, useTemplates } from '../../lib/apiHooks';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errorMap';
import { a11y } from '../../lib/accessibility';
import type { Project } from '../../types/models';

type Cat = 'excavator' | 'bobcat' | 'general_equipment' | 'cargo_platform';

// In-flow header title — matches each type's own screen.
const TITLE: Record<Cat, string> = {
  excavator: 'ექსკავატორი',
  bobcat: 'ციცხვიანი დამტვირთველი',
  general_equipment: 'ტექ. აღჭ.',
  cargo_platform: 'პლატფორმის შემოწმება',
};

// Total steps of each flow (including this project step) — drives the progress bar.
const TOTAL: Record<Cat, number> = {
  excavator: 5,
  bobcat: 5,
  general_equipment: 4,
  cargo_platform: 5,
};

export default function NewInspectionProjectStep() {
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { category, templateId } = useLocalSearchParams<{ category: string; templateId: string }>();
  const { data: projects = [] } = useProjects();
  const { data: templates = [] } = useTemplates();

  const [selected, setSelected] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const cat = category as Cat;
  const entry = inspectionRegistry[cat];

  if (!entry || !templateId) {
    router.back();
    return null;
  }

  const onNext = async () => {
    if (!selected || creating) return;
    setCreating(true);
    try {
      const created = await entry.create({ projectId: selected.id, templateId });
      router.replace(routeForInspection(cat, created.id, false) as any);
    } catch (e) {
      toast.error(friendlyError(e, 'ვერ შეიქმნა'));
      setCreating(false);
    }
  };

  return (
    <>
      <InspectionShell
        title={TITLE[cat]}
        projectName={selected ? (selected.company_name || selected.name) : ''}
        step={0}
        totalSteps={TOTAL[cat]}
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
            <Ionicons name="add" size={18} color={theme.colors.accent} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.accent }}>
              ახალი პროექტი
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
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
