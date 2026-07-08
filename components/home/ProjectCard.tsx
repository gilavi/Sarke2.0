import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { ProjectAvatar } from '../ProjectAvatar';
import { ProjectCardMap } from './ProjectCardMap';
import { useTheme, withOpacity } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { Project } from '../../types/models';

const PROJECT_CARD_HEIGHT = 155;

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
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      {...a11y(
        t('projects.cardA11yLabel', { name: project.company_name || project.name }),
        t('projects.cardA11yHint'),
        'button',
      )}
    >
      <View style={[styles.projectCard, { width }]}>
        {project.latitude != null && project.longitude != null && (
          <ProjectCardMap
            projectId={project.id}
            latitude={project.latitude}
            longitude={project.longitude}
            width={width}
            height={PROJECT_CARD_HEIGHT}
          />
        )}

        <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden' }}>
          <ProjectAvatar project={project} size={60} />
        </View>
        <View>
          <Text style={styles.projectName} numberOfLines={2}>
            {project.company_name || project.name}
          </Text>
          {project.address ? (
            <Text style={styles.projectAddress} numberOfLines={1}>
              {project.address}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}, (prev, next) =>
  prev.project.id === next.project.id &&
  prev.project.address === next.project.address &&
  prev.project.latitude === next.project.latitude &&
  prev.project.longitude === next.project.longitude &&
  prev.width === next.width
);

function getStyles(theme: any) {
  return StyleSheet.create({
    projectCard: {
      backgroundColor: 'transparent',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: withOpacity('#000000', 0.1),
      padding: 12,
      justifyContent: 'space-between',
      height: PROJECT_CARD_HEIGHT,
      overflow: 'hidden',
      position: 'relative',
      // Scope the desaturation blend to this card only.
      isolation: 'isolate',
    },
    projectName: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.colors.ink,
      lineHeight: 22,
      letterSpacing: -0.1,
    },
    projectAddress: {
      fontSize: 11,
      color: theme.colors.inkSoft,
      marginTop: 2,
      letterSpacing: 0,
    },
  });
}
