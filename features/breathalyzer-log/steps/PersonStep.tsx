import { useMemo } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { useTheme } from '../../../lib/theme';
import { a11y } from '../../../lib/accessibility';
import { haptic } from '../../../lib/haptics';
import type { PoolPerson } from '../../../types/breathalyzerLog';
import { getStyles } from '../styles';
import { daysSince, initials, type EntryForm } from '../breathalyzerSchema';

interface Props {
  form: EntryForm;
  update: (patch: Partial<EntryForm>) => void;
  suggestions: PoolPerson[];
  onSelect: (p: PoolPerson) => void;
  attempted: boolean;
}

/** Step 1: pick / type the tested person. The name field doubles as the search. */
export function PersonStep({ form, update, suggestions, onSelect, attempted }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={{ gap: 16 }}>
      <FloatingLabelInput
        label={t('breathalyzer.nameLabel')}
        required
        autoFocus
        value={form.name}
        onChangeText={v => update({ name: v })}
        error={attempted && !form.name.trim() ? t('errors.requiredField') : undefined}
      />

      {suggestions.length > 0 ? (
        <View style={styles.suggestionList}>
          {suggestions.map((p, i) => (
            <Pressable
              key={`${p.name}-${i}`}
              onPress={() => {
                haptic.select();
                onSelect(p);
                Keyboard.dismiss();
              }}
              style={styles.suggestionRow}
              {...a11y(p.name, p.position, 'button')}
            >
              <View style={styles.suggestionAvatar}>
                <Text style={styles.suggestionInitials}>{initials(p.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionName}>{p.name}</Text>
                <Text style={styles.suggestionPos}>{p.position}</Text>
              </View>
              {p.lastTestedAt ? (
                <Text style={styles.suggestionDate}>{daysSince(p.lastTestedAt, t)}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      <FloatingLabelInput
        label={t('breathalyzer.positionLabel')}
        required
        value={form.position}
        onChangeText={v => update({ position: v })}
        error={attempted && !form.position.trim() ? t('errors.requiredField') : undefined}
      />
    </View>
  );
}
