import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { Button } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { FlowHeader } from '../../components/FlowHeader';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errorMap';
import { projectsApi, reportsApi } from '../../lib/services';
import type { Project } from '../../types/models';

export default function NewReportTitleScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    projectsApi.getById(projectId).then(setProject).catch(() => null);
  }, [projectId]);

  const trimmed = title.trim();
  const canStart = trimmed.length > 0 && !busy && !!projectId;

  const onNext = async () => {
    if (!canStart || !projectId) return;
    setBusy(true);
    try {
      const created = await reportsApi.create({ projectId, title: trimmed });
      router.replace(`/reports/${created.id}/edit` as any);
    } catch (e) {
      toast.error(friendlyError(e, 'რეპორტის შექმნა ვერ მოხერხდა'));
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlowHeader
        flowTitle="რეპორტი"
        project={project}
        step={1}
        totalSteps={2}
        onBack={() => router.back()}
        confirmExit={trimmed.length > 0}
      />

      <KeyboardSafeArea
        headerOffset={44}
        contentStyle={{ padding: 16 }}
        footer={
          <View style={styles.footer}>
            <Button
              title="შემდეგი →"
              onPress={onNext}
              disabled={!canStart}
              loading={busy}
            />
          </View>
        }
      >
        <FloatingLabelInput
          label="რეპორტის სახელი"
          required
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onNext}
        />
      </KeyboardSafeArea>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    footer: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
  });
}
