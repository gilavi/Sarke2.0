import { createContext, memo, useContext } from 'react';
import { View } from 'react-native';
import { useTheme } from '../lib/theme';
import { useIllustrationPalette, type IllustrationPalette } from '../lib/illustrationPalette';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

// 16 small recognition illustrations for the scaffold inspection wizard.
// Each renders inside a 64x64 circular tile tinted with the primary wash.
// All colors come from the shared monochrome illustration palette
// (lib/illustrationPalette.ts) - orange + electric yellow + black/neutral.

export type IllustrationKey =
  | 'passport'
  | 'certificate'
  | 'levelSurface'
  | 'distance25'
  | 'improvisedLadder'
  | 'jack'
  | 'basePlate'
  | 'vertFrame'
  | 'hatchPlatform'
  | 'toeBoard'
  | 'topMidRail'
  | 'sideRail'
  | 'ladder'
  | 'anchor'
  | 'photo'
  | 'conclusion';

// Fallback palette so the SVGs still render (in brand colors) if used outside a
// provider. Real values are injected by QuestionAvatar via useIllustrationPalette.
const FALLBACK: IllustrationPalette = {
  line: '#FF6D2E',
  lineDeep: '#BE3F0B',
  lineDeepest: '#7B2913',
  fill: '#FFF3EE',
  fillStrong: '#FFE3D6',
  pop: '#E6FF4D',
  popSoft: '#F6FFC9',
  ink: '#1A1A1A',
  hardware: '#444441',
  material: '#9C988F',
  materialLine: '#4E4A44',
  metal: '#C2BEB6',
  metalDark: '#9C988F',
  ground: '#D6D6D1',
  hairline: '#D6D6D1',
  white: '#FFFFFF',
};

const SvgCtx = createContext<IllustrationPalette>(FALLBACK);

function Passport() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 72 72" width="100%" height="100%">
      {/* data page */}
      <Rect x={10} y={9} width={52} height={54} rx={4} fill={c.fill} stroke={c.line} strokeWidth={1.5} />
      {/* portrait photo */}
      <Rect x={15} y={17} width={18} height={22} rx={2} fill={c.white} stroke={c.line} strokeWidth={1} />
      <Circle cx={24} cy={25} r={3.6} fill={c.line} opacity={0.5} />
      <Path d="M18 38 C18 32.5 21 30 24 30 C27 30 30 32.5 30 38 Z" fill={c.line} opacity={0.5} />
      {/* data lines */}
      <Line x1={37} y1={20} x2={56} y2={20} stroke={c.metal} strokeWidth={2} strokeLinecap="round" />
      <Line x1={37} y1={26} x2={56} y2={26} stroke={c.ground} strokeWidth={2} strokeLinecap="round" />
      <Line x1={37} y1={32} x2={50} y2={32} stroke={c.ground} strokeWidth={2} strokeLinecap="round" />
      {/* GEO language stamp */}
      <Rect x={37} y={36} width={15} height={6} rx={3} fill={c.line} />
      <SvgText x={44.5} y={40.6} textAnchor="middle" fontSize={4.2} fontWeight="700" fill={c.white}>GEO</SvgText>
      {/* machine-readable zone */}
      <Rect x={14} y={47} width={44} height={12} rx={2} fill={c.white} stroke={c.hairline} strokeWidth={0.8} />
      <Line x1={17} y1={51} x2={55} y2={51} stroke={c.metal} strokeWidth={1.6} strokeDasharray="2,1.4" strokeLinecap="round" />
      <Line x1={17} y1={55} x2={49} y2={55} stroke={c.ground} strokeWidth={1.6} strokeDasharray="2,1.4" strokeLinecap="round" />
    </Svg>
  );
}

function Certificate() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 72 72" width="100%" height="100%">
      <Rect x={12} y={6} width={48} height={58} rx={3} fill={c.fill} stroke={c.line} strokeWidth={1.5} />
      <Path d="M48 6 L60 18 L48 18 Z" fill={c.line} opacity={0.25} />
      <Path d="M48 6 L48 18 L60 18" fill="none" stroke={c.line} strokeWidth={1.5} />
      <Line x1={18} y1={27} x2={54} y2={27} stroke={c.ground} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={18} y1={35} x2={46} y2={35} stroke={c.ground} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={36} cy={53} r={13} fill="none" stroke={c.line} strokeWidth={1.5} />
      <Circle cx={36} cy={53} r={9} fill={c.line} opacity={0.12} />
      <Path d="M30 53 L34 58 L43 46" fill="none" stroke={c.line} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <SvgText x={36} y={46} textAnchor="middle" fontSize={5} fill={c.line}>GEO</SvgText>
    </Svg>
  );
}

