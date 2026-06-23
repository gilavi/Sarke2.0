// Step 2 of the slings / chains / lifting-accessories inspection.
//
// Two sections: მახასიათებლები (year of manufacture, WLL, unit count) and
// მარკირება — the latter a full-width form selector (CustomDropdown) rather
// than the old inline chip group. Split out of SlingsIdentificationStep so
// neither identification screen is overcrowded.
//
// Labels use full words, not paper-form abbreviations, per product direction.
// See `app/inspections/lifting-accessories/AGENTS.md`.

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { CustomDropdown } from '../ui/CustomDropdown';
import { useTheme, type Theme } from '../../lib/theme';
import { LA_MARKING_OPTIONS } from '../../types/liftingAccessories';

export interface SlingsCharacteristicsStepProps {
  yearOfManufacture: string;
  wllKg: string;
  unitCount: string;
  markingStatus: string | null;
  onUpdate: (patch: Partial<{
    yearOfManufacture: string;
    wllKg: string;
    unitCount: string;
    markingStatus: string;
  }>) => void;
}

const MARKING_DROPDOWN_OPTIONS = (LA_MARKING_OPTIONS as unknown as string[]).map(
  o => ({ label: o, value: o }),
);

export function SlingsCharacteristicsStep({
  yearOfManufacture,
  wllKg,
  unitCount,
  markingStatus,
  onUpdate,
}: SlingsCharacteristicsStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={120}
    >
      {/* Section: Characteristics */}
      <Text style={styles.sectionHeader}>{t('slingsId.characteristicsSection')}</Text>
      <View style={styles.fieldStack}>
        <FloatingLabelInput
          label={t('slingsId.yearMadeLabel')}
          value={yearOfManufacture}
          onChangeText={v => onUpdate({ yearOfManufacture: v })}
          keyboardType="decimal-pad"
        />
        <FloatingLabelInput
          label={t('slingsId.wllLabel')}
          value={wllKg}
          onChangeText={v => onUpdate({ wllKg: v })}
          keyboardType="decimal-pad"
        />
        <FloatingLabelInput
          label={t('slingsId.unitSafetyLabel')}
          value={unitCount}
          onChangeText={v => onUpdate({ unitCount: v })}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Section: Marking */}
      <View style={styles.sectionSpacing}>
        <CustomDropdown
          label={t('slingsId.markingSection')}
          placeholder={t('slingsId.markingPlaceholder')}
          options={MARKING_DROPDOWN_OPTIONS}
          value={markingStatus}
          onChange={v => onUpdate({ markingStatus: String(v) })}
        />
      </View>
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
    fieldStack: { gap: 12 },
  });
}
