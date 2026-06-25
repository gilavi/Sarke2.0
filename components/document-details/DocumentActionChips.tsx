// DocumentActionChips — the visible Edit · Duplicate · Delete chip row under
// the header (NOT a hidden "•••" menu, per the design). Delete uses the danger
// style; the caller confirms before destroying. There is no DS "action chip"
// primitive (ActionSheetItem is for sheets, FilterChipRow is single-select
// filters), so this small outlined-pill chip lives with the screen that needs
// it. All colors come from theme tokens.
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, Pencil, Trash2, type LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

interface ChipProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function Chip({ icon: Icon, label, onPress, danger, disabled }: ChipProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const color = danger ? theme.colors.danger : theme.colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        danger && styles.chipDanger,
        pressed && styles.chipPressed,
        disabled && styles.chipDisabled,
      ]}
      {...a11y(label, undefined, 'button')}
    >
      <Icon size={16} color={color} strokeWidth={1.8} />
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </Pressable>
  );
}

interface Props {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  editing?: boolean;
  duplicating?: boolean;
}

export function DocumentActionChips({ onEdit, onDuplicate, onDelete, editing, duplicating }: Props) {
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={staticStyles.row}
    >
      <Chip icon={Pencil} label={t('details.actions.edit')} onPress={onEdit} disabled={editing} />
      <Chip
        icon={Copy}
        label={t('details.actions.duplicate')}
        onPress={onDuplicate}
        disabled={duplicating}
      />
      <Chip icon={Trash2} label={t('details.actions.delete')} onPress={onDelete} danger />
    </ScrollView>
  );
}

const staticStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
});

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 15,
      paddingVertical: 9,
    },
    chipDanger: { borderColor: theme.colors.dangerBorder },
    chipPressed: { backgroundColor: theme.colors.surfaceSecondary },
    chipDisabled: { opacity: 0.5 },
    chipText: { fontSize: 14, fontWeight: '600' },
  });
}
