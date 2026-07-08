import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Plus, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from './primitives/A11yText';
import { FlowHeader } from './FlowHeader';
import { Button } from './ui';
import { ProjectPickerStep } from './inspection-steps';
import { ProjectPickerSheet } from './home/ProjectPickerSheet';
import { useProjects, useTemplates } from '../lib/apiHooks';
import { querySettled } from '../hooks/useListLoadState';
import { useTheme } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { a11y } from '../lib/accessibility';
import type { Project } from '../types/models';

type FlowAction = 'incident' | 'briefing' | 'report';

const NEW_ROUTE: Record<FlowAction, string> = {
  incident: '/incidents/new',
  briefing: '/briefings/new',
  report: '/reports/new',
};

interface FlowProjectPickerProps {
  /** Centered header title, e.g. "ინციდენტი". */
  flowTitle: string;
  /** Which flow this picker precedes - drives the new-project redirect route. */
  action: FlowAction;
  /** Called with the chosen project once the user taps "გაგრძელება". */
  onPicked: (project: Project) => void;
  /** Leading back control - typically `router.back()`. */
  onBack: () => void;
}

/**
 * Full-screen "pick a project" first step for the incident / briefing / report
 * flows, mirroring the inspection flow's step 0 (no bottom sheet). Reuses the
 * canonical `ProjectPickerStep` list and the `ProjectPickerSheet` create-project
 * form; on creating a brand-new project it `router.replace`s into `/<flow>/new?
 * projectId=…` so the new project enters the flow via the normal param path.
 *
 * Side effects: reads projects + templates via React Query; navigates on create.
 */
export function FlowProjectPicker({ flowTitle, action, onPicked, onBack }: FlowProjectPickerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: projects = [], isFetched, fetchStatus } = useProjects();
  const { data: templates = [] } = useTemplates();

  const [selected, setSelected] = useState<Project | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  // Enabled "გაგრძელება" button + on-press error when no project is picked.
  const [attempted, setAttempted] = useState(false);

  // With a single project there's nothing to choose - skip this step entirely
  // and drop the user straight into the flow. Guarded by a ref so it fires once
  // (and only once the query has settled, never on a racy empty/stale result).
  const autoPicked = useRef(false);
  useEffect(() => {
    if (autoPicked.current || !isFetched) return;
    if (projects.length === 1) {
      autoPicked.current = true;
      onPicked(projects[0]);
    }
  }, [isFetched, projects, onPicked]);

  // Don't paint the picker UI until we know there's a real choice to make.
  // While the query is in-flight, or when there's exactly one project (the
  // auto-pick effect above is about to fire `onPicked` and navigate away),
  // render a blank background so the list never flashes on screen.
  // Offline-aware (querySettled): a paused never-fetched query will never
  // settle, so treat it as settled-with-no-data — the picker renders
  // (ProjectPickerStep shows its own offline empty state) instead of a
  // permanently blank screen.
  const settled = querySettled({ isFetched, fetchStatus });
  const willAutoPick = !settled || projects.length === 1 || autoPicked.current;
  if (willAutoPick) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
      </View>
    );
  }

  const handleContinue = () => {
    if (!selected) {
      setAttempted(true);
      haptic.validationError();
      return;
    }
    onPicked(selected);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlowHeader flowTitle={flowTitle} leading="back" trailing="none" onBack={onBack} />

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
          {...a11y(t('flowProjectPicker.newProject'), t('flowProjectPicker.newProjectA11y'), 'button')}
        >
          <Plus size={18} color={theme.colors.accent} strokeWidth={1.5} />
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.accent }}>
            {t('flowProjectPicker.newProject')}
          </Text>
          <ChevronRight size={16} color={theme.colors.accent} strokeWidth={1.5} />
        </Pressable>

        <ProjectPickerStep
          selectedId={selected?.id ?? null}
          onSelect={(p) => { setSelected(p); setAttempted(false); }}
        />
      </View>

      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 8,
          borderTopWidth: 1,
          borderTopColor: theme.colors.hairline,
        }}
      >
        {attempted && !selected ? (
          <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
            {t('flowProjectPicker.chooseProject')}
          </Text>
        ) : null}
        <Button
          title={t('flowProjectPicker.continueButton')}
          onPress={handleContinue}
        />
      </View>

      {/* New-project creation reuses the home sheet; on create it routes into the
          flow with the new project's id. */}
      <ProjectPickerSheet
        visible={sheetVisible}
        initialView="new"
        action={action}
        projects={projects}
        templates={templates}
        onClose={() => setSheetVisible(false)}
        onCreated={async () => {}}
        onProjectCreated={(id) => {
          setSheetVisible(false);
          router.replace(`${NEW_ROUTE[action]}?projectId=${id}` as any);
        }}
      />
    </View>
  );
}
