import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { isEmail } from '../../lib/validators';
import { friendlyError, isCancelledError, isEmailTakenError } from '../../lib/errorMap';
import { Button, Card, Field, Input } from '../../components/ui';

const MIN_PASSWORD_LEN = 6;

type Mode = 'login' | 'register';

/* ─── Root Screen ─── */

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <GradientBackdrop />
      <SafeAreaView style={{ flex: 1 }}>
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
  const { resetPassword } = useSession();
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
          <ModalHeader title="პაროლის აღდგენა" onClose={handleClose} />
          {sent ? (
            <View style={{ gap: 16, alignItems: 'center', marginTop: 12 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-open-outline" size={36} color={theme.colors.accent} />
              </View>
              <Text style={[styles.modalBody, { textAlign: 'center' }]}>
                {'პაროლის განახლების ბმული გაიგზავნა\n'}
                <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>{email}</Text>
                {'-ზე.'}
              </Text>
              <Button title="დახურვა" onPress={handleClose} style={{ alignSelf: 'stretch' }} />
            </View>
          ) : (
            <View style={{ gap: 14, marginTop: 8 }}>
              <Text style={styles.modalBody}>
                შეიყვანეთ ელ-ფოსტა და გამოგიგზავნებთ პაროლის განახლების ბმულს.
              </Text>
              <Field label="ელ-ფოსტა">
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </Field>
              <Button title="გაგზავნა" onPress={submit} loading={busy} disabled={!email.trim()} />
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
}

/* ─── Login Form ─── */

function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { signIn, signInWithGoogle } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    const trimmed = email.trim();
    if (!isEmail(trimmed)) {
      setError('გთხოვთ შეიყვანოთ ვალიდური ელ-ფოსტა');
      return;
    }
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`პაროლი უნდა შეიცავდეს მინიმუმ ${MIN_PASSWORD_LEN} სიმბოლოს`);
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
      <Field label="იმეილი">
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          {...a11y('ელფოსტის ველი', 'შეიყვანეთ თქვენი ელფოსტის მისამართი', 'text')}
        />
      </Field>
      <Field label="პაროლი">
        <View>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPw}
            {...a11y('პაროლის ველი', 'შეიყვანეთ თქვენი პაროლი', 'text')}
          />
          <Pressable
            onPress={() => setShowPw(v => !v)}
            style={styles.eyeBtn}
            hitSlop={10}
            {...a11y(showPw ? 'პაროლის დაფარვა' : 'პაროლის ჩვენება', 'შეეხეთ პაროლის ხილვადობის შესაცვლელად', 'button')}
          >
            <Ionicons
              name={showPw ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.inkFaint}
            />
          </Pressable>
        </View>
      </Field>
      <Pressable
        onPress={onForgotPassword}
        style={{ alignSelf: 'flex-end', marginTop: -4 }}
        {...a11y('პაროლის აღდგენა', 'შეეხეთ პაროლის აღსადგენად იმეილის გაგზავნისთვის', 'button')}
      >
        <Text style={styles.linkText}>პაროლი დაგავიწყდა?</Text>
      </Pressable>
      {error ? <InlineError>{error}</InlineError> : null}
      <Button
        title="შესვლა"
        onPress={handleSignIn}
        loading={busy}
        disabled={!isEmail(email.trim()) || password.length < MIN_PASSWORD_LEN}
        {...a11y('შესვლის ღილაკი', 'შეეხეთ ანგარიშში შესასვლელად', 'button')}
      />
      <Divider />
      <GoogleButton onPress={handleGoogle} loading={googleBusy} {...a11y('Google-ით შესვლა', 'შეეხეთ Google ანგარიშით შესასვლელად', 'button')} />
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
  const { register, signInWithGoogle } = useSession();
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
          'ელ-ფოსტა უკვე გამოიყენება',
          'ამ ელ-ფოსტით ანგარიში უკვე არსებობს. გსურთ შესვლა?',
          [
            { text: 'გაუქმება', style: 'cancel' },
            { text: 'შესვლა', onPress: onSwitchToLogin },
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
          <Field label="სახელი">
            <Input value={firstName} onChangeText={setFirstName} placeholder="გიორგი" {...a11y('სახელის ველი', 'შეიყვანეთ თქვენი სახელი', 'text')} />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="გვარი">
            <Input value={lastName} onChangeText={setLastName} placeholder="ხელაძე" {...a11y('გვარის ველი', 'შეიყვანეთ თქვენი გვარი', 'text')} />
          </Field>
        </View>
      </View>
      <Field label="იმეილი">
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          {...a11y('ელფოსტის ველი რეგისტრაციისთვის', 'შეიყვანეთ ელფოსტა ახალი ანგარიშისთვის', 'text')}
        />
      </Field>
      <Field label="პაროლი (მინ. 6 სიმბოლო)">
        <View>
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            placeholder="••••••••"
            {...a11y('პაროლის ველი რეგისტრაციისთვის', 'შეიყვანეთ პაროლი მინიმუმ 6 სიმბოლო', 'text')}
          />
          <Pressable
            onPress={() => setShowPw(v => !v)}
            style={styles.eyeBtn}
            hitSlop={10}
            {...a11y(showPw ? 'პაროლის დაფარვა' : 'პაროლის ჩვენება', 'შეეხეთ პაროლის ხილვადობის შესაცვლელად', 'button')}
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
      <Button title="რეგისტრაცია" onPress={handleRegister} loading={busy} disabled={!canSubmit} {...a11y('რეგისტრაციის ღილაკი', 'შეეხეთ ახალი ანგარიშის შესაქმნელად', 'button')} />
      <Divider />
      <GoogleButton onPress={handleGoogle} loading={googleBusy} {...a11y('Google-ით რეგისტრაცია', 'შეეხეთ Google ანგარიშით რეგისტრაციისთვის', 'button')} />
    </View>
  );
}

/* ─── Shared small components ─── */

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colors.ink }}>{title}</Text>
      <Pressable onPress={onClose} hitSlop={12} {...a11y('დახურვა', 'შეეხეთ მოდალის დასახურად', 'button')}>
        <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
      </Pressable>
    </View>
  );
}

function InlineError({ children }: { children: React.ReactNode }) {
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
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline }} />
      <Text style={{ color: theme.colors.inkFaint, fontSize: 12, fontWeight: '500' }}>ან</Text>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline }} />
    </View>
  );
}

function GoogleButton({ onPress, loading, ...rest }: { onPress: () => void; loading?: boolean } & Record<string, any>) {
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
            Google-ით შესვლა
          </Text>
        </>
      )}
    </Pressable>
  );
}

function GradientBackdrop() {
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
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={styles.logoBadge}>
        <Ionicons name="shield-checkmark" size={42} color={theme.colors.white} />
      </View>
      <Text style={{ fontSize: 36, fontWeight: '900', color: theme.colors.ink }}>Sarke</Text>
      <Text style={{ color: theme.colors.inkSoft }}>შრომის უსაფრთხოების ექსპერტი</Text>
    </View>
  );
}

function ModePicker({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <View style={styles.pickerWrap}>
      <Segment active={mode === 'login'} title="შესვლა" onPress={() => onChange('login')} />
      <Segment active={mode === 'register'} title="რეგისტრაცია" onPress={() => onChange('register')} />
    </View>
  );
}

function Segment({ active, title, onPress }: { active: boolean; title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={{ color: active ? theme.colors.white : theme.colors.inkSoft, fontWeight: '600' }}>
        {title}
      </Text>
    </Pressable>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
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
