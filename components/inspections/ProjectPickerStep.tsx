import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { ProjectAvatar } from '../ProjectAvatar';
import { useProjects } from '../../lib/apiHooks';
import { useTheme } from '../../lib/theme';
import type { Project } from '../../types/models';

interface ProjectPickerStepProps {
  selectedId: string | null;
  onSelect: (project: Project) => void;
}

export function ProjectPickerStep({ selectedId, onSelect }: ProjectPickerStepProps) {
  const { theme } = useTheme();
  const { data: projects = [], isLoading } = useProjects();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {projects.length === 0 && (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: theme.colors.inkFaint, textAlign: 'center' }}>
            პროექტი ვერ მოიძებნა
          </Text>
        </View>
      )}
      {projects.map(p => {
        const selected = p.id === selectedId;
        return (
          <Pressable
            key={p.id}
            onPress={() => onSelect(p)}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: theme.colors.hairline },
              selected && { backgroundColor: theme.colors.accentSoft },
              pressed && { opacity: 0.75 },
            ]}
          >
            <ProjectAvatar project={p} size={44} />
            <View style={styles.info}>
              <Text
                style={[styles.name, { color: selected ? theme.colors.accent : theme.colors.ink }]}
                numberOfLines={1}
              >
                {p.company_name || p.name}
              </Text>
              {p.address ? (
                <Text style={[styles.address, { color: theme.colors.inkSoft }]} numberOfLines={1}>
                  {p.address}
                </Text>
              ) : null}
            </View>
            <View
              style={[
                styles.radio,
                { borderColor: selected ? theme.colors.accent : theme.colors.hairline },
              ]}
            >
              {selected && (
                <View style={[styles.radioDot, { backgroundColor: theme.colors.accent }]} />
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '600' },
  address: { fontSize: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
