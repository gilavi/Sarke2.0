// Bottom-sheet body for the slings / chains inspection equipment-type picker.
//
// Replaces the 7-chip multi-select that used to live inline in
// app/inspections/lifting-accessories/[id].tsx step 1. Each option is a
// tappable row with a checkmark for selections; the "სხვა" (other) row
// reveals a free-text input so the inspector can name the equipment.
//
// Abbreviations in the option labels (`ტექ. სლინგი`, `მრგვ. სლინგი`,
// `ბეწვ. სლინგი`, `ჯაჭვ. სლინგი`, `ჩამჭიდი`, `კაუჭი`, `სხვა`) are
// preserved verbatim from the lifting-accessories type catalog by user
// override — see the AGENTS.md for that route.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { Button } from '../ui';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';

export interface SlingTypeSheetProps {
  /** All available equipment types. */
  options: readonly string[];
  /** Currently selected types. Multi-select. */
  values: string[];
  /** Optional "სხვა" sentinel that unlocks the free-text input. */
  otherOptionValue?: string;
  /** Current free-text value for the "other" option. */
  otherValue?: string;
  /** Called when selection changes (committed on dismiss / done). */
  onChange: (values: string[], otherValue: string) => void;
  /** Called when the sheet should close (Done tap, backdrop, etc.). */
  onClose: () => void;
}

export function SlingTypeSheet({
  options,
  values: initialValues,
  otherOptionValue,
  otherValue: initialOther = '',
  onChange,
  onClose,
}: SlingTypeSheetProps) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [selected, setSelected] = useState<string[]>(initialValues);
  const [otherText, setOtherText] = useState(initialOther);

  const otherActive = !!otherOptionValue && selected.includes(otherOptionValue);

  const toggle = (opt: string) => {
    haptic.light();
    setSelected(prev =>
      prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt],
    );
  };

  const done = () => {
    onChange(selected, otherText);
    onClose();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ტ-პი / სახ.</Text>
        <Pressable onPress={onClose} hitSlop={12} {...a11y('დახურვა', undefined, 'button')}>
          <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {options.map(opt => {
          const active = selected.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => toggle(opt)}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.6 },
              ]}
              {...a11y(opt, active ? 'არჩეულია' : 'არ არის არჩეული', 'checkbox')}
            >
              <Text style={styles.rowLabel}>{opt}</Text>
              <Ionicons
                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={active ? theme.colors.accent : theme.colors.borderStrong}
              />
            </Pressable>
          );
        })}

        {otherActive && otherOptionValue ? (
          <View style={styles.otherWrap}>
            <FloatingLabelInput
              label={`${otherOptionValue} — კონკრეტული სახელი`}
              value={otherText}
              onChangeText={setOtherText}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="დასრულება" onPress={done} size="lg" />
      </View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    list: {
      maxHeight: 380,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    rowLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.ink,
    },
    otherWrap: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      paddingBottom: 24,
    },
  });
}
