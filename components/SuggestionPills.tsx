import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../components/primitives/A11yText';
import { useTheme } from '../lib/theme';

interface SuggestionPillsProps {
  suggestions: string[];
  onSelect: (value: string) => void;
  visible?: boolean;
  label?: string;
}

export const SuggestionPills: React.FC<SuggestionPillsProps> = ({
  suggestions,
  onSelect,
  visible = true,
  label = 'წინა მნიშვნელობები',
}) => {
  const { theme } = useTheme();

  if (!visible || suggestions.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.inkFaint }]}>
          {label}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((value, index) => (
          <Pressable
            key={`${value}-${index}`}
            onPress={() => onSelect(value)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: theme.colors.accentSoft,
                borderColor: theme.colors.accent,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={13}
              color={theme.colors.accent}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[styles.pillText, { color: theme.colors.accent }]}
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
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 220,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
