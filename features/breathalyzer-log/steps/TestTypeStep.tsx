import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { StatusChip } from '../../../components/wizard/StatusChip';
import { useTheme } from '../../../lib/theme';
import { haptic } from '../../../lib/haptics';
import type { EntryForm } from '../breathalyzerSchema';

interface Props {
  form: EntryForm;
  update: (patch: Partial<EntryForm>) => void;
}

/** Step 2: primary vs repeat test — monochrome StatusChip pills. */
export function TestTypeStep({ form, update }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ gap: 16 }}>
      {form.testType === 'repeat' && form.name ? (
        <Text style={{ color: theme.colors.inkSoft, fontSize: 14, fontWeight: '600' }}>
          {t('breathalyzer.repeatTestOf', { name: form.name })}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatusChip
          layout="pill"
          selected={form.testType === 'primary'}
          label={t('breathalyzer.primaryTest')}
          onPress={() => {
            haptic.select();
            update({ testType: 'primary' });
          }}
        />
        <StatusChip
          layout="pill"
          selected={form.testType === 'repeat'}
          label={t('breathalyzer.repeatTestType')}
          onPress={() => {
            haptic.select();
            update({ testType: 'repeat' });
          }}
        />
      </View>
    </View>
  );
}
