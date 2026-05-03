import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { RoleSlotList, type InspectorRow } from '../../../components/RoleSlotList';
import { useTheme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { useSession } from '../../../lib/session';
import { friendlyError } from '../../../lib/errorMap';
import { projectsApi } from '../../../lib/services';
import { useProject, qk } from '../../../lib/apiHooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CrewMember } from '../../../types/models';
import { useTranslation } from 'react-i18next';

export default function ProjectParticipantsList() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const session = useSession();

  const { data: project, isLoading: loading } = useProject(id);
  const queryClient = useQueryClient();

  const inspector = useMemo<InspectorRow | null>(() => {
    if (session.state.status !== 'signedIn') return null;
    const u = session.state.user;
    const fallback = session.state.session.user.email ?? t('projects.inspectorFallback');
    const name = u
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || fallback
      : fallback;
    return {
      name,
      role: t('projects.inspectorFallback'),
      signaturePath: u?.saved_signature_url ?? null,
    };
  }, [session.state, t]);

  const updateCrewMutation = useMutation({
    mutationFn: async ({ projectId, crew }: { projectId: string; crew: CrewMember[] }) => {
      return projectsApi.update(projectId, { crew });
    },
    onSuccess: (saved, vars) => {
      queryClient.setQueryData(qk.projects.byId(vars.projectId), saved);
      queryClient.invalidateQueries({ queryKey: qk.projects.list });
    },
    onError: (err) => {
      toast.error(friendlyError(err, t('projects.memberSaveError')));
    },
  });

  const persistCrew = useCallback(
    async (next: CrewMember[]) => {
      if (!project) return;
      queryClient.setQueryData(qk.projects.byId(project.id), { ...project, crew: next });
      updateCrewMutation.mutate({ projectId: project.id, crew: next });
    },
    [project, queryClient, updateCrewMutation],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: 'მონაწილეები',
          headerBackTitle: 'უკან',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.accent,
          headerTitleStyle: { color: theme.colors.ink, fontWeight: '700', fontSize: 17 },
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>მონაწილეები</Text>
          {project?.name ? <Text style={styles.pageSubtitle}>{project.name}</Text> : null}
        </View>

        {loading || !project ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : (
          <RoleSlotList
            projectId={project.id}
            inspector={inspector}
            crew={project.crew ?? []}
            onChange={persistCrew}
          />
        )}

        {!loading && !project ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={theme.colors.borderStrong} />
            <Text style={styles.emptyStateText}>ჩანაწერები არ არის</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    pageHeader: { marginBottom: 24 },
    pageTitle: { fontSize: 26, fontWeight: '700', color: theme.colors.ink },
    pageSubtitle: { fontSize: 13, color: theme.colors.inkFaint, marginTop: 3 },
    centered: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
    emptyState: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    emptyStateText: { fontSize: 14, color: theme.colors.inkFaint, fontWeight: '500' },
  });
}
