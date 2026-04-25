import { View } from 'react-native';
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
// Each renders inside a 64x64 circular tile with a soft green tint.

type IllustrationKey =
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

const TINT = '#E8F5F0';
const STROKE = '#1D9E75';

function Passport() {
  return (
    <Svg viewBox="0 0 72 72" width="100%" height="100%">
      <Rect x={12} y={8} width={48} height={56} rx={3} fill="#E8F5F0" stroke="#1D9E75" strokeWidth={1.5} />
      <Rect x={12} y={8} width={11} height={56} rx={2} fill="#1D9E75" />
      <Rect x={25} y={15} width={28} height={9} rx={1.5} fill="#1D9E75" opacity={0.2} />
      <SvgText x={39} y={22} textAnchor="middle" fontSize={6.5} fontWeight="700" fill="#0F6E56">GEO</SvgText>
      <Line x1={25} y1={33} x2={54} y2={33} stroke="#D3D1C7" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={25} y1={42} x2={48} y2={42} stroke="#D3D1C7" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={25} y1={51} x2={51} y2={51} stroke="#D3D1C7" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={25} y1={59} x2={42} y2={59} stroke="#D3D1C7" strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function Certificate() {
  return (
    <Svg viewBox="0 0 72 72" width="100%" height="100%">
      <Rect x={12} y={6} width={48} height={58} rx={3} fill="#E8F5F0" stroke="#1D9E75" strokeWidth={1.5} />
      <Path d="M48 6 L60 18 L48 18 Z" fill="#9FE1CB" />
      <Path d="M48 6 L48 18 L60 18" fill="none" stroke="#1D9E75" strokeWidth={1.5} />
      <Line x1={18} y1={27} x2={54} y2={27} stroke="#D3D1C7" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={18} y1={35} x2={46} y2={35} stroke="#D3D1C7" strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={36} cy={53} r={13} fill="none" stroke="#1D9E75" strokeWidth={1.5} />
      <Circle cx={36} cy={53} r={9} fill="#1D9E75" opacity={0.12} />
      <Path d="M30 53 L34 58 L43 46" fill="none" stroke="#1D9E75" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <SvgText x={36} y={46} textAnchor="middle" fontSize={5} fill="#0F6E56">GEO</SvgText>
    </Svg>
  );
}

function LevelSurface() {
  return (
    <Svg viewBox="0 0 72 72" width="100%" height="100%">
      <Rect x={4} y={60} width={64} height={8} rx={2} fill="#D3D1C7" />
      <Line x1={4} y1={60} x2={68} y2={60} stroke="#B4B2A9" strokeWidth={1} />
      <Rect x={18} y={18} width={3} height={42} rx={1} fill="#444441" />
      <Rect x={51} y={18} width={3} height={42} rx={1} fill="#444441" />
      <Line x1={18} y1={26} x2={54} y2={26} stroke="#444441" strokeWidth={1.8} />
      <Line x1={21} y1={42} x2={51} y2={20} stroke="#444441" strokeWidth={1} opacity={0.35} />
      <Rect x={14} y={37} width={44} height={5} rx={1} fill="#8B7355" />
      <Rect x={6} y={53} width={22} height={6} rx={3} fill="white" stroke="#1D9E75" strokeWidth={1} />
      <Circle cx={17} cy={56} r={2.5} fill="#1D9E75" />
      <Circle cx={57} cy={52} r={8} fill="#1D9E75" opacity={0.15} />
      <Path d="M52 52 L56 57 L63 47" fill="none" stroke="#1D9E75" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Distance25() {
  return (
    <Svg viewBox="0 0 72 72" width="100%" height="100%">
      <Rect x={44} y={8} width={22} height={60} rx={1} fill="#D3D1C7" />
      <Line x1={44} y1={20} x2={66} y2={20} stroke="#B4B2A9" strokeWidth={0.7} />
      <Line x1={44} y1={32} x2={66} y2={32} stroke="#B4B2A9" strokeWidth={0.7} />
      <Line x1={44} y1={44} x2={66} y2={44} stroke="#B4B2A9" strokeWidth={0.7} />
      <Line x1={55} y1={8} x2={55} y2={20} stroke="#B4B2A9" strokeWidth={0.7} />
      <Line x1={55} y1={32} x2={55} y2={44} stroke="#B4B2A9" strokeWidth={0.7} />
      <Rect x={14} y={32} width={3} height={34} rx={1} fill="#444441" />
      <Rect x={2} y={30} width={28} height={6} rx={1} fill="#8B7355" />
      <Line x1={28} y1={33} x2={44} y2={33} stroke="#1D9E75" strokeWidth={1.5} strokeDasharray="3,2" />
      <Path d="M32 30 L28 33 L32 36" fill="none" stroke="#1D9E75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M40 30 L44 33 L40 36" fill="none" stroke="#1D9E75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={28} y={21} width={18} height={9} rx={2} fill="#1D9E75" />
      <SvgText x={37} y={28} textAnchor="middle" fontSize={5.5} fontWeight="700" fill="white">25სმ+</SvgText>
    </Svg>
  );
}

function ImprovisedLadder() {
  return (
    <Svg viewBox="0 0 72 72" width="100%" height="100%">
      <Line x1={4} y1={64} x2={68} y2={64} stroke="#B4B2A9" strokeWidth={1.5} />
      <Rect x={20} y={14} width={3} height={50} rx={1} fill="#444441" />
      <Rect x={49} y={14} width={3} height={50} rx={1} fill="#444441" />
      <Rect x={16} y={36} width={40} height={5} rx={1} fill="#8B7355" />
      <Line x1={20} y1={22} x2={52} y2={22} stroke="#444441" strokeWidth={1.8} />
      <Line x1={40} y1={36} x2={64} y2={64} stroke="#EF9F27" strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={50} y1={36} x2={64} y2={64} stroke="#EF9F27" strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={43} y1={42} x2={48} y2={45} stroke="#EF9F27" strokeWidth={2} strokeLinecap="round" />
      <Line x1={47} y1={50} x2={52} y2={54} stroke="#EF9F27" strokeWidth={2} strokeLinecap="round" />
      <Line x1={51} y1={59} x2={56} y2={62} stroke="#EF9F27" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={20} r={8} fill="#EF9F27" opacity={0.2} />
      <Line x1={12} y1={15} x2={12} y2={22} stroke="#EF9F27" strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={12} cy={26} r={1.8} fill="#EF9F27" />
    </Svg>
  );
}

function Jack() {
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Line x1={8} y1={82} x2={72} y2={82} stroke="#B4B2A9" strokeWidth={1.5} />
      <Rect x={24} y={77} width={32} height={6} rx={1} fill="#D3D1C7" stroke="#B4B2A9" strokeWidth={1} />
      <Rect x={35} y={24} width={10} height={54} rx={2} fill="#1D9E75" />
      {[29, 34, 39, 44, 49, 54, 59, 64].map(y => (
        <Line key={y} x1={33} y1={y} x2={47} y2={y} stroke="#0F6E56" strokeWidth={1} />
      ))}
      <Rect x={30} y={65} width={20} height={10} rx={1.5} fill="#0F6E56" />
      <Rect x={32} y={16} width={16} height={10} rx={1.5} fill="#0F6E56" />
      <Rect x={36} y={8} width={8} height={10} rx={1} fill="#444441" />
    </Svg>
  );
}

function BasePlate() {
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={4} y={72} width={72} height={8} rx={2} fill="#D3D1C7" />
      <Rect x={36} y={10} width={8} height={52} rx={1} fill="#B4B2A9" />
      <Ellipse cx={40} cy={74} rx={26} ry={5} fill="#B4B2A9" opacity={0.4} />
      <Rect x={16} y={58} width={48} height={14} rx={2} fill="#1D9E75" />
      <Rect x={33} y={52} width={14} height={22} rx={2} fill="#0F6E56" />
      <Rect x={36} y={54} width={8} height={18} rx={1} fill="#085041" />
      <Line x1={16} y1={63} x2={64} y2={63} stroke="#0F6E56" strokeWidth={0.7} opacity={0.6} />
      <Line x1={16} y1={68} x2={64} y2={68} stroke="#0F6E56" strokeWidth={0.7} opacity={0.6} />
      <Line x1={22} y1={58} x2={22} y2={72} stroke="#0F6E56" strokeWidth={1} opacity={0.4} />
      <Line x1={58} y1={58} x2={58} y2={72} stroke="#0F6E56" strokeWidth={1} opacity={0.4} />
    </Svg>
  );
}

function VertFrame() {
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={14} y={8} width={6} height={72} rx={2.5} fill="#1D9E75" />
      <Rect x={60} y={8} width={6} height={72} rx={2.5} fill="#1D9E75" />
      <Line x1={20} y1={12} x2={60} y2={76} stroke="#1D9E75" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={20} y1={76} x2={60} y2={12} stroke="#1D9E75" strokeWidth={2.5} strokeLinecap="round" />
      <Rect x={14} y={8} width={52} height={5} rx={2} fill="#0F6E56" />
      <Rect x={14} y={75} width={52} height={5} rx={2} fill="#0F6E56" />
      <Rect x={14} y={40} width={52} height={4} rx={2} fill="#0F6E56" />
      <Circle cx={20} cy={13} r={5} fill="#0F6E56" stroke="#E8F5F0" strokeWidth={1.5} />
      <Circle cx={60} cy={13} r={5} fill="#0F6E56" stroke="#E8F5F0" strokeWidth={1.5} />
      <Circle cx={20} cy={77} r={5} fill="#0F6E56" stroke="#E8F5F0" strokeWidth={1.5} />
      <Circle cx={60} cy={77} r={5} fill="#0F6E56" stroke="#E8F5F0" strokeWidth={1.5} />
    </Svg>
  );
}

function HatchPlatform() {
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={6} y={46} width={26} height={16} rx={1} fill="#8B7355" />
      <Line x1={6} y1={50} x2={32} y2={50} stroke="#6B5840" strokeWidth={0.8} />
      <Line x1={6} y1={54} x2={32} y2={54} stroke="#6B5840" strokeWidth={0.8} />
      <Line x1={6} y1={58} x2={32} y2={58} stroke="#6B5840" strokeWidth={0.8} />
      <Rect x={48} y={46} width={26} height={16} rx={1} fill="#8B7355" />
      <Line x1={48} y1={50} x2={74} y2={50} stroke="#6B5840" strokeWidth={0.8} />
      <Line x1={48} y1={54} x2={74} y2={54} stroke="#6B5840" strokeWidth={0.8} />
      <Line x1={48} y1={58} x2={74} y2={58} stroke="#6B5840" strokeWidth={0.8} />
      <Rect x={32} y={46} width={16} height={16} rx={1} fill="none" stroke="#1D9E75" strokeWidth={1.5} strokeDasharray="3,2" />
      <Rect x={32} y={26} width={16} height={16} rx={1} fill="#1D9E75" />
      <Line x1={34} y1={29} x2={46} y2={29} stroke="#0F6E56" strokeWidth={0.8} />
      <Line x1={34} y1={33} x2={46} y2={33} stroke="#0F6E56" strokeWidth={0.8} />
      <Line x1={34} y1={37} x2={46} y2={37} stroke="#0F6E56" strokeWidth={0.8} />
      <Line x1={32} y1={42} x2={48} y2={42} stroke="#0F6E56" strokeWidth={1.8} />
      <Circle cx={34} cy={42} r={2.5} fill="#0F6E56" />
      <Circle cx={46} cy={42} r={2.5} fill="#0F6E56" />
    </Svg>
  );
}

