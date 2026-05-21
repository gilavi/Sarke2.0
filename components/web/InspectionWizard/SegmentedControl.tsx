import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { WIZARD_COLORS as C, webStyle, type AnswerValue } from './types';

const OPTION_LABEL: Record<AnswerValue, string> = {
  yes: 'კი',
  no: 'არა',
  na: 'N/A',
};

const SELECTED_BG: Record<AnswerValue, string> = {
  yes: C.green,
  no: C.red,
  na: C.na,
};

interface SegmentedControlProps {
  options: AnswerValue[];
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
}

/**
 * Compact 3-state pill group (კი / არა / N/A) used per question row. Web only.
 * Selected colour is driven by the option; unselected pills lighten on hover.
 */
export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  if (Platform.OS !== 'web') return null;

  return (
    <Pressable style={styles.group} accessibilityRole="radiogroup">
      {options.map((option, index) => (
        <Segment
          key={option}
          option={option}
          selected={value === option}
          first={index === 0}
          last={index === options.length - 1}
          onPress={() => onChange(option)}
        />
      ))}
    </Pressable>
  );
}

function Segment({
  option,
  selected,
  first,
  last,
  onPress,
}: {
  option: AnswerValue;
  selected: boolean;
  first: boolean;
  last: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const background = selected
    ? SELECTED_BG[option]
    : hovered
      ? C.segmentHover
      : C.segmentBg;
  const color = selected ? '#FFFFFF' : C.textGray;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.segment,
        first && styles.segmentFirst,
        last && styles.segmentLast,
        { backgroundColor: background },
      ]}
    >
      <Text style={[styles.label, { color }]}>{OPTION_LABEL[option]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: webStyle({
    width: 56,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '120ms',
  }),
  segmentFirst: {
    marginLeft: 0,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  segmentLast: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