function LevelSurface() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 72 72" width="100%" height="100%">
      <Rect x={4} y={60} width={64} height={8} rx={2} fill={c.ground} />
      <Line x1={4} y1={60} x2={68} y2={60} stroke={c.metalDark} strokeWidth={1} />
      <Rect x={18} y={18} width={3} height={42} rx={1} fill={c.hardware} />
      <Rect x={51} y={18} width={3} height={42} rx={1} fill={c.hardware} />
      <Line x1={18} y1={26} x2={54} y2={26} stroke={c.hardware} strokeWidth={1.8} />
      <Line x1={21} y1={42} x2={51} y2={20} stroke={c.hardware} strokeWidth={1} opacity={0.35} />
      <Rect x={14} y={37} width={44} height={5} rx={1} fill={c.material} />
      <Rect x={6} y={53} width={22} height={6} rx={3} fill={c.white} stroke={c.line} strokeWidth={1} />
      <Circle cx={17} cy={56} r={2.5} fill={c.line} />
      <Circle cx={57} cy={52} r={8} fill={c.line} opacity={0.15} />
      <Path d="M52 52 L56 57 L63 47" fill="none" stroke={c.line} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Distance25() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 72 72" width="100%" height="100%">
      <Rect x={44} y={8} width={22} height={60} rx={1} fill={c.ground} />
      <Line x1={44} y1={20} x2={66} y2={20} stroke={c.metalDark} strokeWidth={0.7} />
      <Line x1={44} y1={32} x2={66} y2={32} stroke={c.metalDark} strokeWidth={0.7} />
      <Line x1={44} y1={44} x2={66} y2={44} stroke={c.metalDark} strokeWidth={0.7} />
      <Line x1={55} y1={8} x2={55} y2={20} stroke={c.metalDark} strokeWidth={0.7} />
      <Line x1={55} y1={32} x2={55} y2={44} stroke={c.metalDark} strokeWidth={0.7} />
      <Rect x={14} y={32} width={3} height={34} rx={1} fill={c.hardware} />
      <Rect x={2} y={30} width={28} height={6} rx={1} fill={c.material} />
      <Line x1={28} y1={33} x2={44} y2={33} stroke={c.line} strokeWidth={1.5} strokeDasharray="3,2" />
      <Path d="M32 30 L28 33 L32 36" fill="none" stroke={c.line} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M40 30 L44 33 L40 36" fill="none" stroke={c.line} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={28} y={21} width={18} height={9} rx={2} fill={c.line} />
      <SvgText x={37} y={28} textAnchor="middle" fontSize={5.5} fontWeight="700" fill={c.white}>25სმ+</SvgText>
    </Svg>
  );
}

function ImprovisedLadder() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 72 72" width="100%" height="100%">
      <Line x1={4} y1={64} x2={68} y2={64} stroke={c.metalDark} strokeWidth={1.5} />
      <Rect x={20} y={14} width={3} height={50} rx={1} fill={c.hardware} />
      <Rect x={49} y={14} width={3} height={50} rx={1} fill={c.hardware} />
      <Rect x={16} y={36} width={40} height={5} rx={1} fill={c.material} />
      <Line x1={20} y1={22} x2={52} y2={22} stroke={c.hardware} strokeWidth={1.8} />
      {/* improvised / makeshift lashing - deep orange to flag "wrong" */}
      <Line x1={40} y1={36} x2={64} y2={64} stroke={c.lineDeep} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={50} y1={36} x2={64} y2={64} stroke={c.lineDeep} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={43} y1={42} x2={48} y2={45} stroke={c.lineDeep} strokeWidth={2} strokeLinecap="round" />
      <Line x1={47} y1={50} x2={52} y2={54} stroke={c.lineDeep} strokeWidth={2} strokeLinecap="round" />
      <Line x1={51} y1={59} x2={56} y2={62} stroke={c.lineDeep} strokeWidth={2} strokeLinecap="round" />
      {/* warning lamp - electric-yellow pop with a dark filament for contrast */}
      <Circle cx={12} cy={20} r={8} fill={c.pop} opacity={0.4} />
      <Line x1={12} y1={15} x2={12} y2={22} stroke={c.ink} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={12} cy={26} r={1.8} fill={c.ink} />
    </Svg>
  );
}