function ToeBoard() {
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={10} y={44} width={60} height={18} rx={1} fill="#8B7355" />
      <Line x1={10} y1={49} x2={70} y2={49} stroke="#6B5840" strokeWidth={0.8} />
      <Line x1={10} y1={54} x2={70} y2={54} stroke="#6B5840" strokeWidth={0.8} />
      <Line x1={10} y1={59} x2={70} y2={59} stroke="#6B5840" strokeWidth={0.8} />
      <Rect x={10} y={10} width={5} height={54} rx={1} fill="#444441" />
      <Rect x={15} y={30} width={10} height={32} rx={1} fill="#1D9E75" />
      {[34, 38, 42, 46, 50, 54].map(y => (
        <Line key={y} x1={17} y1={y} x2={23} y2={y} stroke="#0F6E56" strokeWidth={0.9} />
      ))}
      <Line x1={27} y1={30} x2={27} y2={44} stroke="#1D9E75" strokeWidth={1} strokeDasharray="2,2" />
      <Path d="M24 33 L27 30 L30 33" fill="none" stroke="#1D9E75" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M24 41 L27 44 L30 41" fill="none" stroke="#1D9E75" strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function TopMidRail() {
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={12} y={10} width={6} height={68} rx={2.5} fill="#444441" />
      <Rect x={62} y={10} width={6} height={68} rx={2.5} fill="#444441" />
      <Rect x={10} y={74} width={60} height={6} rx={1} fill="#8B7355" />
      <Rect x={12} y={12} width={56} height={6} rx={2} fill="#1D9E75" />
      <Rect x={12} y={36} width={56} height={6} rx={2} fill="#1D9E75" />
      <SvgText x={40} y={11} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#0F6E56">ზედა</SvgText>
      <SvgText x={40} y={35} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#0F6E56">შუა</SvgText>
      <Line x1={6} y1={15} x2={6} y2={39} stroke="#1D9E75" strokeWidth={1.2} />
      <Path d="M4 17 L6 14 L8 17" fill="none" stroke="#1D9E75" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M4 37 L6 40 L8 37" fill="none" stroke="#1D9E75" strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function SideRail() {
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Line x1={10} y1={22} x2={40} y2={62} stroke="#B4B2A9" strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={40} y1={22} x2={70} y2={62} stroke="#B4B2A9" strokeWidth={3.5} strokeLinecap="round" />
      <Polygon points="4,62 76,62 64,76 16,76" fill="#8B7355" />
      <Line x1={4} y1={62} x2={16} y2={76} stroke="#6B5840" strokeWidth={0.8} />
      <Line x1={76} y1={62} x2={64} y2={76} stroke="#6B5840" strokeWidth={0.8} />
      <Line x1={34} y1={62} x2={28} y2={76} stroke="#6B5840" strokeWidth={0.8} />
      <Rect x={8} y={14} width={6} height={50} rx={2.5} fill="#1D9E75" />
      <Rect x={8} y={14} width={36} height={5} rx={2} fill="#1D9E75" />
      <Line x1={12} y1={20} x2={38} y2={60} stroke="#1D9E75" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function Ladder() {
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={54} y={6} width={6} height={76} rx={2.5} fill="#B4B2A9" />
      <Rect x={50} y={42} width={24} height={5} rx={1} fill="#D3D1C7" />
      <Rect x={16} y={8} width={6} height={74} rx={2.5} fill="#1D9E75" />
      <Rect x={38} y={8} width={6} height={74} rx={2.5} fill="#1D9E75" />
      {[18, 28, 38, 48, 58, 68].map(y => (
        <Line key={y} x1={16} y1={y} x2={44} y2={y} stroke="#1D9E75" strokeWidth={3.5} strokeLinecap="round" />
      ))}
      <Path d="M44 8 Q54 8 54 18" fill="none" stroke="#1D9E75" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

function Anchor() {
  return (
    <Svg viewBox="0 0 80 88" width="100%" height="100%">
      <Rect x={38} y={8} width={32} height={72} rx={1} fill="#D3D1C7" />
      <Line x1={38} y1={22} x2={70} y2={22} stroke="#B4B2A9" strokeWidth={0.8} />
      <Line x1={38} y1={36} x2={70} y2={36} stroke="#B4B2A9" strokeWidth={0.8} />
      <Line x1={38} y1={50} x2={70} y2={50} stroke="#B4B2A9" strokeWidth={0.8} />
      <Line x1={38} y1={64} x2={70} y2={64} stroke="#B4B2A9" strokeWidth={0.8} />
      <Line x1={54} y1={8} x2={54} y2={22} stroke="#B4B2A9" strokeWidth={0.8} />
      <Line x1={54} y1={36} x2={54} y2={50} stroke="#B4B2A9" strokeWidth={0.8} />
      <Rect x={6} y={36} width={8} height={16} rx={4} fill="#B4B2A9" />
      <Rect x={10} y={41} width={38} height={6} rx={2.5} fill="#1D9E75" />
      <Line x1={22} y1={41} x2={22} y2={47} stroke="#0F6E56" strokeWidth={0.9} />
      <Line x1={27} y1={41} x2={27} y2={47} stroke="#0F6E56" strokeWidth={0.9} />
      <Line x1={32} y1={41} x2={32} y2={47} stroke="#0F6E56" strokeWidth={0.9} />
      <Line x1={37} y1={41} x2={37} y2={47} stroke="#0F6E56" strokeWidth={0.9} />
      <Rect x={48} y={36} width={7} height={16} rx={1} fill="#1D9E75" />
      <Rect x={55} y={38} width={9} height={12} rx={2} fill="#0F6E56" />
    </Svg>
  );
}

function Photo() {
  return (
    <Svg viewBox="0 0 80 80" width="100%" height="100%">
      <Rect x={8} y={20} width={58} height={44} rx={5} fill="#444441" />
      <Rect x={26} y={13} width={22} height={11} rx={3.5} fill="#444441" />
      <Circle cx={37} cy={42} r={14} fill="#2C2C2A" stroke="#1D9E75" strokeWidth={2} />
      <Circle cx={37} cy={42} r={9} fill="#1D1D1B" />
      <Circle cx={37} cy={42} r={5.5} fill="#1D9E75" opacity={0.35} />
      <Circle cx={33} cy={38} r={2.5} fill="white" opacity={0.25} />
      <Rect x={52} y={24} width={9} height={7} rx={1.5} fill="#2C2C2A" />
      <Circle cx={18} cy={28} r={3.5} fill="#EF9F27" />
      <Rect x={8} y={56} width={58} height={8} fill="#3A3A38" opacity={0.5} />
    </Svg>
  );
}

function Conclusion() {
  return (
    <Svg viewBox="0 0 80 80" width="100%" height="100%">
      <Rect x={14} y={14} width={46} height={58} rx={3} fill="#E8F5F0" stroke="#1D9E75" strokeWidth={1.5} />
      <Rect x={28} y={8} width={18} height={12} rx={3.5} fill="#1D9E75" />
      <Rect x={32} y={6} width={10} height={7} rx={3} fill="#0F6E56" />
      <Line x1={20} y1={30} x2={54} y2={30} stroke="#D3D1C7" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={20} y1={40} x2={54} y2={40} stroke="#D3D1C7" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={20} y1={50} x2={54} y2={50} stroke="#D3D1C7" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={20} y1={60} x2={40} y2={60} stroke="#D3D1C7" strokeWidth={2.5} strokeLinecap="round" />
      <G originX={46} originY={50} rotation={-38}>
        <Rect x={46} y={50} width={5} height={20} rx={2.5} fill="#1D9E75" />
      </G>
      <Polygon points="62,68 67,76 58,73" fill="#444441" />
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
// using fuzzy keyword matching. Returns null if no match — caller can hide
// the avatar.
export function illustrationKeyFor(text: string | null | undefined): IllustrationKey | null {
  if (!text) return null;
  const t = text.toLowerCase();

  // Sections 3–4
  if (t.includes('ფოტო')) return 'photo';
  if (t.includes('დასკვნ')) return 'conclusion';

  // Section 2 — components (check before section 1 keywords because some
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

  // Section 1 — yes/no
  if (t.includes('პასპორტ')) return 'passport';
  if (t.includes('სერთიფიკ')) return 'certificate';
  if (t.includes('სწორ') || t.includes('მყარ') || t.includes('ზედაპ')) return 'levelSurface';
  if (t.includes('25') || t.includes('დაშ')) return 'distance25';
  if (t.includes('კუსტ') || t.includes('თვითნაკეთ') || t.includes('კიბე')) return 'improvisedLadder';

  return null;
}

export function QuestionAvatar({
  illustrationKey,
  size = 64,
}: {
  illustrationKey: IllustrationKey | null;
  size?: number;
}) {
  if (!illustrationKey) return null;
  const Component = REGISTRY[illustrationKey];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: TINT,
        borderWidth: 1,
        borderColor: STROKE,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: size * 0.78, height: size * 0.78 }}>
        <Component />
      </View>
    </View>
  );
}
