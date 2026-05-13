import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { CPCargoRow } from '../../types/cargoPlatform';

interface Props {
  index: number;
  row: CPCargoRow;
  canDelete: boolean;
  onChange: (patch: Partial<CPCargoRow>) => void;
  onDelete: () => void;
}

export const CargoRow = memo(function CargoRow({ index, row, canDelete, onChange, onDelete }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [nameDraft, setNameDraft] = useState(row.name);
  const [weightDraft, setWeightDraft] = useState(
    row.total_weight_kg != null ? String(row.total_weight_kg) : '',
  );

  const parseWeight = (text: string): number | null => {
    const n = parseFloat(text.replace(',', '.'));
    return isNaN(n) ? null : n;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.numBadge}>
          <Text style={styles.numText}>{index + 1}</Text>
        </View>
        {canDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            style={styles.deleteBtn}
            {...a11y('სტრიქონის წაშლა', undefined, 'button')}
          >
            <Ionicons name="close" size={16} color={theme.colors.danger} />
          </Pressable>
        )}
      </View>

      <FloatingLabelInput
        label="ტვირთის დასახელება"
        value={nameDraft}
        onChangeText={text => {
          setNameDraft(text);
          onChange({ name: text });
        }}
      />

      <FloatingLabelInput
        label="სრული წონა (კგ)"
        value={weightDraft}
        onChangeText={text => {
          setWeightDraft(text);
          onChange({ total_weight_kg: parseWeight(text) });
        }}
        keyboardType="decimal-pad"
      />
    </View>
  );
});

function getstyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    numBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft },
    deleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.colors.dangerTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
