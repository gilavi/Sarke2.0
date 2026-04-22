import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../components/ui';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { saveExpertSignature } from '../lib/signatures';
import { storageApi } from '../lib/services';
import { blobToDataUrl } from '../lib/blob';
import { STORAGE_BUCKETS } from '../lib/supabase';
import { theme } from '../lib/theme';

// Screen supports two modes:
//  - `/signature` — view current + "ხელმოწერის შეცვლა" (from More tab)
//  - `/signature?first=1` — modal-style onboarding shown before the first
//    PDF. Returns via router.back() after save.
export default function SignatureSettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const isFirstTime = first === '1';
  const { state, refreshUser } = useSession();
  const user = state.status === 'signedIn' ? state.user : null;

  const [preview, setPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(isFirstTime);
  const [busy, setBusy] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!user?.saved_signature_url) return setPreview(null);
    try {
      const blob = await storageApi.download(
        STORAGE_BUCKETS.signatures,
        user.saved_signature_url,
      );
      setPreview(await blobToDataUrl(blob));
    } catch {
      setPreview(storageApi.publicUrl(STORAGE_BUCKETS.signatures, user.saved_signature_url));
    }
  }, [user?.saved_signature_url]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const onConfirm = async (base64: string) => {
    setCapturing(false);
    setBusy(true);
    try {
      await saveExpertSignature(base64);
      await refreshUser();
      setPreview(`data:image/png;base64,${base64}`);
      toast.success('ხელმოწერა შენახულია');
      if (isFirstTime) router.back();
    } catch (e: any) {
      toast.error(e?.message ?? 'შენახვა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  const onCancelCapture = () => {
    setCapturing(false);
    if (isFirstTime && !user?.saved_signature_url) {
      Alert.alert(
        'ხელმოწერა საჭიროა',
        'PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა. გსურს დაბრუნება?',
        [
          { text: 'დარჩი აქ', style: 'cancel' },
          { text: 'უკან დაბრუნება', onPress: () => router.back() },
        ],
      );
    }
  };

  const displayName = user ? `${user.first_name} ${user.last_name}`.trim() : '';

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: isFirstTime ? 'ექსპერტის ხელმოწერა' : 'ჩემი ხელმოწერა',
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          {isFirstTime ? (
            <Card>
              <Text style={styles.eyebrow}>ერთჯერადი კონფიგურაცია</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colors.ink, marginTop: 6 }}>
                დახაზეთ თქვენი ხელმოწერა
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.inkSoft, marginTop: 6, lineHeight: 18 }}>
                ეს შენახული იქნება და გამოყენებული ყველა ანგარიშში. მოგვიანებით
                შეცვლა შესაძლებელია "მეტი" ტაბიდან.
              </Text>
            </Card>
          ) : null}

          <Card>
            <Text style={styles.eyebrow}>ამჟამინდელი ხელმოწერა</Text>
            {preview ? (
              <View style={styles.preview}>
                <Image source={{ uri: preview }} style={styles.previewImg} resizeMode="contain" />
              </View>
            ) : (
              <View style={styles.previewEmpty}>
                <Ionicons name="create-outline" size={28} color={theme.colors.inkFaint} />
                <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>
                  ხელმოწერა ჯერ არ არის შენახული
                </Text>
              </View>
            )}
            <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 10 }}>
              ექსპერტი: {displayName || '—'}
            </Text>
          </Card>

          <Button
            title={preview ? 'ხელმოწერის შეცვლა' : 'ხელმოწერის დახატვა'}
            onPress={() => setCapturing(true)}
            loading={busy}
          />
        </ScrollView>
      </SafeAreaView>

      <SignatureCanvas
        visible={capturing}
        personName={displayName || 'ექსპერტი'}
        onCancel={onCancelCapture}
        onConfirm={onConfirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  preview: {
    marginTop: 10,
    height: 140,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImg: { width: '100%', height: '100%' },
  previewEmpty: {
    marginTop: 10,
    height: 120,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
