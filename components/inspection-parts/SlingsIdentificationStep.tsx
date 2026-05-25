// Step 1 of the slings / chains / lifting-accessories inspection.
//
// Five sections: type selector (opens SlingTypeSheet), იდენტიფიკაცია,
// მახასიათებლები, მარ-ბა, მომდევნო შემოწმება.
//
// Abbreviations in field labels and the equipment-type catalog are
// preserved verbatim per the route's AGENTS.md — they come from the
// paper form and must not be expanded. See
// `app/inspections/lifting-accessories/AGENTS.md`.

import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { DateTimeField } from '../DateTimeField';
import { SlingTypeSheet } from './SlingTypeSheet';
import { useBottomSheet } from '../BottomSheet';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';
import {
  LA_EQUIPMENT_TYPES,
  LA_OTHER_EQUIPMENT_VALUE,
  LA_MARKING_OPTIONS,
} from '../../types/liftingAccessories';

export interface SlingsIdentificationStepProps {
  equipmentTypes: string[];
  equipmentTypeOther: string;
  serialNumber: string;
  manufacturer: string;
  yearOfManufacture: string;
  wllKg: string;
  unitCount: string;
  markingStatus: string | null;
  nextInspectionDate: string | null;
  onUpdate: (patch: Partial<{
    equipmentTypes: string[];
    equipmentTypeOther: string;
    serialNumber: string;
    manufacturer: string;
    yearOfManufacture: string;
    wllKg: string;
    unitCount: string;
    markingStatus: string;
    nextInspectionDate: string;
  }>) => void;
}

function summarizeTypes(selected: string[], other: string): string {
  if (selected.length === 0) return 'აირჩიეთ ტიპი';
  return selected
    .map(s => (s === LA_OTHER_EQUIPMENT_VALUE && other.trim() ? other.trim() : s))
    .join(', ');
}

export function SlingsIdentificationStep({
  equipmentTypes,
  equipmentTypeOther,
  serialNumber,
  manufacturer,
  yearOfManufacture,
  wllKg,
  unitCount,
  markingStatus,
  nextInspectionDate,
  onUpdate,
}: SlingsIdentificationStepProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const showSheet = useBottomSheet();

  const openTypeSheet = () => {
    haptic.light();
    showSheet({
      content: ({ dismiss }) => (
        <SlingTypeSheet
          options={LA_EQUIPMENT_TYPES as unknown as string[]}
          values={equipmentTypes}
          otherOptionValue={LA_OTHER_EQUIPMENT_VALUE}
          otherValue={equipmentTypeOther}
          onClose={dismiss}
          onChange={(vals, other) =>
            onUpdate({ equipmentTypes: vals, equipmentTypeOther: other })
          }
        />
      ),
    });
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={120}
    >
      {/* Section: Type / Name */}
      <Text style={styles.sectionHeader}>ტ-პი / სახ.</Text>
      <Pressable
        onPress={openTypeSheet}
        style={styles.typeRow}
        {...a11y('ტ-პი / სახ.', 'ტიპის არჩევა', 'button')}
      >
        <Text
          style={[
            styles.typeValue,
            equipmentTypes.length === 0 && styles.typePlaceholder,
          ]}
          numberOfLines={2}
        >
          {summarizeTypes(equipmentTypes, equipmentTypeOther)}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
      </Pressable>

      {/* Section: Identification */}
      <Text style={[styles.sectionHeader, styles.sectionSpacing]}>იდენტიფიკაცია</Text>
      <View style={styles.row2col}>
        <View style={styles.col}>
          <FloatingLabelInput
            label="სერ. NN / ID"
            value={serialNumber}
            onChangeText={v => onUpdate({ serialNumber: v })}
          />
        </View>
        <View style={styles.col}>
          <FloatingLabelInput
            label="მწარმოებელი"
            value={manufacturer}
            onChangeText={v => onUpdate({ manufacturer: v })}
          />
        </View>
      </View>

      {/* Section: Characteristics */}
      <Text style={[styles.sectionHeader, styles.sectionSpacing]}>მახასიათებლები</Text>
      <View style={styles.row2col}>
        <View style={styles.col}>
          <FloatingLabelInput
            label="წ. წარმ."
            value={yearOfManufacture}
            onChangeText={v => onUpdate({ yearOfManufacture: v })}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.col}>
          <FloatingLabelInput
            label="WLL (კგ)"
            value={wllKg}
            onChangeText={v => onUpdate({ wllKg: v })}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      <View style={{ marginTop: 12 }}>
        <FloatingLabelInput
          label="ერთ. რ-ბა"
          value={unitCount}
          onChangeText={v => onUpdate({ unitCount: v })}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Section: Marking */}
      <Text style={[styles.sectionHeader, styles.sectionSpacing]}>მარ-ბა</Text>
      <View style={styles.chipsRow}>
        {(LA_MARKING_OPTIONS as unknown as string[]).map((opt, i) => {
          const active = markingStatus === opt;
          const isProb = active && i === 2;
          const isWarn = active && i === 1;
          return (
            <Pressable
              key={opt}
              onPress={() => {
                haptic.light();
                onUpdate({ markingStatus: opt });
              }}
              style={[
                styles.chip,
                active && styles.chipActive,
                isProb && styles.chipProblematic,
                isWarn && styles.chipWarning,
              ]}
              {...a11y(opt, undefined, 'radio')}
            >
              <Text
                style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                  isProb && styles.chipTextProblematic,
                  isWarn && styles.chipTextWarning,
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Section: Next inspection */}
      <Text style={[styles.sectionHeader, styles.sectionSpacing]}>მომდევნო შემოწმება</Text>
      <DateTimeField
        value={nextInspectionDate ? new Date(nextInspectionDate) : new Date()}
        onChange={d => onUpdate({ nextInspectionDate: d.toISOString().slice(0, 10) })}
        mode="date"
      />
    </KeyboardAwareScrollView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    body: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 24,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    sectionSpacing: { marginTop: 24 },
    typeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    typeValue: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.ink,
    },
    typePlaceholder: {
      color: theme.colors.inkFaint,
      fontWeight: '400',
    },
    row2col: { flexDirection: 'row', gap: 10 },
    col:     { flex: 1 },
    chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    chipActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    chipProblematic: {
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
    },
    chipWarning: {
      borderColor: theme.colors.warn,
      backgroundColor: theme.colors.warnSoft,
    },
    chipText:            { fontSize: 13, color: theme.colors.inkSoft },
    chipTextActive:      { color: theme.colors.accent, fontWeight: '700' },
    chipTextProblematic: { color: theme.colors.danger, fontWeight: '700' },
    chipTextWarning:     { color: theme.colors.warn,   fontWeight: '700' },
  });
}
