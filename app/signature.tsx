// Signature settings screen.
//
// Two entry points:
//  - `/signature`           — view / manage (from More tab)
//  - `/signature?first=1`   — onboarding before first PDF
//
// No loading state — preview/empty is derived instantly from session data.
// Image URL loads async in the background; placeholder shown meanwhile.

import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { A11yText as Text } from '../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { saveExpertSignature } from '../lib/signatures';
import { getStorageImageDataUrl } from '../lib/imageUrl';
import { STORAGE_BUCKETS } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { friendlyError } from '../lib/errorMap';
import { haptic } from '../lib/haptics';
import { a11y } from '../lib/accessibility';

const SCREEN_H = Dimensions.get('window').height;

type Mode = 'empty' | 'preview' | 'drawing';

export default function SignatureSettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const isFirstTime = first === '1';
  const { state, refreshUser } = useSession();
  const user = state.status === 'signedIn' ? state.user : null;

  const hasSignature = !!user?.saved_signature_url;
  const [mode, setMode] = useState<Mode>(isFirstTime ? 'drawing' : hasSignature ? 'preview' : 'empty');
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const displayName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ექსპერტი';

  const onClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  }, [router]);

  // Load preview URL in background (no state machine dependency).
  useEffect(() => {
    if (!user?.saved_signature_url) return;
    let cancelled = false;
    getStorageImageDataUrl(STORAGE_BUCKETS.signatures, user.saved_signature_url)
      .then(url => { if (!cancelled) setPreview(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.saved_signature_url]);

  const onConfirm = async (base64: string) => {
    setBusy(true);
    try {
      const path = await saveExpertSignature(base64);
      await refreshUser();
      const url = await getStorageImageDataUrl(STORAGE_BUCKETS.signatures, path);
      setPreview(url);
      toast.success('ხელმოწერა შენახულია');
      setMode('preview');
      if (isFirstTime) onClose();
    } catch (e) {
      toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    haptic.medium();
    setPreview(null);
    toast.success('ხელმოწერა წაიშლა');
    setMode('empty');
  };

  const onCancelDraw = () => {
    if (!preview && !user?.saved_signature_url) {
      onClose();
      return;
    }
    setMode(preview || user?.saved_signature_url ? 'preview' : 'empty');
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />

      {/* Backdrop — tap to dismiss (only when not drawing). */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={mode !== 'drawing' ? onClose : undefined}
        {...a11y('დახურვა', 'შეეხეთ დასახურად', 'button')}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.overlay }]} />
      </Pressable>

      {/* Sheet */}
      <SafeAreaView
        edges={mode === 'drawing' ? [] : ['bottom']}
        style={styles.sheetWrap}
      >
        <View style={[styles.sheet, mode === 'drawing' && styles.sheetDrawing]}>
          {/* Handle */}
          {mode !== 'drawing' && (
            <View style={styles.handleBar}>
              <View style={styles.handle} />
            </View>
          )}

          {/* ── EMPTY ── */}
          {mode === 'empty' && (
            <View style={styles.body}>
              <View style={styles.headerRow}>
                <Text size="xl" weight="bold" color={theme.colors.ink}>
                  ჩემი ხელმოწერა
                </Text>
                <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={theme.colors.ink} />
                </Pressable>
              </View>

              <View style={styles.emptyVisual}>
                <View style={[styles.emptyIconBg, { backgroundColor: theme.colors.accentSoft }]}>
                  <Ionicons name="create-outline" size={32} color={theme.colors.accent} />
                </View>
                <Text size="base" weight="semibold" color={theme.colors.ink} style={{ textAlign: 'center' }}>
                  თქვენ ჯერ არ გაქვთ შენახული ხელმოწერა
                </Text>
                <Text size="sm" color={theme.colors.inkSoft} style={{ textAlign: 'center', marginTop: 4 }}>
                  ხელმოწერა საჭიროა PDF რეპორტების დასაგენერირებლად
                </Text>
              </View>

              <Pressable
                onPress={() => { haptic.light(); setMode('drawing'); }}
                disabled={busy}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
                {...a11y('ხელმოწერის დამატება', undefined, 'button')}
              >
                <Text size="base" weight="semibold" color="#FFFFFF">
                  ხელმოწერის დამატება
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── PREVIEW ── */}
          {mode === 'preview' && (
            <View style={styles.body}>
              <View style={styles.headerRow}>
                <Text size="xl" weight="bold" color={theme.colors.ink}>
                  ჩემი ხელმოწერა
                </Text>
                <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={theme.colors.ink} />
                </Pressable>
              </View>

              <View style={[styles.previewCard, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                {preview ? (
                  <Image source={{ uri: preview }} style={styles.previewImg} contentFit="contain" />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <Ionicons name="image-outline" size={32} color={theme.colors.inkFaint} />
                  </View>
                )}
              </View>

              <Text size="base" weight="semibold" color={theme.colors.ink} style={{ textAlign: 'center' }}>
                {displayName}
              </Text>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => { haptic.light(); setMode('drawing'); }}
                  style={({ pressed }) => [styles.secondaryBtn, { borderColor: theme.colors.border }, pressed && styles.btnPressed]}
                  {...a11y('შეცვლა', undefined, 'button')}
                >
                  <Text size="base" weight="semibold" color={theme.colors.ink}>
                    შეცვლა
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onDelete}
                  style={({ pressed }) => [styles.destructiveBtn, { backgroundColor: theme.colors.semantic.dangerSoft }, pressed && styles.btnPressed]}
                  {...a11y('წაშლა', undefined, 'button')}
                >
                  <Text size="base" weight="semibold" color={theme.colors.semantic.danger}>
                    წაშლა
                  </Text>
                </Pressable>
              </View>

              <Pressable onPress={onClose} style={({ pressed }) => [styles.doneBtn, pressed && styles.btnPressed]}>
                <Text size="base" weight="semibold" color={theme.colors.inkSoft}>
                  დასრულება
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── DRAWING ── */}
          {mode === 'drawing' && (
            <SignatureCanvas
              personName={displayName}
              onCancel={onCancelDraw}
              onConfirm={onConfirm}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  sheetDrawing: {
    flex: 1,
    maxHeight: SCREEN_H * 0.95,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },

  body: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },

  emptyVisual: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.8,
  },

  previewCard: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
});
