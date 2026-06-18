import { ScrollView, View } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { ProjectAvatar } from '../ProjectAvatar';
import { Selector, type SelectorOption } from '../ui/Selector';
import { useProjects } from '../../lib/apiHooks';
import { useTheme } from '../../lib/theme';
import { SkeletonRow } from '../Skeleton';
import type { Project } from '../../types/models';

interface ProjectPickerStepProps {
  selectedId: string | null;
  onSelect: (project: Project) => void;
}

export function ProjectPickerStep({ selectedId, onSelect }: ProjectPickerStepProps) {
  const { theme } = useTheme();
  const projectsQ = useProjects();
  const projects = projectsQ.data ?? [];
  // Canonical three-state guard (see CLAUDE.md) - skeleton rows, never a
  // flashed empty state over a stale [].
  const loading = (projectsQ.isFetching || !projectsQ.isFetched) && projects.length === 0;

  if (loading) {
    return (
      <View style={{ flex: 1, gap: 10, paddingTop: 4 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} style={{ backgroundColor: theme.colors.surface, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14 }} />
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {projects.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: theme.colors.inkFaint, textAlign: 'center' }}>
            პროექტი ვერ მოიძებნა
          </Text>
        </View>
      ) : (
        <Selector
          presentation="list"
          value={selectedId}
          onChange={(id) => {
            const p = projects.find((x) => x.id === id);
            if (p) onSelect(p);
          }}
          options={projects.map<SelectorOption>((p) => ({
            value: p.id,
            label: p.company_name || p.name,
            subtitle: p.address || undefined,
            leading: <ProjectAvatar project={p} size={44} />,
          }))}
        />
      )}
    </ScrollView>
  );
}
