import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSession } from '../../lib/session';
import { theme } from '../../lib/theme';
import { Button, Card, ErrorText, Field, Input } from '../../components/ui';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
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
          >
            <Header />
            <Card padding={22} style={{ marginTop: 28 }}>
              <ModePicker mode={mode} onChange={setMode} />
              <View style={{ height: 16 }} />
              {mode === 'login' ? <LoginForm /> : <RegisterForm />}
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
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

function LoginForm() {
  const { signIn } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? 'უცნობი შეცდომა');
    } finally {
      setBusy(false);
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
        />
      </Field>
      <Field label="პაროლი">
        <Input value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
      </Field>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button
        title="შესვლა"
        onPress={submit}
        loading={busy}
        disabled={!email || !password}
      />
      <Pressable onPress={() => router.push('/(auth)/forgot')} style={{ alignSelf: 'center', paddingVertical: 6 }}>
        <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>დაგავიწყდა პაროლი?</Text>
      </Pressable>
    </View>
  );
}

function RegisterForm() {
  const { register } = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !!firstName.trim() && !!lastName.trim() && !!email.trim() && password.length >= 6;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
    } catch (e: any) {
      setError(e?.message ?? 'უცნობი შეცდომა');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="სახელი">
            <Input value={firstName} onChangeText={setFirstName} placeholder="გიორგი" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="გვარი">
            <Input value={lastName} onChangeText={setLastName} placeholder="ხელაძე" />
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
        />
      </Field>
      <Field label="პაროლი (მინ. 6)">
        <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
      </Field>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title="რეგისტრაცია" onPress={submit} loading={busy} disabled={!canSubmit} />
    </View>
  );
}

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
  segmentActive: {
    backgroundColor: theme.colors.accent,
  },
});
