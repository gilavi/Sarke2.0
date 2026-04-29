import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button } from '../../components/ui';
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
  const insets = useSafeAreaInsets();
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.label}>რეპორტის სახელი</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="მაგ: ივნისის შემოწმების შედეგები"
              placeholderTextColor={theme.colors.inkFaint}
              style={styles.input}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onNext}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Button
            title="შემდეგი →"
            onPress={onNext}
            disabled={!canStart}
            loading={busy}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      gap: 8,
    },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.inkSoft },
    input: {
      fontSize: 16,
      color: theme.colors.ink,
      paddingVertical: 10,
      paddingHorizontal: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.hairline,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
  });
}
