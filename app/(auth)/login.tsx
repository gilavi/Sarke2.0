import { useState , useMemo} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';
import { useTranslation } from 'react-i18next';
import { saveLanguage } from '../../lib/i18n';

import { a11y } from '../../lib/accessibility';
import { isEmail } from '../../lib/validators';
import { friendlyError, isCancelledError, isEmailTakenError } from '../../lib/errorMap';
import { Button, Card, Field, Input } from '../../components/ui';

const MIN_PASSWORD_LEN = 6;

type Mode = 'login' | 'register';

/* ─── Root Screen ─── */

export default function AuthScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const [mode, setMode] = useState<Mode>('login');
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <GradientBackdrop />
      <SafeAreaView style={{ flex: 1 }}>
        <LanguageSwitcher />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Header />
            <Card padding={22} style={{ marginTop: 28 }}>
              <ModePicker mode={mode} onChange={setMode} />
              <View style={{ height: 18 }} />
              {mode === 'login' ? (
                <LoginForm onForgotPassword={() => setForgotOpen(true)} />
              ) : (
                <RegisterForm
                  onVerificationSent={(email) =>
                    router.push({ pathname: '/(auth)/verify-email', params: { email } })
                  }
                  onSwitchToLogin={() => setMode('login')}
                />
              )}
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <ForgotPasswordModal visible={forgotOpen} onClose={() => setForgotOpen(false)} />
    </View>
  );
}

/* ─── Forgot Password Modal ─── */

function ForgotPasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { resetPassword } = useSession();
  const { t } = useTranslation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleClose = () => {
    setEmail('');
    setSent(false);
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Card padding={24} style={styles.modalCard}>
          <ModalHeader title={t('auth.resetPassword')} onClose={handleClose} />
          {sent ? (
            <View style={{ gap: 16, alignItems: 'center', marginTop: 12 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-open-outline" size={36} color={theme.colors.accent} />
              </View>
              <Text style={[styles.modalBody, { textAlign: 'center' }]}>
                {t('auth.resetSent', { email })}
              </Text>
              <Button title={t('common.close')} onPress={handleClose} style={{ alignSelf: 'stretch' }} />
            </View>
          ) : (
            <View style={{ gap: 14, marginTop: 8 }}>
              <Text style={styles.modalBody}>
                {t('auth.resetInstructions')}
              </Text>
              <Field label={t('common.email')}>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </Field>
              <Button title={t('auth.sendLink')} onPress={submit} loading={busy} disabled={!email.trim()} />
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
}

/* ─── Login Form ─── */

function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { signIn, signInWithGoogle } = useSession();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    const trimmed = email.trim();
    if (!isEmail(trimmed)) {
      setError(t('auth.enterValidEmail'));
      return;
    }
    if (password.length < MIN_PASSWORD_LEN) {
      setError(t('errors.passwordTooShort', { min: MIN_PASSWORD_LEN }));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(trimmed, password);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (!isCancelledError(e)) setError(friendlyError(e));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Field label={t('common.email')}>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>
      <Field label={t('common.password')}>
        <View style={{ position: 'relative' }}>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPw}
            rightIcon={showPw ? 'eye-off' : 'eye'}
            onRightIconPress={() => setShowPw(v => !v)}
          />
        </View>
      </Field>
      <Pressable
        onPress={onForgotPassword}
        style={{ alignSelf: 'flex-end', marginTop: -4 }}
      >
        <Text style={styles.linkText}>{t('auth.forgotPassword')}</Text>
      </Pressable>
      {error ? <InlineError>{error}</InlineError> : null}
      <Button
        title={t('auth.login')}
        onPress={handleSignIn}
        loading={busy}
        disabled={!isEmail(email.trim()) || password.length < MIN_PASSWORD_LEN}
      />
      <Divider />
      <GoogleButton onPress={handleGoogle} loading={googleBusy} />
    </View>
  );
}

/* ─── Register Form ─── */

function RegisterForm({
  onVerificationSent,
  onSwitchToLogin,
}: {
  onVerificationSent: (email: string) => void;
  onSwitchToLogin: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { register, signInWithGoogle } = useSession();
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    isEmail(email.trim()) &&
    password.length >= MIN_PASSWORD_LEN;

  const handleRegister = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (result.needsEmailVerification) {
        onVerificationSent(email.trim());
      }
    } catch (e) {
      if (isEmailTakenError(e)) {
        Alert.alert(
          t('auth.emailAlreadyInUse'),
          t('auth.emailAlreadyInUseDesc'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('auth.login'), onPress: onSwitchToLogin },
          ],
        );
      } else {
        setError(friendlyError(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (!isCancelledError(e)) setError(friendlyError(e));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label={t('auth.firstName')}>
            <Input value={firstName} onChangeText={setFirstName} placeholder={t('auth.firstNamePlaceholder')} />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label={t('auth.lastName')}>
            <Input value={lastName} onChangeText={setLastName} placeholder={t('auth.lastNamePlaceholder')} />
          </Field>
        </View>
      </View>
      <Field label={t('common.email')}>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>
      <Field label={t('auth.passwordMinLength', { min: MIN_PASSWORD_LEN })}>
        <View>
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            placeholder="••••••••"
          />
          <Pressable
            onPress={() => setShowPw(v => !v)}
            style={styles.eyeBtn}
            hitSlop={10}
          >
            <Ionicons
              name={showPw ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.inkFaint}
            />
          </Pressable>
        </View>
      </Field>
      {error ? <InlineError>{error}</InlineError> : null}
      <Button title={t('auth.register')} onPress={handleRegister} loading={busy} disabled={!canSubmit} />
      <Divider />
      <GoogleButton onPress={handleGoogle} loading={googleBusy} label={t('auth.registerWithGoogle')} />
    </View>
  );
}

/* ─── Shared small components ─── */

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  return (
    <View style={styles.modalHeader}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colors.ink }}>{title}</Text>
      <Pressable onPress={onClose} hitSlop={12}>
        <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
      </Pressable>
    </View>
  );
}

function InlineError({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={15} color={theme.colors.danger} />
      <Text style={{ color: theme.colors.danger, fontSize: 13, flex: 1, lineHeight: 18 }}>
        {children}
      </Text>
    </View>
  );
}

function Divider() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline }} />
      <Text style={{ color: theme.colors.inkFaint, fontSize: 12, fontWeight: '500' }}>{t('auth.or')}</Text>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline }} />
    </View>
  );
}

