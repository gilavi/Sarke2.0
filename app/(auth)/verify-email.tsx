import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { theme } from '../../lib/theme';
import { toErrorMessage } from '../../lib/logError';
import { a11y } from '../../lib/accessibility';
import { Button, Card } from '../../components/ui';
import { BackButton } from '../../components/BackButton';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 30;
const COOLDOWN_KEY_PREFIX = 'verify-otp-cooldown:';

const cooldownKey = (email: string) => `${COOLDOWN_KEY_PREFIX}${email.toLowerCase()}`;

async function readPersistedCooldown(email: string): Promise<number> {
  if (!email) return 0;
  const raw = await AsyncStorage.getItem(cooldownKey(email)).catch(() => null);
  if (!raw) return 0;
  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt)) return 0;
  const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

async function writePersistedCooldown(email: string, seconds: number): Promise<void> {
  if (!email) return;
  await AsyncStorage.setItem(cooldownKey(email), String(Date.now() + seconds * 1000)).catch(() => {});
}

function friendlyError(msg: string): string {
  const lower = (msg ?? '').toLowerCase();
  if (lower.includes('expired')) return 'კოდის ვადა ამოიწურა. მოითხოვეთ ახალი.';
  if (lower.includes('invalid') || lower.includes('token'))
    return 'არასწორი კოდი. გთხოვთ, სცადოთ კიდევ ერთხელ.';
  if (lower.includes('rate limit') || lower.includes('too many'))
    return 'ძალიან ბევრი მცდელობა. მოიცადეთ და კვლავ სცადეთ.';
  if (lower.includes('network') || lower.includes('fetch failed'))
    return 'ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი.';
  return msg || 'უცნობი შეცდომა';
}

export default function VerifyEmailScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = (emailParam ?? '').toString();
  const { verifySignupOtp, resendSignupOtp } = useSession();
  const toast = useToast();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readPersistedCooldown(email).then(remaining => {
      if (!cancelled && remaining > 0) setCooldown(remaining);
    });
    return () => { cancelled = true; };
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) {
      void submit(digits);
    }
  };

  const submit = async (value?: string) => {
    const token = (value ?? code).trim();
    if (token.length !== CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    try {
      await verifySignupOtp(email, token);
      // AuthGate will redirect once the session lands.
    } catch (e) {
      setError(friendlyError(toErrorMessage(e)));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resendBusy) return;
    setResendBusy(true);
    setError(null);
    try {
      await resendSignupOtp(email);
      toast.success('კოდი გამოგზავნილია');
      setCooldown(RESEND_COOLDOWN_SEC);
      void writePersistedCooldown(email, RESEND_COOLDOWN_SEC);
    } catch (e) {
      toast.error(friendlyError(toErrorMessage(e)));
    } finally {
      setResendBusy(false);
    }
  };

  const cells = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] ?? '');

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[theme.colors.accentSoft, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
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
            <BackButton label="შესვლა" style={styles.backBtn} />

            <View style={{ alignItems: 'center', gap: 12, marginTop: 24 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-unread-outline" size={40} color={theme.colors.accent} />
              </View>
              <Text style={styles.title}>შეამოწმეთ ელ-ფოსტა</Text>
              <Text style={styles.subtitle}>
                {'დადასტურების კოდი გაიგზავნა\n'}
                <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>{email}</Text>
                {'-ზე'}
              </Text>
            </View>

            <Card padding={22} style={{ marginTop: 28 }}>
              <Pressable onPress={() => inputRef.current?.focus()} style={styles.cellsRow} {...a11y('დადასტურების კოდის ველი', 'დააჭირეთ კოდის შესაყვანად', 'button')}>
                {cells.map((ch, i) => (
                  <View
                    key={i}
                    style={[
                      styles.cell,
                      ch ? styles.cellFilled : null,
                      i === code.length && !busy ? styles.cellActive : null,
                    ]}
                  >
                    <Text style={styles.cellText}>{ch}</Text>
                  </View>
                ))}
              </Pressable>

              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleChange}
                keyboardType="number-pad"
                inputMode="numeric"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={CODE_LENGTH}
                editable={!busy}
                caretHidden
                style={styles.hiddenInput}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={theme.colors.danger} />
                  <Text
                    style={{ color: theme.colors.danger, fontSize: 13, flex: 1, lineHeight: 18 }}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}

              <Button
                title="დადასტურება"
                onPress={() => submit()}
                loading={busy}
                disabled={code.length !== CODE_LENGTH}
                style={{ marginTop: 18 }}
                {...a11y('დადასტურება', 'ელ-ფოსტის დადასტურება კოდით', 'button')}
              />

              <View style={styles.resendRow}>
                <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>
                  კოდი არ მიგიღიათ?
                </Text>
                <Pressable
                  onPress={handleResend}
                  disabled={cooldown > 0 || resendBusy}
                  hitSlop={8}
                  {...a11y('კოდის ხელახლა გაგზავნა', 'ახალი დადასტურების კოდის მოთხოვნა', 'button')}
                >
                  <Text
                    style={[
                      styles.resendLink,
                      (cooldown > 0 || resendBusy) && { color: theme.colors.inkFaint },
                    ]}
                  >
                    {cooldown > 0 ? `ხელახლა გაგზავნა (${cooldown}წ)` : 'ხელახლა გაგზავნა'}
                  </Text>
                </Pressable>
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.ink },
  subtitle: { color: theme.colors.inkSoft, lineHeight: 22, fontSize: 14, textAlign: 'center' },
  cellsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.hairline,
    backgroundColor: theme.colors.subtleSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.accent,
  },
  cellActive: {
    borderColor: theme.colors.accent,
  },
  cellText: { fontSize: 24, fontWeight: '700', color: theme.colors.ink },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  resendLink: { color: theme.colors.accent, fontSize: 13, fontWeight: '700' },
});