function Jack() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Line x1={8} y1={82} x2={72} y2={82} stroke={c.metalDark} strokeWidth={1.5} />
      <Rect x={24} y={77} width={32} height={6} rx={1} fill={c.ground} stroke={c.metalDark} strokeWidth={1} />
      <Rect x={35} y={24} width={10} height={54} rx={2} fill={c.line} />
      {[29, 34, 39, 44, 49, 54, 59, 64].map(y => (
        <Line key={y} x1={33} y1={y} x2={47} y2={y} stroke={c.lineDeep} strokeWidth={1} />
      ))}
      <Rect x={30} y={65} width={20} height={10} rx={1.5} fill={c.lineDeep} />
      <Rect x={32} y={16} width={16} height={10} rx={1.5} fill={c.lineDeep} />
      <Rect x={36} y={8} width={8} height={10} rx={1} fill={c.hardware} />
    </Svg>
  );
}

function BasePlate() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={4} y={72} width={72} height={8} rx={2} fill={c.ground} />
      <Rect x={36} y={10} width={8} height={52} rx={1} fill={c.metalDark} />
      <Ellipse cx={40} cy={74} rx={26} ry={5} fill={c.metalDark} opacity={0.4} />
      <Rect x={16} y={58} width={48} height={14} rx={2} fill={c.line} />
      <Rect x={33} y={52} width={14} height={22} rx={2} fill={c.lineDeep} />
      <Rect x={36} y={54} width={8} height={18} rx={1} fill={c.lineDeepest} />
      <Line x1={16} y1={63} x2={64} y2={63} stroke={c.lineDeep} strokeWidth={0.7} opacity={0.6} />
      <Line x1={16} y1={68} x2={64} y2={68} stroke={c.lineDeep} strokeWidth={0.7} opacity={0.6} />
      <Line x1={22} y1={58} x2={22} y2={72} stroke={c.lineDeep} strokeWidth={1} opacity={0.4} />
      <Line x1={58} y1={58} x2={58} y2={72} stroke={c.lineDeep} strokeWidth={1} opacity={0.4} />
    </Svg>
  );
}

function VertFrame() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={14} y={8} width={6} height={72} rx={2.5} fill={c.line} />
      <Rect x={60} y={8} width={6} height={72} rx={2.5} fill={c.line} />
      <Line x1={20} y1={12} x2={60} y2={76} stroke={c.line} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={20} y1={76} x2={60} y2={12} stroke={c.line} strokeWidth={2.5} strokeLinecap="round" />
      <Rect x={14} y={8} width={52} height={5} rx={2} fill={c.lineDeep} />
      <Rect x={14} y={75} width={52} height={5} rx={2} fill={c.lineDeep} />
      <Rect x={14} y={40} width={52} height={4} rx={2} fill={c.lineDeep} />
      <Circle cx={20} cy={13} r={5} fill={c.lineDeep} stroke={c.fill} strokeWidth={1.5} />
      <Circle cx={60} cy={13} r={5} fill={c.lineDeep} stroke={c.fill} strokeWidth={1.5} />
      <Circle cx={20} cy={77} r={5} fill={c.lineDeep} stroke={c.fill} strokeWidth={1.5} />
      <Circle cx={60} cy={77} r={5} fill={c.lineDeep} stroke={c.fill} strokeWidth={1.5} />
    </Svg>
  );
}

