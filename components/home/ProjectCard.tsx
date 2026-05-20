import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { A11yText as Text } from '../primitives/A11yText';
import { ProjectAvatar } from '../ProjectAvatar';
import { useTheme, withOpacity } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { Project } from '../../types/models';

const PROJECT_CARD_HEIGHT = 120;

interface ProjectCardProps {
  project: Project;
  width: number;
  onPress: () => void;
}

export const ProjectCard = memo(function ProjectCard({
  project,
  width,
  onPress,
}: ProjectCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      {...a11y(
        `პროექტი: ${project.company_name || project.name}`,
        'შეეხეთ პროექტის დეტალების სანახავად',
        'button',
      )}
    >
      <View style={[styles.projectCard, { width }]}>
        {project.latitude != null && project.longitude != null ? (
          <>
            <MapView
              style={StyleSheet.absoluteFill}
              provider={PROVIDER_DEFAULT}
              region={{
                latitude: project.latitude,
                longitude: project.longitude,
                latitudeDelta: 0.018,
                longitudeDelta: 0.018,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              liteMode
              pointerEvents="none"
            />
            <View style={styles.projectCardMapOverlay} />
          </>
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface }]}
            pointerEvents="none"
          />
        )}
        <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }}>
          <ProjectAvatar project={project} size={44} />
        </View>
        <Text style={styles.projectName} numberOfLines={2}>
          {project.company_name || project.name}
        </Text>
      </View>
    </Pressable>
  );
}, (prev, next) => prev.project.id === next.project.id && prev.width === next.width);

function getStyles(theme: any) {
  return StyleSheet.create({
    projectCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      padding: 12,
      gap: 6,
      height: PROJECT_CARD_HEIGHT,
      overflow: 'hidden',
      position: 'relative',
    },
    projectCardMapOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withOpacity(theme.colors.card, 0.88),
    },
    projectName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.ink,
      lineHeight: 19,
    },
  });
}
