// Step 1 of the slings / chains / lifting-accessories inspection.
//
// Two sections: the equipment-type selector (opens SlingTypeSheet) and
// იდენტიფიკაცია (serial number, manufacturer). Characteristics + marking now
// live on SlingsCharacteristicsStep (step 2) so neither screen is overcrowded.
//
// Field labels use full words, not paper-form abbreviations, per product
// direction (the user found the abbreviations unreadable). See
// `app/inspections/lifting-accessories/AGENTS.md`.

import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { SlingTypeSheet } from './SlingTypeSheet';
import { useBottomSheet } from '../BottomSheet';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';
import {
  LA_EQUIPMENT_TYPES,
  LA_OTHER_EQUIPMENT_VALUE,
} from '../../types/liftingAccessories';

export interface SlingsIdentificationStepProps {
  equipmentTypes: string[];
  equipmentTypeOther: string;
  serialNumber: string;
  manufacturer: string;
  onUpdate: (patch: Partial<{
    equipmentTypes: string[];
    equipmentTypeOther: string;
    serialNumber: string;
    manufacturer: string;
  }>) => void;
}

function summarizeTypes(selected: string[], other: string, typeRequiredLabel: string): string {
  if (selected.length === 0) return typeRequiredLabel;
  return selected
    .map(s => (s === LA_OTHER_EQUIPMENT_VALUE && other.trim() ? other.trim() : s))
    .join(', ');
}

export function SlingsIdentificationStep({
  equipmentTypes,
  equipmentTypeOther,
  serialNumber,
  manufacturer,
  onUpdate,
}: SlingsIdentificationStepProps) {
  const { t } = useTranslation();
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
      {/* Section: Type / Kind */}
      <Text style={styles.sectionHeader}>{t('slingsId.typeSectionHeader')}</Text>
      <Pressable
        onPress={openTypeSheet}
        style={styles.typeRow}
        {...a11y(t('slingsId.typeSectionHeader'), t('slingsId.typeRequired'), 'button')}
      >
        <Text
          style={[
            styles.typeValue,
            equipmentTypes.length === 0 && styles.typePlaceholder,
          ]}
          numberOfLines={2}
        >
          {summarizeTypes(equipmentTypes, equipmentTypeOther, t('slingsId.typeRequired'))}
        </Text>
        <ChevronRight size={18} color={theme.colors.inkFaint} strokeWidth={1.5} />
      </Pressable>

      {/* Section: Identification */}
      <Text style={[styles.sectionHeader, styles.sectionSpacing]}>
        {t('slingsId.identificationSection')}
      </Text>
      <View style={styles.fieldStack}>
        <FloatingLabelInput
          label={t('slingsId.serialIdLabel')}
          value={serialNumber}
          onChangeText={v => onUpdate({ serialNumber: v })}
        />
        <FloatingLabelInput
          label={t('slingsId.manufacturerLabel')}
          value={manufacturer}
          onChangeText={v => onUpdate({ manufacturer: v })}
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
    fieldStack: { gap: 12 },
  });
}