function HatchPlatform() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={6} y={46} width={26} height={16} rx={1} fill={c.material} />
      <Line x1={6} y1={50} x2={32} y2={50} stroke={c.materialLine} strokeWidth={0.8} />
      <Line x1={6} y1={54} x2={32} y2={54} stroke={c.materialLine} strokeWidth={0.8} />
      <Line x1={6} y1={58} x2={32} y2={58} stroke={c.materialLine} strokeWidth={0.8} />
      <Rect x={48} y={46} width={26} height={16} rx={1} fill={c.material} />
      <Line x1={48} y1={50} x2={74} y2={50} stroke={c.materialLine} strokeWidth={0.8} />
      <Line x1={48} y1={54} x2={74} y2={54} stroke={c.materialLine} strokeWidth={0.8} />
      <Line x1={48} y1={58} x2={74} y2={58} stroke={c.materialLine} strokeWidth={0.8} />
      <Rect x={32} y={46} width={16} height={16} rx={1} fill="none" stroke={c.line} strokeWidth={1.5} strokeDasharray="3,2" />
      <Rect x={32} y={26} width={16} height={16} rx={1} fill={c.line} />
      <Line x1={34} y1={29} x2={46} y2={29} stroke={c.lineDeep} strokeWidth={0.8} />
      <Line x1={34} y1={33} x2={46} y2={33} stroke={c.lineDeep} strokeWidth={0.8} />
      <Line x1={34} y1={37} x2={46} y2={37} stroke={c.lineDeep} strokeWidth={0.8} />
      <Line x1={32} y1={42} x2={48} y2={42} stroke={c.lineDeep} strokeWidth={1.8} />
      <Circle cx={34} cy={42} r={2.5} fill={c.lineDeep} />
      <Circle cx={46} cy={42} r={2.5} fill={c.lineDeep} />
    </Svg>
  );
}

function ToeBoard() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={10} y={44} width={60} height={18} rx={1} fill={c.material} />
      <Line x1={10} y1={49} x2={70} y2={49} stroke={c.materialLine} strokeWidth={0.8} />
      <Line x1={10} y1={54} x2={70} y2={54} stroke={c.materialLine} strokeWidth={0.8} />
      <Line x1={10} y1={59} x2={70} y2={59} stroke={c.materialLine} strokeWidth={0.8} />
      <Rect x={10} y={10} width={5} height={54} rx={1} fill={c.hardware} />
      <Rect x={15} y={30} width={10} height={32} rx={1} fill={c.line} />
      {[34, 38, 42, 46, 50, 54].map(y => (
        <Line key={y} x1={17} y1={y} x2={23} y2={y} stroke={c.lineDeep} strokeWidth={0.9} />
      ))}
      <Line x1={27} y1={30} x2={27} y2={44} stroke={c.line} strokeWidth={1} strokeDasharray="2,2" />
      <Path d="M24 33 L27 30 L30 33" fill="none" stroke={c.line} strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M24 41 L27 44 L30 41" fill="none" stroke={c.line} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function TopMidRail() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={12} y={10} width={6} height={68} rx={2.5} fill={c.hardware} />
      <Rect x={62} y={10} width={6} height={68} rx={2.5} fill={c.hardware} />
      <Rect x={10} y={74} width={60} height={6} rx={1} fill={c.material} />
      <Rect x={12} y={12} width={56} height={6} rx={2} fill={c.line} />
      <Rect x={12} y={36} width={56} height={6} rx={2} fill={c.line} />
      <SvgText x={40} y={11} textAnchor="middle" fontSize={7.5} fontWeight="700" fill={c.lineDeep}>ზედა</SvgText>
      <SvgText x={40} y={35} textAnchor="middle" fontSize={7.5} fontWeight="700" fill={c.lineDeep}>შუა</SvgText>
      <Line x1={6} y1={15} x2={6} y2={39} stroke={c.line} strokeWidth={1.2} />
      <Path d="M4 17 L6 14 L8 17" fill="none" stroke={c.line} strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M4 37 L6 40 L8 37" fill="none" stroke={c.line} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function SideRail() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Line x1={10} y1={22} x2={40} y2={62} stroke={c.metalDark} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={40} y1={22} x2={70} y2={62} stroke={c.metalDark} strokeWidth={3.5} strokeLinecap="round" />
      <Polygon points="4,62 76,62 64,76 16,76" fill={c.material} />
      <Line x1={4} y1={62} x2={16} y2={76} stroke={c.materialLine} strokeWidth={0.8} />
      <Line x1={76} y1={62} x2={64} y2={76} stroke={c.materialLine} strokeWidth={0.8} />
      <Line x1={34} y1={62} x2={28} y2={76} stroke={c.materialLine} strokeWidth={0.8} />
      <Rect x={8} y={14} width={6} height={50} rx={2.5} fill={c.line} />
      <Rect x={8} y={14} width={36} height={5} rx={2} fill={c.line} />
      <Line x1={12} y1={20} x2={38} y2={60} stroke={c.line} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function Ladder() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={54} y={6} width={6} height={76} rx={2.5} fill={c.metalDark} />
      <Rect x={50} y={42} width={24} height={5} rx={1} fill={c.ground} />
      <Rect x={16} y={8} width={6} height={74} rx={2.5} fill={c.line} />
      <Rect x={38} y={8} width={6} height={74} rx={2.5} fill={c.line} />
      {[18, 28, 38, 48, 58, 68].map(y => (
        <Line key={y} x1={16} y1={y} x2={44} y2={y} stroke={c.line} strokeWidth={3.5} strokeLinecap="round" />
      ))}
      <Path d="M44 8 Q54 8 54 18" fill="none" stroke={c.line} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

