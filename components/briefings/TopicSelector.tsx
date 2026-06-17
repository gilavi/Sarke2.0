/**
 * Monochrome multi-select topic list for the briefing (ინსტრუქტაჟი) wizard,
 * step 1. Mirrors the StatusChip answer language: selected = ink fill + inverse
 * (light) content; unselected = hairline border + muted content. No green/orange
 * selection accents. Selecting `other` reveals a free-text topic input.
 */
import { useMemo } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

export const TOPIC_KEYS = [
  'scaffold_safety', 'height_work', 'ppe', 'evacuation', 'fire_safety', 'other',
] as const;

export const TOPIC_ICONS: Record<typeof TOPIC_KEYS[number], keyof typeof Ionicons.glyphMap> = {
  scaffold_safety: 'construct-outline',
  height_work: 'arrow-up-circle-outline',
  ppe: 'shield-outline',
  evacuation: 'exit-outline',
  fire_safety: 'flame-outline',
  other: 'pencil-outline',
};

export interface TopicSelectorProps {
  selectedTopics: Set<string>;
  onToggle: (key: string) => void;
  customTopic: string;
  onChangeCustomTopic: (value: string) => void;
}

export function TopicSelector({
  selectedTopics,
  onToggle,
  customTopic,
  onChangeCustomTopic,
}: TopicSelectorProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <>
      <View style={styles.list}>
        {TOPIC_KEYS.map(key => {
          const label = t(`briefings.topics.${key}`);
          const selected = selectedTopics.has(key);
          return (
            <Pressable
              key={key}
              onPress={() => onToggle(key)}
              style={[styles.row, selected && styles.rowSelected]}
              {...a11y(label, selected ? 'მონიშნულია' : 'არ არის მონიშნული', 'checkbox')}
            >
              <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
                <Ionicons
                  name={TOPIC_ICONS[key]}
                  size={16}
                  color={selected ? theme.colors.ink : theme.colors.inkSoft}
                />
              </View>
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {label}
              </Text>
              <Ionicons
                name={selected ? 'checkbox' : 'square-outline'}
                size={20}
                color={selected ? theme.colors.ink : theme.colors.borderStrong}
              />
            </Pressable>
          );
        })}
      </View>

      {selectedTopics.has('other') && (
        <FloatingLabelInput
          label="თემის დასახელება"
          value={customTopic}
          onChangeText={onChangeCustomTopic}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      )}
    </>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    list: {
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    rowSelected: {
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.subtleSurface,
    },
    iconBox: {
      width: 34,
      height: 34,
      borderRadius: 9,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBoxSelected: {
      backgroundColor: theme.colors.surface,
    },
    label: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.inkSoft,
    },
    labelSelected: {
      fontWeight: '600',
      color: theme.colors.ink,
    },
  });
}
