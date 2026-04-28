import { useState , useMemo} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CrewMemberForm } from './CrewSection';
import { useTheme } from '../lib/theme';

import { haptic } from '../lib/haptics';
import { a11y } from '../lib/accessibility';
import type { CrewMember } from '../types/models';

interface Props {
  onAddCrew: (member: CrewMember) => void;
  onAddSigner?: () => void;
  onCancel: () => void;
}

/**
 * Single bottom-sheet content for the project "+" add action.
 * Shows a choice between participant and signer; selecting "მონაწილე"
 * transitions inline to the crew form without opening a second sheet.
 */
export function AddParticipantSheet({ onAddCrew, onAddSigner, onCancel }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <CrewMemberForm
        onSave={member => {
          onAddCrew(member);
          onCancel();
        }}
        onCancel={onCancel}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>დამატება</Text>

      <Pressable
        onPress={() => { haptic.light(); setShowForm(true); }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        {...a11y('მონაწილე', 'პროექტის მონაწილის დამატება', 'button')}
      >
        <View style={styles.icon}>
          <Ionicons name="person" size={18} color={theme.colors.accent} />
        </View>
        <Text style={styles.label}>მონაწილე</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
      </Pressable>

      <Pressable
        onPress={() => { haptic.light(); onAddSigner?.(); }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        {...a11y('ხელმომწერა', 'ხელმომწერის დამატება', 'button')}
      >
        <View style={styles.icon}>
          <Ionicons name="pencil" size={18} color={theme.colors.accent} />
        </View>
        <Text style={styles.label}>ხელმომწერა</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
      </Pressable>

      <Pressable
        onPress={() => { haptic.light(); onCancel(); }}
        style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
        {...a11y('გაუქმება', 'მოქმედების გაუქმება', 'button')}
      >
        <Text style={styles.cancelText}>გაუქმება</Text>
      </Pressable>
    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowPressed: {
    backgroundColor: '#F9FAFB',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  cancelBtn: {
    marginTop: 2,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accent,
  },
});
}