function Anchor() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={38} y={8} width={32} height={72} rx={1} fill={c.ground} />
      <Line x1={38} y1={22} x2={70} y2={22} stroke={c.metalDark} strokeWidth={0.8} />
      <Line x1={38} y1={36} x2={70} y2={36} stroke={c.metalDark} strokeWidth={0.8} />
      <Line x1={38} y1={50} x2={70} y2={50} stroke={c.metalDark} strokeWidth={0.8} />
      <Line x1={38} y1={64} x2={70} y2={64} stroke={c.metalDark} strokeWidth={0.8} />
      <Line x1={54} y1={8} x2={54} y2={22} stroke={c.metalDark} strokeWidth={0.8} />
      <Line x1={54} y1={36} x2={54} y2={50} stroke={c.metalDark} strokeWidth={0.8} />
      <Rect x={6} y={36} width={8} height={16} rx={4} fill={c.metalDark} />
      <Rect x={10} y={41} width={38} height={6} rx={2.5} fill={c.line} />
      <Line x1={22} y1={41} x2={22} y2={47} stroke={c.lineDeep} strokeWidth={0.9} />
      <Line x1={27} y1={41} x2={27} y2={47} stroke={c.lineDeep} strokeWidth={0.9} />
      <Line x1={32} y1={41} x2={32} y2={47} stroke={c.lineDeep} strokeWidth={0.9} />
      <Line x1={37} y1={41} x2={37} y2={47} stroke={c.lineDeep} strokeWidth={0.9} />
      <Rect x={48} y={36} width={7} height={16} rx={1} fill={c.line} />
      <Rect x={55} y={38} width={9} height={12} rx={2} fill={c.lineDeep} />
    </Svg>
  );
}

function Photo() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 80" width="100%" height="100%">
      <Rect x={8} y={20} width={58} height={44} rx={5} fill={c.ink} />
      <Rect x={26} y={13} width={22} height={11} rx={3.5} fill={c.ink} />
      <Circle cx={37} cy={42} r={14} fill={c.ink} stroke={c.line} strokeWidth={2} />
      <Circle cx={37} cy={42} r={9} fill={c.lineDeepest} />
      <Circle cx={37} cy={42} r={5.5} fill={c.line} opacity={0.45} />
      <Circle cx={33} cy={38} r={2.5} fill={c.white} opacity={0.25} />
      <Rect x={52} y={24} width={9} height={7} rx={1.5} fill={c.lineDeepest} />
      {/* flash - electric-yellow pop */}
      <Circle cx={18} cy={28} r={3.5} fill={c.pop} />
      <Rect x={8} y={56} width={58} height={8} fill={c.ink} opacity={0.4} />
    </Svg>
  );
}

