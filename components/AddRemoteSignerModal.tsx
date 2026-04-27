import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText } from './primitives/A11yText';
import { FormField } from './FormField';
import { ButtonGroup } from './ButtonGroup';
import { Input } from './ui';
import { theme } from '../lib/theme';
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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<SignerRole>('xaracho_supervisor');
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const nameError = nameTouched && !name.trim() ? 'სავალდებულო ველი' : undefined;
  const phoneError =
    phoneTouched && phone.trim() && !isGeorgianPhone(phone)
      ? 'ფორმატი: +995 5XX XXX XXX ან 32X XXX XXX'
      : phoneTouched && !phone.trim()
        ? 'სავალდებულო ველი'
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
    setNameTouched(true);
    setPhoneTouched(true);
    if (!name.trim()) return;
    if (!phone.trim() || !isGeorgianPhone(phone)) return;
    const normalized = normalizePhone(phone);
    if (!normalized) return;
    onSubmit({ signerName: name.trim(), signerPhone: normalized, signerRole: role });
    reset();
  };

  return (
    <View style={styles.container}>
      <A11yText size="xl" weight="bold" style={styles.title}>
        გარე ხელისმოწერის მოთხოვნა
      </A11yText>

      <A11yText size="sm" color={theme.colors.inkSoft} style={styles.description}>
        ხელის მოწერის ლინკი გაიგზავნება SMS-ით. ლინკი 14 დღეში იწურება.
      </A11yText>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <FormField label="როლი" required>
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
                      <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                    ) : null}
                  </View>
                  <A11yText size="base" weight="medium" color={theme.colors.ink}>
                    {SIGNER_ROLE_LABEL[r]}
                  </A11yText>
                </Pressable>
              ))}
            </View>
          </FormField>

          <FormField label="სახელი გვარი" required error={nameError}>
            <Input
              value={name}
              onChangeText={setName}
              onBlur={() => setNameTouched(true)}
              placeholder="გიორგი ხელაძე"
              error={nameError}
              autoFocus
            />
          </FormField>

          <FormField label="ტელეფონი" required error={phoneError}>
            <Input
              value={phone}
              onChangeText={setPhone}
              onBlur={() => setPhoneTouched(true)}
              keyboardType="phone-pad"
              placeholder="+995 5XX XXX XXX"
              error={phoneError}
            />
          </FormField>

          <ButtonGroup
            buttons={[
              {
                label: 'გაუქმება',
                variant: 'secondary',
                size: 'lg',
                onPress: handleCancel,
                disabled: busy,
              },
              {
                label: 'გაგზავნე SMS',
                variant: 'primary',
                size: 'lg',
                onPress: handleSubmit,
                loading: busy,
              },
            ]}
            layout="vertical"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(4),
    gap: theme.space(4),
  },
  title: {
    marginBottom: theme.space(1),
  },
  description: {
    marginBottom: theme.space(2),
    lineHeight: 18,
  },
  scrollContent: {
    gap: theme.space(4),
    paddingBottom: theme.space(4),
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
