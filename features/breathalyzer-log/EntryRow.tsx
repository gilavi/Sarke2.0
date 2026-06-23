import { useMemo } from 'react';
import { View } from 'react-native';
import { Circle, CircleCheck, CircleX, CornerDownRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme } from '../../lib/theme';
import type { BLEntry } from '../../types/breathalyzerLog';
import { getStyles } from './styles';
import { timeDisplay } from './breathalyzerSchema';
import { ResultStatus } from './ResultStatus';

/** One logged test in the entry list. Monochrome result + signature indicator. */
export function EntryRow({ entry, index }: { entry: BLEntry; index: number }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const isRepeat = entry.testType === 'repeat';

  return (
    <View style={[styles.entryRow, isRepeat && styles.entryRepeatIndent]}>
      <Text style={styles.entryIndex}>{index + 1}</Text>

      <View style={{ flex: 1 }}>
        {isRepeat ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CornerDownRight size={12} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={styles.entryRepeatTag}>{t('breathalyzer.repeatTestType')}</Text>
          </View>
        ) : null}
        <Text style={styles.entryName}>{entry.personName}</Text>
        <Text style={styles.entryPos}>
          {entry.position} · {timeDisplay(entry.time)}
        </Text>
      </View>

      <ResultStatus status={entry.resultStatus} value={entry.result} />

      {entry.refusedSignature ? (
        <CircleX size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
      ) : entry.signature ? (
        <CircleCheck size={18} color={theme.colors.ink} strokeWidth={1.5} />
      ) : (
        <Circle size={18} color={theme.colors.inkFaint} strokeWidth={1.5} />
      )}
    </View>
  );
}
