import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { Button } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { FlowHeader } from '../../components/FlowHeader';
import { FlowProjectPicker } from '../../components/FlowProjectPicker';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errorMap';
import { projectsApi, reportsApi } from '../../lib/services';
import { queryClient } from '../../lib/queryClient';
import { invalidateRecordLists } from '../../lib/apiHooks';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import type { Project } from '../../types/models';

export default function NewReportTitleScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { projectId: paramProjectId } = useLocalSearchParams<{ projectId?: string }>();
  const [pickedProject, setPickedProject] = useState<Project | null>(null);
  const projectId = paramProjectId ?? pickedProject?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  // Enabled "შემდეგი" button + on-press field errors (see useSubmitGuard).
  const { attempted, guard } = useSubmitGuard();

  useEffect(() => {
    if (!projectId || project) return;
    let mounted = true;
    projectsApi.getById(projectId).then(p => { if (mounted) setProject(p); }).catch(() => null);
    return () => { mounted = false; };
  }, [projectId, project]);

  const trimmed = title.trim();
  // Input gate for the (now always-enabled) button — `busy` stays a separate
  // in-flight disable; this only governs whether a press reveals field errors.
  const inputValid = trimmed.length > 0 && !!projectId;

  const onNext = async () => {
    if (busy || !inputValid || !projectId) return;
    setBusy(true);
    try {
      const created = await reportsApi.create({ projectId, title: trimmed });
      invalidateRecordLists(queryClient);
      router.replace(`/reports/${created.id}/edit` as any);
    } catch (e) {
      toast.error(friendlyError(e, 'რეპორტის შექმნა ვერ მოხერხდა'));
      setBusy(false);
    }
  };

  // Launched from Home without a project - pick one as the first full-screen step.
  if (!projectId) {
    return (
      <FlowProjectPicker
        flowTitle="რეპორტი"
        action="report"
        onBack={() => router.back()}
        onPicked={(p) => { setPickedProject(p); setProject(p); }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlowHeader
        flowTitle="რეპორტი"
        project={project}
        step={1}
        totalSteps={2}
        leading="back"
        trailing="close"
        onBack={() => router.back()}
        onClose={() => router.back()}
        confirmExit={trimmed.length > 0}
        surfaceColor={theme.colors.surface}
      />

      <KeyboardSafeArea headerHeight={44} contentStyle={{ padding: 16 }}>
        <FloatingLabelInput
          label="რეპორტის სახელი"
          required
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => guard(inputValid, onNext)}
          error={attempted && !trimmed.length ? 'სავალდებულო ველი' : undefined}
        />
      </KeyboardSafeArea>

      {/* Footer rides above the keyboard (the input autofocuses, so the keyboard
          is up immediately). Mirrors the briefings/account-settings pattern. */}
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            backgroundColor: theme.colors.card,
          }}
        >
          <Button
            title="შემდეგი →"
            onPress={() => guard(inputValid, onNext)}
            disabled={busy}
            loading={busy}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

