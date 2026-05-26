// features/inspection-wizard/SignaturesEntryRow.tsx
//
// The tappable row shown inside ConclusionStep that summarizes the current
// signatures state and opens the SignaturesScreen. Extracted to keep
// ConclusionStep under the 200-line component budget.

import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

interface Props {
  statusText: string;
  onPress: () => void;
}

export function SignaturesEntryRow({ statusText, onPress }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      {...a11y('ხელმოწერების მართვა', statusText, 'button')}
    >
      <View style={styles.iconBox}>
        <Ionicons name="create-outline" size={20} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>ხელმოწერები</Text>
        <Text style={styles.status} numberOfLines={1}>{statusText}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.surface,
    },
    pressed: { opacity: 0.7 },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accentSoft,
    },
    title: { fontSize: 15, fontWeight: '700', color: theme.colors.ink },
    status: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
  });
}
