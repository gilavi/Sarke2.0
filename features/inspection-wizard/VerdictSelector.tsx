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
        {/* Safe — green */}
        <Pressable
          onPress={() => press('safe')}
          style={[
            styles.decisionButton,
            value === 'safe'
              ? { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
              : { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentSoft },
          ]}
          {...a11y('უსაფრთხოა', 'შეეხეთ თუ ობიექტი უსაფრთხოა', 'button')}
        >
          <Ionicons name="shield-checkmark" size={24} color={value === 'safe' ? theme.colors.white : theme.colors.accent} />
          <Text style={[styles.decisionLabel, { color: value === 'safe' ? theme.colors.white : theme.colors.accent, fontSize: 12 }]}>
            უსაფრთხოა
          </Text>
        </Pressable>

        {/* Caution — amber/yellow */}
        <Pressable
          onPress={() => press('caution')}
          style={[
            styles.decisionButton,
            value === 'caution'
              ? { backgroundColor: theme.colors.warn, borderColor: theme.colors.warn }
              : { backgroundColor: theme.colors.warnSoft, borderColor: theme.colors.warnSoft },
          ]}
          {...a11y('დასაშვებია, საჭიროებს დაკვირვებას', 'შეეხეთ თუ გამოყენება დასაშვებია დაკვირვებით', 'button')}
        >
          <Ionicons name="eye-outline" size={24} color={value === 'caution' ? theme.colors.white : theme.colors.warn} />
          <Text style={[styles.decisionLabel, { color: value === 'caution' ? theme.colors.white : theme.colors.warn, fontSize: 12 }]}>
            {'დასაშვებია,\nდასაჭიროებს'}
          </Text>
        </Pressable>

        {/* Unsafe — red */}
        <Pressable
          onPress={() => press('unsafe')}
          style={[
            styles.decisionButton,
            value === 'unsafe'
              ? { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger }
              : { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.dangerSoft },
          ]}
          {...a11y('დაუშვებელია გამოყენება', 'შეეხეთ თუ ობიექტის გამოყენება დაუშვებელია', 'button')}
        >
          <Ionicons name="warning" size={24} color={value === 'unsafe' ? theme.colors.white : theme.colors.danger} />
          <Text style={[styles.decisionLabel, { color: value === 'unsafe' ? theme.colors.white : theme.colors.danger, fontSize: 12 }]}>
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
