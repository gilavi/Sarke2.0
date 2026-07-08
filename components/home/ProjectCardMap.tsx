/**
 * ProjectCardMap — the monochrome map backdrop of a ProjectCard.
 *
 * Brand look (do not change): map, desaturated by a grey layer blended in
 * 'saturation' mode, under a radial gradient mask toward the card surface,
 * plus a pulsing accent location dot.
 *
 * On iOS the map is a cached raster snapshot (`useMapCardSnapshot`) — the
 * live MapView (a full MKMapView; `liteMode` is Android-only) mounts only on
 * a cache miss, captures one snapshot on `onMapReady`, and unmounts once the
 * image has drawn. Android keeps the cheap liteMode map. Renders a fragment
 * of absolute-fill layers — the parent card owns clipping + `isolation`.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { Image } from 'expo-image';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../lib/theme';
import { useAccessibilitySettings } from '../../lib/accessibility';
import { useMapCardSnapshot } from '../../hooks/useMapCardSnapshot';

interface ProjectCardMapProps {
  projectId: string;
  latitude: number;
  longitude: number;
  width: number;
  height: number;
}

export const ProjectCardMap = memo(function ProjectCardMap({
  projectId,
  latitude,
  longitude,
  width,
  height,
}: ProjectCardMapProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { snapshotUri, resolving, captureSnapshot, onSnapshotError } = useMapCardSnapshot({
    id: projectId,
    latitude,
    longitude,
    width,
    height,
  });
  const mapRef = useRef<MapView>(null);
  // Live-map latch. "Released" (no MapView) whenever a snapshot exists or the
  // disk probe is still in flight; re-armed in the render phase the moment
  // neither holds (cache miss, eviction). On the cold-capture path the map
  // stays mounted until the snapshot image has actually drawn (`onDisplay`),
  // so the swap never flashes the card background.
  const [mapReleased, setMapReleased] = useState(() => snapshotUri != null || resolving);
  if (mapReleased && snapshotUri == null && !resolving) setMapReleased(false);

  // Gentle "breathing" pulse for the location dot. Cancelled on unmount and
  // stilled entirely under reduce-motion (the dot stays visible, static).
  const { reduceMotion } = useAccessibilitySettings();
  const breathe = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    breathe.value = withRepeat(
      withTiming(1.35, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(breathe);
      breathe.value = 1;
    };
  }, [reduceMotion, breathe]);
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
    opacity: interpolate(breathe.value, [1, 1.35], [1, 0.55]),
  }));

  return (
    <>
      {!mapReleased && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          region={{
            latitude,
            longitude,
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
          onMapReady={() => captureSnapshot(mapRef.current)}
        />
      )}
      {snapshotUri != null && (
        <Image
          source={{ uri: snapshotUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
          cachePolicy="memory"
          pointerEvents="none"
          onDisplay={() => setMapReleased(true)}
          onError={onSnapshotError}
        />
      )}
      {/* Strip the map's colour: a grey layer blended in 'saturation' mode
          leaves the map's hue/luminosity but zeroes its saturation. */}
      <View style={styles.mapDesaturate} pointerEvents="none" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient
            id={`mapMask-${projectId}`}
            cx={width}
            cy={0}
            r={Math.hypot(width, height)}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={theme.colors.surface} stopOpacity={0.2} />
            <Stop offset="0.5" stopColor={theme.colors.surface} stopOpacity={0.6} />
            <Stop offset="1" stopColor={theme.colors.surface} stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#mapMask-${projectId})`} />
      </Svg>
      <Animated.View style={[styles.locationDot, dotStyle]} pointerEvents="none" />
    </>
  );
});

function getStyles(theme: any) {
  return StyleSheet.create({
    mapDesaturate: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#808080',
      mixBlendMode: 'saturation',
    },
    locationDot: {
      position: 'absolute',
      // Off-centre, biased toward the top-right. Tweak these two to move it.
      left: '80%',
      top: '30%',
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: -4,
      marginTop: -4,
      backgroundColor: theme.colors.accent,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 3,
    },
  });
}
