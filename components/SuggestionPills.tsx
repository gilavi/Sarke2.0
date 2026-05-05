import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../components/primitives/A11yText';
import { useTheme } from '../lib/theme';

interface SuggestionPillsProps {
  suggestions: string[];
  onSelect: (value: string) => void;
  visible?: boolean;
}

const MAX_SUGGESTIONS = 3;

export const SuggestionPills: React.FC<SuggestionPillsProps> = ({
  suggestions,
  onSelect,
  visible = true,
}) => {
  const { theme } = useTheme();

  if (!visible || suggestions.length === 0) return null;

  const items = suggestions.slice(0, MAX_SUGGESTIONS);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((value, index) => (
          <Pressable
            key={`${value}-${index}`}
            onPress={() => onSelect(value)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: theme.colors.subtleSurface ?? '#F1F1EE',
                borderColor: theme.colors.hairline,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[styles.chipText, { color: theme.colors.inkSoft }]}
              numberOfLines={1}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
    marginBottom: 8,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 220,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
