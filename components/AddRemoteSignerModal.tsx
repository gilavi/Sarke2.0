import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText } from './primitives/A11yText';
import { FormField } from './FormField';
import { ButtonGroup } from './ButtonGroup';
import { FloatingLabelInput } from './inputs/FloatingLabelInput';
import { useTheme } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { SheetLayout } from './SheetLayout';
import { BottomSheetScrollView } from './BottomSheet';

import { isGeorgianPhone, normalizePhone } from '../lib/validators';
import { SIGNER_ROLE_LABEL, type SignerRole } from '../types/models';

const ROSTER_ROLES: SignerRole[] = ['xaracho_supervisor', 'xaracho_assembler'];

export interface AddRemoteSignerResult {
  signerName: string;
  signerPhone: string;
  signerRole: SignerRole;
}

interface AddRemoteSignerSheetProps {
  onCancel: () => void;
  onSubmit: (result: AddRemoteSignerResult) => void;
  busy?: boolean;
}

export function AddRemoteSignerSheet({
  onCancel,
  onSubmit,
  busy,
}: AddRemoteSignerSheetProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<SignerRole>('xaracho_supervisor');
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const nameError = nameTouched && !name.trim() ? t('components.requiredField') : undefined;
  const phoneError =
    phoneTouched && phone.trim() && !isGeorgianPhone(phone)
      ? t('components.phoneFormat')
      : phoneTouched && !phone.trim()
        ? t('components.requiredField')
        : undefined;

  const reset = () => {
    setName('');
    setPhone('');
    setRole('xaracho_supervisor');
    setNameTouched(false);
    setPhoneTouched(false);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim() || !isGeorgianPhone(phone)) {
      setNameTouched(true);
      setPhoneTouched(true);
      haptic.validationError();
      return;
    }
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setNameTouched(true);
      setPhoneTouched(true);
      haptic.validationError();
      return;
    }
    onSubmit({ signerName: name.trim(), signerPhone: normalized, signerRole: role });
    reset();
  };

  return (
    <SheetLayout
      showHandle={false}
      ScrollComponent={BottomSheetScrollView}
      footer={
        <ButtonGroup
          buttons={[
            {
              label: t('common.cancel'),
              variant: 'secondary',
              size: 'lg',
              onPress: handleCancel,
              disabled: busy,
            },
            {
              label: t('components.sendSms'),
              variant: 'primary',
              size: 'lg',
              onPress: handleSubmit,
              loading: busy,
            },
          ]}
          layout="vertical"
        />
      }
    >
        <A11yText size="xl" weight="bold" style={styles.title}>
          {t('components.remoteSignatureTitle')}
        </A11yText>

        <A11yText size="sm" color={theme.colors.inkSoft} style={styles.description}>
          {t('components.remoteSignatureDescription')}
        </A11yText>

        <FormField label={t('common.role')} required>
          <View style={styles.roleOptions}>
            {ROSTER_ROLES.map(r => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                accessibilityRole="radio"
                accessibilityState={{ selected: role === r }}
                accessibilityLabel={SIGNER_ROLE_LABEL[r]}
                style={[styles.roleRow, role === r && styles.roleRowSelected]}
              >
                <View style={[styles.radio, role === r && styles.radioOn]}>
                  {role === r ? (
                    <Check size={14} color={theme.colors.white} strokeWidth={1.5} />
                  ) : null}
                </View>
                <A11yText size="base" weight="medium" color={theme.colors.ink}>
                  {SIGNER_ROLE_LABEL[r]}
                </A11yText>
              </Pressable>
            ))}
          </View>
        </FormField>

        <FloatingLabelInput
          label={t('components.fullName')}
          required
          error={nameError}
          value={name}
          onChangeText={setName}
          onBlur={() => setNameTouched(true)}
          autoFocus
        />

        <FloatingLabelInput
          label={t('common.phone')}
          required
          error={phoneError}
          value={phone}
          onChangeText={setPhone}
          onBlur={() => setPhoneTouched(true)}
          keyboardType="phone-pad"
        />
    </SheetLayout>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  title: {
    marginBottom: theme.space(1),
  },
  description: {
    marginBottom: theme.space(2),
    lineHeight: 18,
  },
  roleOptions: {
    gap: theme.space(2),
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(3),
    paddingVertical: theme.space(3),
    paddingHorizontal: theme.space(3),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  roleRowSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOn: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
});
}
