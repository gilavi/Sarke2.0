import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { saveExpertSignature } from '../lib/signatures';
import { getStorageImageDataUrl } from '../lib/imageUrl';
import { STORAGE_BUCKETS } from '../lib/supabase';
import { theme } from '../lib/theme';
import { toErrorMessage } from '../lib/logError';
import { friendlyError } from '../lib/errorMap';
import { a11y } from '../lib/accessibility';

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

  const hasSignature = !!user?.saved_signature_url;

  const [preview, setPreview] = useState<string | null>(null);
  // Auto-open the drawing canvas when there's no signature yet — skip the empty
  // settings screen entirely. Also opens immediately for the first-time flow.
  const [capturing, setCapturing] = useState(isFirstTime || !hasSignature);
  const [busy, setBusy] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!user?.saved_signature_url) return setPreview(null);
    setPreview(await getStorageImageDataUrl(STORAGE_BUCKETS.signatures, user.saved_signature_url));
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
      // Always close after a successful save — no reason to stay on the sheet.
      router.back();
    } catch (e) {
      toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
    } finally {
      setBusy(false);
    }
  };

  const onCancelCapture = () => {
    setCapturing(false);
    // No signature on file? Cancelling the canvas means the sheet has nothing
    // to show — bail back to where we came from instead of stranding the user.
    if (!hasSignature) {
      if (isFirstTime) {
        Alert.alert(
          'ხელმოწერა საჭიროა',
          'PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.',
          [{ text: 'კარგი', onPress: () => router.back() }],
        );
      } else {
        router.back();
      }
    }
  };

  const displayName = user ? `${user.first_name} ${user.last_name}`.trim() : '';

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />

      {/* Backdrop — tap to dismiss */}
      <Pressable
        style={styles.backdrop}
        onPress={() => router.back()}
        {...a11y('დახურვა', 'შეეხეთ დასახურად', 'button')}
      />

      {/* Bottom action sheet */}
      <SafeAreaView edges={['bottom']} style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>
              {isFirstTime ? 'ექსპერტის ხელმოწერა' : 'ჩემი ხელმოწერა'}
            </Text>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.colors.ink} />
            </Pressable>
          </View>

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
          <Text style={styles.expertLabel}>ექსპერტი: {displayName || '—'}</Text>

          <Button
            title={preview ? 'ხელმოწერის შეცვლა' : 'ხელმოწერის დახატვა'}
            onPress={() => setCapturing(true)}
            loading={busy}
            size="lg"
            style={{ alignSelf: 'stretch', justifyContent: 'center', marginTop: 16 }}
            {...a11y(preview ? 'ხელმოწერის შეცვლა' : 'ხელმოწერის დახატვა', undefined, 'button')}
          />
        </View>
      </SafeAreaView>

      <SignatureCanvas
        visible={capturing}
        personName={displayName || 'ექსპერტი'}
        onCancel={onCancelCapture}
        onConfirm={onConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.ink },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.subtleSurface,
  },
  preview: {
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
    height: 120,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  expertLabel: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 10 },
});
