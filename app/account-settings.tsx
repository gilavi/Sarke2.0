import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardSafeArea } from '../components/layout/KeyboardSafeArea';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { useTheme } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { friendlyError } from '../lib/errorMap';
import { Button, A11yText } from '../components/ui';
import { FloatingLabelInput } from '../components/inputs/FloatingLabelInput';
import { useTranslation } from 'react-i18next';

const MIN_PASSWORD_LENGTH = 8;

export default function AccountSettingsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const { state } = useSession();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = t('account.currentPasswordRequired');
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      newErrors.newPassword = t('account.passwordMinLengthError', { min: MIN_PASSWORD_LENGTH });
    }

    if (newPassword === currentPassword) {
      newErrors.newPassword = t('account.passwordMustDiffer');
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('account.passwordsMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setBusy(true);
    try {
      if (state.status !== 'signedIn') {
        throw new Error('Not authenticated');
      }

      const email = state.session.user.email;
      if (!email) throw new Error('Email not found');

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        setErrors({ currentPassword: t('account.currentPasswordWrong') });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success(t('account.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <A11yText size="lg" weight="bold" color={theme.colors.ink}>
          {t('account.changePassword')}
        </A11yText>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={theme.colors.ink} />
        </Pressable>
      </View>

      <KeyboardSafeArea
        headerOffset={56}
        contentStyle={styles.content}
        footer={
          <View style={styles.footer}>
            {busy ? (
              <View
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: theme.colors.accent,
                    borderRadius: theme.radius.md,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                <ActivityIndicator color={theme.colors.surface} />
              </View>
            ) : (
              <Button
                title={t('account.changePassword')}
                onPress={handleSubmit}
                disabled={busy}
                size="lg"
                style={styles.submitButton}
              />
            )}
          </View>
        }
      >
        <FloatingLabelInput
          label={t('account.currentPassword')}
          secureTextEntry={!showCurrent}
          editable={!busy}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          error={errors.currentPassword}
          rightIcon={showCurrent ? 'eye-off' : 'eye'}
          onRightIconPress={() => setShowCurrent(!showCurrent)}
        />
        <FloatingLabelInput
          label={t('account.newPassword')}
          secureTextEntry={!showNew}
          editable={!busy}
          value={newPassword}
          onChangeText={setNewPassword}
          error={errors.newPassword}
          helper={
            newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH
              ? t('account.passwordCharCount', { n: newPassword.length, min: MIN_PASSWORD_LENGTH })
              : undefined
          }
          rightIcon={showNew ? 'eye-off' : 'eye'}
          onRightIconPress={() => setShowNew(!showNew)}
        />
        <FloatingLabelInput
          label={t('account.confirmNewPassword')}
          secureTextEntry={!showConfirm}
          editable={!busy}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={errors.confirmPassword}
          rightIcon={showConfirm ? 'eye-off' : 'eye'}
          onRightIconPress={() => setShowConfirm(!showConfirm)}
        />
      </KeyboardSafeArea>
    </SafeAreaView>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.space(4),
      paddingVertical: theme.space(4),
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    content: {
      paddingHorizontal: theme.space(4),
      paddingVertical: theme.space(4),
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.space(2),
    },
    submitButton: {
      minHeight: 56,
    },
  });
}
