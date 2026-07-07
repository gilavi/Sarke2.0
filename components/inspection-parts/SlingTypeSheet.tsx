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
// override - see the AGENTS.md for that route.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { Button } from '../ui';
import { Selector } from '../ui/Selector';
import { useTheme, type Theme } from '../../lib/theme';
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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [selected, setSelected] = useState<string[]>(initialValues);
  const [otherText, setOtherText] = useState(initialOther);

  const otherActive = !!otherOptionValue && selected.includes(otherOptionValue);

  const done = () => {
    onChange(selected, otherText);
    onClose();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('inspections.slingTypeSheetTitle')}</Text>
        <Pressable onPress={onClose} hitSlop={12} {...a11y(t('common.close'), undefined, 'button')}>
          <X size={22} color={theme.colors.inkSoft} strokeWidth={1.5} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Selector
          mode="multi"
          presentation="list"
          options={options.map((o) => ({ value: o, label: o }))}
          values={selected}
          onValuesChange={setSelected}
        />

        {otherActive && otherOptionValue ? (
          <View style={styles.otherWrap}>
            <FloatingLabelInput
              label={`${otherOptionValue} - ${t('inspections.otherSpecificName')}`}
              value={otherText}
              onChangeText={setOtherText}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button title={t('common.done')} onPress={done} size="lg" />
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
