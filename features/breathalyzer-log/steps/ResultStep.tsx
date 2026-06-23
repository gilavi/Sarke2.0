import { useMemo } from 'react';
import { TextInput, View } from 'react-native';
import { Ban } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useTheme } from '../../../lib/theme';
import { resultStatusFromValue } from '../../../types/breathalyzerLog';
import { getStyles } from '../styles';
import { parseResult, type EntryForm } from '../breathalyzerSchema';
import { ResultStatus } from '../ResultStatus';

interface Props {
  form: EntryForm;
  update: (patch: Partial<EntryForm>) => void;
}

/** Step 3: type the reading; status (monochrome) + fail note derive from it. */
export function ResultStep({ form, update }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const value = parseResult(form.resultRaw);
  const status = resultStatusFromValue(value);

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.resultInputWrap}>
        <TextInput
          style={styles.resultInput}
          value={form.resultRaw}
          onChangeText={v => update({ resultRaw: v })}
          keyboardType="decimal-pad"
          autoFocus
          selectTextOnFocus
          maxLength={5}
          placeholderTextColor={theme.colors.inkFaint}
        />
      </View>

      <View style={{ alignItems: 'center' }}>
        <ResultStatus status={status} showLabel size={22} />
      </View>

      {status === 'fail' ? (
        <View style={styles.noteCard}>
          <Ban size={20} color={theme.colors.ink} strokeWidth={1.5} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noteTitle}>{t('breathalyzer.personDenied')}</Text>
            <Text style={styles.noteSub}>{t('breathalyzer.repeatTest')}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
