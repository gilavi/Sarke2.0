import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { CircleCheck, Pencil, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useTheme } from '../../../lib/theme';
import { a11y } from '../../../lib/accessibility';
import { haptic } from '../../../lib/haptics';
import { getStyles } from '../styles';
import type { EntryForm } from '../breathalyzerSchema';

interface Props {
  form: EntryForm;
  update: (patch: Partial<EntryForm>) => void;
  attempted: boolean;
  onOpenSignature: () => void;
}

/** Step 4: capture the tested person's signature, or record a refusal. */
export function SignatureStep({ form, update, attempted, onOpenSignature }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const toggleRefuse = () => {
    const next = !form.refusedSignature;
    next ? haptic.toggleOn() : haptic.toggleOff();
    update({ refusedSignature: next, signature: next ? null : form.signature });
  };

  return (
    <View style={{ gap: 16 }}>
      <Text style={styles.sigPrompt}>{t('breathalyzer.sigPrompt', { name: form.name })}</Text>

      <Pressable
        onPress={onOpenSignature}
        style={[styles.sigPlaceholder, form.signature ? styles.sigPlaceholderDone : null]}
        {...a11y(t('breathalyzer.stepSignature'), t('a11y.saveSignatureHint'), 'button')}
      >
        {form.signature ? (
          <View style={styles.sigDone}>
            <CircleCheck size={28} color={theme.colors.ink} strokeWidth={1.5} />
            <Text style={styles.sigDoneText}>{t('breathalyzer.sigSaved')}</Text>
          </View>
        ) : (
          <View style={styles.sigDone}>
            <Pencil size={28} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={styles.sigHintText}>{t('breathalyzer.tapToSign')}</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={toggleRefuse}
        style={styles.refuseRow}
        {...a11y(t('breathalyzer.refuseSignature'), undefined, 'checkbox', {
          checked: form.refusedSignature,
        })}
      >
        <View style={[styles.checkbox, form.refusedSignature ? styles.checkboxOn : null]}>
          {form.refusedSignature ? (
            <X size={14} color={theme.colors.inverse.ink} strokeWidth={1.5} />
          ) : null}
        </View>
        <Text style={styles.refuseText}>{t('breathalyzer.refuseSignature')}</Text>
      </Pressable>

      {attempted && !form.signature && !form.refusedSignature ? (
        <Text style={styles.inlineError}>{t('breathalyzer.sigOrRefuseRequired')}</Text>
      ) : null}
    </View>
  );
}