function GoogleButton({ onPress, loading, label, ...rest }: { onPress: () => void; loading?: boolean; label?: string } & Record<string, any>) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.googleBtn,
        pressed && { opacity: 0.82 },
        loading && { opacity: 0.6 },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.inkSoft} />
      ) : (
        <>
          <View style={styles.googleLogoWrap}>
            <Text style={styles.googleLogoText}>G</Text>
          </View>
          <Text style={{ fontWeight: '600', fontSize: 15, color: theme.colors.ink }}>
            {label ?? t('auth.loginWithGoogle')}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function GradientBackdrop() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <LinearGradient
      colors={[theme.colors.accentSoft, theme.colors.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
  );
}

function Header() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={styles.logoBadge}>
        <Ionicons name="shield-checkmark" size={42} color={theme.colors.white} />
      </View>
      <Text style={{ fontSize: 36, fontWeight: '900', color: theme.colors.ink }}>Sarke</Text>
      <Text style={{ color: theme.colors.inkSoft }}>{t('auth.tagline')}</Text>
    </View>
  );
}

function ModePicker({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { t } = useTranslation();
  return (
    <View style={styles.pickerWrap}>
      <Segment active={mode === 'login'} title={t('auth.login')} onPress={() => onChange('login')} />
      <Segment active={mode === 'register'} title={t('auth.register')} onPress={() => onChange('register')} />
    </View>
  );
}

function Segment({ active, title, onPress }: { active: boolean; title: string; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={{ color: active ? theme.colors.white : theme.colors.inkSoft, fontWeight: '600' }}>
        {title}
      </Text>
    </Pressable>
  );
}

function LanguageSwitcher() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { i18n } = useTranslation();
  const [busy, setBusy] = useState(false);

  const toggleLanguage = async () => {
    setBusy(true);
    try {
      const newLang = i18n.language === 'ka' ? 'en' : 'ka';
      await saveLanguage(newLang as 'ka' | 'en');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.languageSwitcherContainer}>
      <Pressable
        onPress={toggleLanguage}
        disabled={busy}
        style={({ pressed }) => [
          styles.languageSwitcher,
          pressed && { opacity: 0.7 },
          busy && { opacity: 0.6 },
        ]}
      >
        <Ionicons name="globe" size={16} color={theme.colors.accent} />
        <Text style={styles.languageSwitcherText}>
          {i18n.language === 'ka' ? 'English' : 'ქართული'}
        </Text>
      </Pressable>
    </View>
  );
}

/* ─── Styles ─── */

function getstyles(theme: any) {
  return StyleSheet.create({
  languageSwitcherContainer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  languageSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.subtleSurface,
  },
  languageSwitcherText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  scroll: { paddingHorizontal: 22, paddingTop: 40, paddingBottom: 40 },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  pickerWrap: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.subtleSurface,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: theme.colors.accent },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  linkText: { color: theme.colors.accent, fontSize: 13, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: 10,
    padding: 10,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.hairline,
    backgroundColor: theme.colors.card,
  },
  googleLogoWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogoText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: { width: '100%', maxWidth: 400 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { color: theme.colors.inkSoft, lineHeight: 22, fontSize: 14 },
});
}
