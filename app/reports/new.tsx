import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { Button } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { FlowHeader } from '../../components/FlowHeader';
import { FlowProjectPicker } from '../../components/FlowProjectPicker';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { useSession } from '../../lib/session';
import { friendlyError } from '../../lib/errorMap';
import { projectsApi } from '../../lib/services';
import { queryClient } from '../../lib/queryClient';
import { invalidateRecordLists, qk } from '../../lib/apiHooks';
import { cachedRead } from '../../lib/cachedRead';
import { saveRecordThroughOutbox } from '../../lib/outbox';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import type { Project, Report } from '../../types/models';

export default function NewReportTitleScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { t } = useTranslation();
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
    cachedRead(qk.projects.byId(projectId), () => projectsApi.getById(projectId))
      .then(p => { if (mounted) setProject(p); })
      .catch(() => null);
    return () => { mounted = false; };
  }, [projectId, project]);

  const trimmed = title.trim();
  // Input gate for the (now always-enabled) button — `busy` stays a separate
  // in-flight disable; this only governs whether a press reveals field errors.
  const inputValid = trimmed.length > 0 && !!projectId;

  const onNext = async () => {
    if (busy || !inputValid || !projectId) return;
    setBusy(true);
    // Client-generated id: offline the create queues in the outbox and later
    // slide edits coalesce into it; the editor reads the seeded detail cache.
    const reportId = Crypto.randomUUID();
    const optimistic: Report = {
      id: reportId,
      project_id: projectId,
      user_id: session.state.status === 'signedIn' ? session.state.session.user.id : '',
      title: trimmed,
      status: 'draft',
      slides: [],
      pdf_url: null,
      created_at: new Date().toISOString(),
    };
    try {
      const res = await saveRecordThroughOutbox({
        entity: 'report',
        mode: 'create',
        recordId: reportId,
        payload: { id: reportId, projectId, title: trimmed },
        displayTitle: 'ანგარიში',
        projectId,
        detailKey: qk.reports.byId(reportId),
        optimistic,
      });
      if (res.queued) toast.success(t('components.savedOffline'));
      invalidateRecordLists(queryClient);
      router.replace(`/reports/${reportId}/edit` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('reports.createFailed')));
      setBusy(false);
    }
  };

  // Launched from Home without a project - pick one as the first full-screen step.
  if (!projectId) {
    return (
      <FlowProjectPicker
        flowTitle={t('records.reports')}
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
        flowTitle={t('records.reports')}
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
          label={t('reports.reportTitleLabel')}
          required
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => guard(inputValid, onNext)}
          error={attempted && !trimmed.length ? t('errors.requiredField') : undefined}
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
            title={t('reports.nextButton')}
            onPress={() => guard(inputValid, onNext)}
            disabled={busy}
            loading={busy}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
