/**
 * Custom action icons where the "+" is integrated into the subject shape.
 * Each icon communicates both the subject and the "add" action as one cohesive form.
 *
 * ViewBox: 0 0 26 26  |  strokeWidth: 1.8  |  fill: none
 * strokeLinecap/Join: round
 */
import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

const SW = 1.8;
type Props = { size?: number; color: string };

/**
 * Clipboard outline with a + sign replacing the usual checklist lines.
 * The tab notch and body form a recognisable clipboard; the + signals "add inspection".
 */
export function InspectionAddIcon({ size = 26, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      {/* Body — gap left between x=10..16 at top for the tab */}
      <Path
        d="M 16 5 L 21 5 Q 22.5 5 22.5 6.5 L 22.5 22.5 Q 22.5 24 21 24 L 5 24 Q 3.5 24 3.5 22.5 L 3.5 6.5 Q 3.5 5 5 5 L 10 5"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tab — U-shape sitting atop the gap */}
      <Path
        d="M 10 5 L 10 3.5 Q 10 2.5 13 2.5 Q 16 2.5 16 3.5 L 16 5"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* + inside clipboard body */}
      <Line x1="13" y1="10" x2="13" y2="19" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="8.5" y1="14.5" x2="17.5" y2="14.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Warning triangle outline where the exclamation mark is replaced by a + shape.
 * Triangle signals "incident"; the + inside signals "add".
 */
export function IncidentAddIcon({ size = 26, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      {/* Triangle with soft corners */}
      <Path
        d="M 13 3.5 L 23 22 Q 23.5 23 22.5 23 L 3.5 23 Q 2.5 23 3 22 Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* + inside triangle (replaces the ! mark) */}
      <Line x1="13" y1="9" x2="13" y2="18" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="9.5" y1="13.5" x2="16.5" y2="13.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Speech bubble with a + sign inside instead of text lines.
 * Bubble = briefing/instruction; + = create new briefing.
 * Tail at bottom-left anchors the speaker direction.
 */
export function BriefingAddIcon({ size = 26, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      {/* Bubble body + tail */}
      <Path
        d="M 5 3 Q 3 3 3 5 L 3 16 Q 3 18 5 18 L 4.5 18 L 2.5 23.5 L 8.5 18 L 21 18 Q 23 18 23 16 L 23 5 Q 23 3 21 3 Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* + inside bubble */}
      <Line x1="13" y1="6.5" x2="13" y2="14.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="9" y1="10.5" x2="17" y2="10.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Document outline with folded corner; the content "lines" are a single + shape.
 * The + acts as both the page content and the create-new signal.
 */
export function ReportAddIcon({ size = 26, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      {/* Document body with folded top-right corner */}
      <Path
        d="M 18 2 L 5 2 Q 4 2 4 3 L 4 23 Q 4 24 5 24 L 21 24 Q 22 24 22 23 L 22 6 Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Corner fold */}
      <Path
        d="M 18 2 L 18 6 L 22 6"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* + as page content */}
      <Line x1="13" y1="10" x2="13" y2="20.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="8" y1="15" x2="18" y2="15" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Person silhouette (head + cross body) where the torso IS a + shape.
 * Head circle + vertical spine + horizontal arms = person adding themselves.
 */
export function ParticipantAddIcon({ size = 26, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      {/* Head */}
      <Circle cx="13" cy="7.5" r="3.5" stroke={color} strokeWidth={SW} />
      {/* Body as + shape (vertical spine + horizontal arms) */}
      <Line x1="13" y1="12" x2="13" y2="24" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="7.5" y1="18" x2="18.5" y2="18" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Folder outline with a + sign integrated into the folder body.
 * The + symbol sits inside the folder face, signalling "add file".
 */
export function FileAddIcon({ size = 26, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      {/* Folder shape: tab at top-left, body below */}
      <Path
        d="M 2.5 22 Q 2.5 23.5 4 23.5 L 22 23.5 Q 23.5 23.5 23.5 22 L 23.5 10.5 Q 23.5 9 22 9 L 11.5 9 L 10 7 Q 9.5 6 8.5 6 L 4 6 Q 2.5 6 2.5 7.5 Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* + inside folder body */}
      <Line x1="13" y1="12.5" x2="13" y2="21" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="9" y1="16.5" x2="17" y2="16.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}
