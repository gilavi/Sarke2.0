import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field, Input } from './ui';
import { theme } from '../lib/theme';
import { isGeorgianPhone, normalizePhone } from '../lib/validators';
import { SIGNER_ROLE_LABEL, type SignerRole } from '../types/models';

const ROSTER_ROLES: SignerRole[] = ['xaracho_supervisor', 'xaracho_assembler'];

export interface AddRemoteSignerResult {
  signerName: string;
  /** E.164 normalized phone, e.g. +9955XXXXXXXXX. */
  signerPhone: string;
  signerRole: SignerRole;
}

export function AddRemoteSignerModal({
  visible,
  onCancel,
  onSubmit,
  busy,
}: {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (result: AddRemoteSignerResult) => void;
  busy?: boolean;
}) {
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>გარე ხელისმოწერის მოთხოვნა</Text>
            <Pressable
              onPress={handleCancel}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="დახურვა"
            >
              <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
            </Pressable>
          </View>
          <Text style={styles.body}>
            ხელის მოწერის ლინკი გაიგზავნება SMS-ით. ლინკი 14 დღეში იწურება.
          </Text>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          >
            <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
              <Field label="როლი" required>
                <View style={{ gap: 8 }}>
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
                      <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                        {SIGNER_ROLE_LABEL[r]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Field>

              <Field label="სახელი გვარი" required error={nameError}>
                <Input
                  value={name}
                  onChangeText={setName}
                  onBlur={() => setNameTouched(true)}
                  placeholder="გიორგი ხელაძე"
                  error={nameError}
                  autoFocus
                />
              </Field>

              <Field label="ტელეფონი" required error={phoneError}>
                <Input
                  value={phone}
                  onChangeText={setPhone}
                  onBlur={() => setPhoneTouched(true)}
                  keyboardType="phone-pad"
                  placeholder="+995 5XX XXX XXX"
                  error={phoneError}
                />
              </Field>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Button
                  title="გაუქმება"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={handleCancel}
                  disabled={busy}
                />
                <Button
                  title="გაგზავნე SMS"
                  style={{ flex: 1.6 }}
                  onPress={handleSubmit}
                  loading={busy}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 16,
    paddingTop: 10,
    paddingBottom: 44,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: theme.colors.ink, flex: 1 },
  body: { fontSize: 13, color: theme.colors.inkSoft, lineHeight: 18 },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.hairline,
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
    borderColor: theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  radioOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
});
