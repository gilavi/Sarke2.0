import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { Button } from '../../../components/ui';
import { useTheme } from '../../../lib/theme';
import { briefingsApi } from '../../../lib/briefingsApi';
import { a11y } from '../../../lib/accessibility';
import type { Briefing } from '../../../types/models';

// WebView canvas styles — same pattern as SignatureCanvas.tsx
const WEB_STYLE = `
  html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #fff; overflow: hidden; }
  .m-signature-pad { position: fixed; top: 0; left: 0; right: 0; bottom: 0; box-shadow: none; border: none; background: #fff; margin: 0; }
  .m-signature-pad--body { border: none; height: 100%; }
  .m-signature-pad--body canvas { width: 100% !important; height: 100% !important; background: #fff; }
  .m-signature-pad--footer { display: none; }
`;

export default function BriefingSignScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hasStroke, setHasStroke] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<SignatureViewRef>(null);

  // Load briefing and find first unsigned participant
  useEffect(() => {
    if (!id) return;
    briefingsApi.getById(id).then(b => {
      if (!b) return;
      setBriefing(b);
      // Resume from first unsigned participant
      const firstUnsigned = b.participants.findIndex(p => !p.signature);
      setCurrentIdx(firstUnsigned === -1 ? b.participants.length : firstUnsigned);
    });
  }, [id]);

  // Reset canvas when moving to a new signer
  useEffect(() => {
    setHasStroke(false);
    const t = setTimeout(() => canvasRef.current?.clearSignature(), 80);
    return () => clearTimeout(t);
  }, [currentIdx]);

  const isInspectorPhase = briefing
    ? currentIdx >= briefing.participants.length
    : false;

  const handleConfirm = useCallback(() => {
    if (!hasStroke) return;
    canvasRef.current?.readSignature();
  }, [hasStroke]);

  const handleClear = useCallback(() => {
    canvasRef.current?.clearSignature();
    setHasStroke(false);
  }, []);

  const handleOK = useCallback(
    async (sig: string) => {
      if (!briefing || !id) return;
      setSaving(true);
      try {
        const b64 = sig.replace(/^data:image\/png;base64,/, '');

        if (isInspectorPhase) {
          // Inspector signed — complete the briefing
          await briefingsApi.update(id, {
            inspectorSignature: b64,
            status: 'completed',
          });
          router.replace(`/briefings/${id}/done` as any);
        } else {
          // Worker signed — save signature and advance
          const updatedParticipants = briefing.participants.map((p, i) =>
            i === currentIdx ? { ...p, signature: b64 } : p,
          );
          const updated = await briefingsApi.update(id, { participants: updatedParticipants });
          setBriefing(updated);
          setCurrentIdx(prev => prev + 1);
        }
      } finally {
        setSaving(false);
      }
    },
    [briefing, id, currentIdx, isInspectorPhase],
  );

  if (!briefing) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      </View>
    );
  }

  const totalWorkers = briefing.participants.length;

  if (isInspectorPhase) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

        {/* Inspector header */}
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow}>ინსპექტორის ხელმოწერა</Text>
          </View>
          <Text style={styles.signerName} numberOfLines={2}>
            {briefing.inspectorName || 'ინსპექტორი'}
          </Text>
          <Text style={styles.promptText}>გთხოვთ მოაწეროთ ხელი</Text>
        </View>

        {/* Canvas */}
        <View style={styles.canvasWrap}>
          <SignatureScreen
            key="inspector"
            ref={canvasRef}
            onOK={handleOK}
            onBegin={() => setHasStroke(true)}
            onEnd={() => setHasStroke(true)}
            webStyle={WEB_STYLE}
            descriptionText=""
            autoClear={false}
            imageType="image/png"
            backgroundColor="rgba(255,255,255,1)"
            penColor="#000000"
            minWidth={1.2}
            maxWidth={3}
            style={{ flex: 1 }}
            webviewContainerStyle={{ flex: 1 }}
          />
          <View pointerEvents="none" style={styles.baseline} />
          {!hasStroke && (
            <View pointerEvents="none" style={styles.hintWrap}>
              <Text style={styles.hintText}>ამ სივრცეში ხელი მოაწერეთ</Text>
            </View>
          )}
        </View>

        {/* Bottom actions */}
        <View style={styles.footer}>
          {hasStroke && (
            <Pressable onPress={handleClear} style={styles.clearBtn} {...a11y('გასუფთავება', 'ხელმოწერის გასუფთავება', 'button')}>
              <Ionicons name="refresh" size={16} color={theme.colors.inkSoft} />
              <Text style={styles.clearBtnText}>გასუფთავება</Text>
            </Pressable>
          )}
          <Button
            title={saving ? 'იტვირთება...' : 'დასრულება და PDF გენერირება'}
            size="lg"
            onPress={handleConfirm}
            disabled={!hasStroke || saving}
            style={{ flex: 1 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Worker signing phase
  const workerName = briefing.participants[currentIdx]?.name ?? '';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      {/* Worker header */}
      <View style={styles.header}>
        {/* Progress indicator */}
        <View style={styles.progressWrap}>
          <Text style={styles.progressText}>
            {currentIdx + 1} / {totalWorkers}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentIdx + 1) / totalWorkers) * 100}%` as any },
              ]}
            />
          </View>
        </View>

        <Text style={styles.signerName} numberOfLines={2}>
          {workerName}
        </Text>
        <Text style={styles.promptText}>გთხოვთ მოაწეროთ ხელი</Text>
      </View>

      {/* Canvas */}
      <View style={styles.canvasWrap}>
        <SignatureScreen
          key={currentIdx}
          ref={canvasRef}
          onOK={handleOK}
          onBegin={() => setHasStroke(true)}
          onEnd={() => setHasStroke(true)}
          webStyle={WEB_STYLE}
          descriptionText=""
          autoClear={false}
          imageType="image/png"
          backgroundColor="rgba(255,255,255,1)"
          penColor="#000000"
          minWidth={1.2}
          maxWidth={3}
          style={{ flex: 1 }}
          webviewContainerStyle={{ flex: 1 }}
        />
        <View pointerEvents="none" style={styles.baseline} />
        {!hasStroke && (
          <View pointerEvents="none" style={styles.hintWrap}>
            <Text style={styles.hintText}>ამ სივრცეში ხელი მოაწერეთ</Text>
          </View>
        )}
      </View>

      {/* Bottom actions */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleClear}
          disabled={!hasStroke}
          style={[styles.clearBtn, !hasStroke && { opacity: 0.3 }]}
          {...a11y('გასუფთავება', 'ხელმოწერის გასუფთავება', 'button')}
        >
          <Ionicons name="refresh" size={16} color={theme.colors.inkSoft} />
          <Text style={styles.clearBtnText}>გასუფთავება</Text>
        </Pressable>
        <Button
          title={saving ? 'ინახება...' : 'დადასტურება →'}
          size="lg"
          onPress={handleConfirm}
          disabled={!hasStroke || saving}
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 8,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    progressWrap: {
      gap: 6,
    },
    progressText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    progressTrack: {
      height: 4,
      backgroundColor: theme.colors.hairline,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.accent,
      borderRadius: 2,
    },
    signerName: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
      marginTop: 4,
    },
    promptText: {
      fontSize: 14,
      color: theme.colors.inkSoft,
      textAlign: 'center',
    },
    canvasWrap: {
      flex: 1,
      marginHorizontal: 12,
      backgroundColor: theme.colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      overflow: 'hidden',
    },
    baseline: {
      position: 'absolute',
      bottom: 32,
      left: 24,
      right: 24,
      height: 1,
      borderBottomWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.hairline,
    },
    hintWrap: {
      position: 'absolute',
      bottom: 10,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    hintText: {
      fontSize: 12,
      color: theme.colors.inkFaint,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      paddingTop: 14,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    clearBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
  });
}