function Conclusion() {
  const c = useContext(SvgCtx);
  return (
    <Svg viewBox="0 0 80 80" width="100%" height="100%">
      <Rect x={14} y={14} width={46} height={58} rx={3} fill={c.fill} stroke={c.line} strokeWidth={1.5} />
      <Rect x={28} y={8} width={18} height={12} rx={3.5} fill={c.line} />
      <Rect x={32} y={6} width={10} height={7} rx={3} fill={c.lineDeep} />
      <Line x1={20} y1={30} x2={54} y2={30} stroke={c.ground} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={20} y1={40} x2={54} y2={40} stroke={c.ground} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={20} y1={50} x2={54} y2={50} stroke={c.ground} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={20} y1={60} x2={40} y2={60} stroke={c.ground} strokeWidth={2.5} strokeLinecap="round" />
      <G originX={46} originY={50} rotation={-38}>
        <Rect x={46} y={50} width={5} height={20} rx={2.5} fill={c.line} />
      </G>
      <Polygon points="62,68 67,76 58,73" fill={c.hardware} />
    </Svg>
  );
}

const REGISTRY: Record<IllustrationKey, () => React.ReactElement> = {
  passport: Passport,
  certificate: Certificate,
  levelSurface: LevelSurface,
  distance25: Distance25,
  improvisedLadder: ImprovisedLadder,
  jack: Jack,
  basePlate: BasePlate,
  vertFrame: VertFrame,
  hatchPlatform: HatchPlatform,
  toeBoard: ToeBoard,
  topMidRail: TopMidRail,
  sideRail: SideRail,
  ladder: Ladder,
  anchor: Anchor,
  photo: Photo,
  conclusion: Conclusion,
};

// Maps a question title or grid row label to one of the illustration keys
// using fuzzy keyword matching. Returns null if no match - caller can hide
// the avatar.
export function illustrationKeyFor(text: string | null | undefined): IllustrationKey | null {
  if (!text) return null;
  const t = text.toLowerCase();

  // Sections 3–4
  if (t.includes('ფოტო')) return 'photo';
  if (t.includes('დასკვნ')) return 'conclusion';

  // Section 2 - components (check before section 1 keywords because some
  // titles overlap, e.g. "მოაჯ" appears in both top/mid and side rails).
  if (t.includes('დომკრატ')) return 'jack';
  if (t.includes('ფირფიტ') || t.includes('საბაზ')) return 'basePlate';
  if (t.includes('ვერტ') || t.includes('ჩარჩო')) return 'vertFrame';
  if (t.includes('ლუქ') || t.includes('პლათფ')) return 'hatchPlatform';
  if ((t.includes('ქვ') && t.includes('დაფ')) || t.includes('დამც')) return 'toeBoard';
  if (t.includes('გვერდ') || t.startsWith('გვ.') || t.includes('გვ ') || /^გვ\b/.test(t)) return 'sideRail';
  if (t.includes('ზედ') || t.includes('შუა') || t.includes('მოაჯ')) return 'topMidRail';
  if (t.includes('ასასვლ')) return 'ladder';
  if (t.includes('ანკ') || t.includes('გამაგრ')) return 'anchor';

  // Section 1 - yes/no
  if (t.includes('პასპორტ')) return 'passport';
  if (t.includes('სერთიფიკ')) return 'certificate';
  if (t.includes('სწორ') || t.includes('მყარ') || t.includes('ზედაპ')) return 'levelSurface';
  if (t.includes('25') || t.includes('დაშ')) return 'distance25';
  if (t.includes('კუსტ') || t.includes('თვითნაკეთ') || t.includes('კიბე')) return 'improvisedLadder';

  return null;
}

export const QuestionAvatar = memo(function QuestionAvatar({
  illustrationKey,
  size = 112,
  variant = 'circle',
}: {
  illustrationKey: IllustrationKey | null;
  size?: number;
  variant?: 'circle' | 'banner';
}) {
  const { theme } = useTheme();
  const palette = useIllustrationPalette();

  if (!illustrationKey) return null;
  const Component = REGISTRY[illustrationKey];

  if (variant === 'banner') {
    const bannerHeight = 180;
    const illoSize = bannerHeight * 0.72;
    return (
      <SvgCtx.Provider value={palette}>
        <View
          style={{
            width: '100%',
            height: bannerHeight,
            borderRadius: 16,
            backgroundColor: theme.colors.accentSoft,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: illoSize, height: illoSize }}>
            <Component />
          </View>
        </View>
      </SvgCtx.Provider>
    );
  }

  return (
    <SvgCtx.Provider value={palette}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.accentSoft,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: size * 0.82, height: size * 0.82 }}>
          <Component />
        </View>
      </View>
    </SvgCtx.Provider>
  );
});
