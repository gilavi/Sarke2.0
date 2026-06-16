// Three-option verdict selector used on the conclusion step.
// Verdict values map to comment #11 from ClickUp "ფასადის ხარაჩოს შემოწმების აქტი":
//   safe    → green  (უსაფრთხოა)
//   caution → yellow (დასაშვებია, საჭიროებს დაკვირვებას)
//   unsafe  → red    (დაუშვებელია გამოყენება)

import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';
import { getstyles, staticStyles } from './styles';

export type SafetyVerdict = 'safe' | 'caution' | 'unsafe';

export const VerdictSelector = memo(function VerdictSelector({
  value,
  onChange,
  onInteract,
  showError,
}: {
  value: SafetyVerdict | null;
  onChange: (v: SafetyVerdict) => void;
  onInteract: () => void;
  showError: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const press = (v: SafetyVerdict) => {
    haptic.light();
    onInteract();
    onChange(v);
  };

  return (
    <View style={staticStyles.gap10}>
      <Text style={styles.decisionHeader}>გადაწყვეტილება</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Safe */}
        <Pressable
          onPress={() => press('safe')}
          style={[
            styles.decisionButton,
            value === 'safe'
              ? { backgroundColor: theme.colors.subtleSurface, borderColor: theme.colors.ink }
              : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          {...a11y('უსაფრთხოა', 'შეეხეთ თუ ობიექტი უსაფრთხოა', 'button', { selected: value === 'safe' })}
        >
          <Ionicons name="shield-checkmark" size={24} color={value === 'safe' ? theme.colors.ink : theme.colors.inkFaint} />
          <Text style={[styles.decisionLabel, { color: value === 'safe' ? theme.colors.ink : theme.colors.inkSoft, fontSize: 12 }]}>
            უსაფრთხოა
          </Text>
        </Pressable>

        {/* Caution */}
        <Pressable
          onPress={() => press('caution')}
          style={[
            styles.decisionButton,
            value === 'caution'
              ? { backgroundColor: theme.colors.subtleSurface, borderColor: theme.colors.ink }
              : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          {...a11y('დასაშვებია, საჭიროებს დაკვირვებას', 'შეეხეთ თუ გამოყენება დასაშვებია დაკვირვებით', 'button', { selected: value === 'caution' })}
        >
          <Ionicons name="eye-outline" size={24} color={value === 'caution' ? theme.colors.ink : theme.colors.inkFaint} />
          <Text style={[styles.decisionLabel, { color: value === 'caution' ? theme.colors.ink : theme.colors.inkSoft, fontSize: 12 }]}>
            {'დასაშვებია,\nდასაჭიროებს'}
          </Text>
        </Pressable>

        {/* Unsafe */}
        <Pressable
          onPress={() => press('unsafe')}
          style={[
            styles.decisionButton,
            value === 'unsafe'
              ? { backgroundColor: theme.colors.subtleSurface, borderColor: theme.colors.ink }
              : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          {...a11y('დაუშვებელია გამოყენება', 'შეეხეთ თუ ობიექტის გამოყენება დაუშვებელია', 'button', { selected: value === 'unsafe' })}
        >
          <Ionicons name="warning" size={24} color={value === 'unsafe' ? theme.colors.ink : theme.colors.inkFaint} />
          <Text style={[styles.decisionLabel, { color: value === 'unsafe' ? theme.colors.ink : theme.colors.inkSoft, fontSize: 12 }]}>
            {'დაუშვებელია\nგამოყენება'}
          </Text>
        </Pressable>
      </View>
      {showError ? (
        <Text style={styles.fieldError}>აუცილებლად აირჩიეთ სტატუსი.</Text>
      ) : null}
    </View>
  );
});
