import Svg, { Circle } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Hubble "orbital paths" brand motif - concentric rings with orange + hi-vis
 * orbiting bodies. Mirrors the web `OrbitRings` (web-app marketing). Purely
 * decorative; position it absolutely behind content with a low container opacity.
 *
 * @param size  square px size (viewBox is 480×480). Default 480.
 * @param color ring + faint-dot color (pass `theme.colors.ink` on light, white on dark).
 * @param style absolute-position / opacity wrapper style.
 * @returns a react-native-svg element (no side effects).
 */
export function OrbitField({
  size = 480,
  color = '#1A1A1A',
  style,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 480 480" style={style} pointerEvents="none">
      <Circle cx={240} cy={240} r={62} stroke={color} strokeWidth={1.5} strokeOpacity={0.9} fill="none" />
      <Circle cx={240} cy={240} r={118} stroke={color} strokeWidth={1.5} strokeOpacity={0.6} fill="none" />
      <Circle cx={240} cy={240} r={178} stroke={color} strokeWidth={1.5} strokeOpacity={0.4} fill="none" strokeDasharray={[2, 9]} />
      <Circle cx={240} cy={240} r={232} stroke={color} strokeWidth={1.5} strokeOpacity={0.22} fill="none" />
      {/* orbiting bodies - fixed brand accents */}
      <Circle cx={240} cy={122} r={9} fill="#FF6D2E" />
      <Circle cx={418} cy={240} r={6} fill="#E6FF4D" />
      <Circle cx={178} cy={240} r={4.5} fill={color} fillOpacity={0.55} />
      <Circle cx={240} cy={58} r={4} fill={color} fillOpacity={0.35} />
    </Svg>
  );
}
