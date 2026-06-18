import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { A11yText as Text } from '../primitives/A11yText';
import { ProjectAvatar } from '../ProjectAvatar';
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
        {project.latitude != null && project.longitude != null && (
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
              showsCompass={false}
              showsScale={false}
              showsTraffic={false}
              showsPointsOfInterest={false}
              showsBuildings={false}
              showsIndoors={false}
              mapPadding={{ top: 0, right: 0, bottom: -30, left: 0 }}
              liteMode
              pointerEvents="none"
            />
            <Svg
              width={width}
              height={PROJECT_CARD_HEIGHT}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Defs>
                <RadialGradient
                  id={`mapMask-${project.id}`}
                  cx={width}
                  cy={0}
                  r={Math.hypot(width, PROJECT_CARD_HEIGHT)}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor={theme.colors.surface} stopOpacity={0.08} />
                  <Stop offset="0.55" stopColor={theme.colors.surface} stopOpacity={0.6} />
                  <Stop offset="1" stopColor={theme.colors.surface} stopOpacity={1} />
                </RadialGradient>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={width}
                height={PROJECT_CARD_HEIGHT}
                fill={`url(#mapMask-${project.id})`}
              />
            </Svg>
          </>
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
