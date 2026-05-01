import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '../../components/ui';
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

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={insets.top + 44}
      >
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ flexGrow: 1, padding: 16 }}
      >
        <Input
          label="რეპორტის სახელი"
          required
          value={title}
          onChangeText={setTitle}
          placeholder="მაგ: ივნისის შემოწმების შედეგები"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onNext}
        />

        <View style={[styles.footer, { marginTop: 'auto', paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          <Button
            title="შემდეგი →"
            onPress={onNext}
            disabled={!canStart}
            loading={busy}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
  });
}
