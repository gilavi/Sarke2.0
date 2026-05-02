import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { Button } from '../../../components/ui';
import { useBottomSheet } from '../../../components/BottomSheet';
import { useTheme } from '../../../lib/theme';
import { briefingsApi } from '../../../lib/briefingsApi';
import { a11y } from '../../../lib/accessibility';
import { useQueryClient } from '@tanstack/react-query';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { qk } from '../../../lib/apiHooks';
import type { Briefing, BriefingParticipant } from '../../../types/models';

// WebView canvas styles — same pattern as SignatureCanvas.tsx
const WEB_STYLE = `
  html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #fff; overflow: hidden; }
  .m-signature-pad { position: fixed; top: 0; left: 0; right: 0; bottom: 0; box-shadow: none; border: none; background: #fff; margin: 0; }
  .m-signature-pad--body { border: none; height: 100%; }
  .m-signature-pad--body canvas { width: 100% !important; height: 100% !important; background: #fff; }
  .m-signature-pad--footer { display: none; }
`;

type ParticipantStatus = 'signed' | 'skipped' | 'pending' | 'current';

function statusOf(p: BriefingParticipant, idx: number, currentIdx: number): ParticipantStatus {
  if (p.signature) return 'signed';
  if (idx === currentIdx) return 'current';
  if (p.skipped) return 'skipped';
  return 'pending';
}

export default function BriefingSignScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const showSheet = useBottomSheet();

  const queryClient = useQueryClient();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hasStroke, setHasStroke] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skipReviewed, setSkipReviewed] = useState(false);
  const canvasRef = useRef<SignatureViewRef>(null);

  // Load briefing and find first pending participant (not signed and not skipped).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    briefingsApi.getById(id)
      .then(b => {
        if (cancelled) return;
        if (!b) {
          router.back();
          return;
        }
        setBriefing(b);
        const firstPending = b.participants.findIndex(p => !p.signature && !p.skipped);
        setCurrentIdx(firstPending === -1 ? b.participants.length : firstPending);
      })
      .catch(err => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        Alert.alert('შეცდომა', `ინსტრუქტაჟის ჩატვირთვა ვერ მოხერხდა\n\n${msg}`, [
          { text: 'უკან', onPress: () => router.back() },
        ]);
      });
    return () => { cancelled = true; };
  }, [id]);

  // Reset canvas when moving to a new signer
  useEffect(() => {
    setHasStroke(false);
    const t = setTimeout(() => canvasRef.current?.clearSignature(), 80);
    return () => clearTimeout(t);
  }, [currentIdx]);

  const totalWorkers = briefing?.participants.length ?? 0;
  const signedCount = useMemo(
    () => briefing?.participants.filter(p => p.signature).length ?? 0,
    [briefing],
  );
  const skippedCount = useMemo(
    () => briefing?.participants.filter(p => p.skipped && !p.signature).length ?? 0,
    [briefing],
  );
  const pendingCount = totalWorkers - signedCount - skippedCount;

  const allWorkersHandled = briefing
    ? briefing.participants.every(p => p.signature || p.skipped)
    : false;
  const showInterstitial =
    !!briefing &&
    allWorkersHandled &&
    skippedCount > 0 &&
    !skipReviewed &&
    !briefing.inspectorSignature;
  const isInspectorPhase =
    !!briefing &&
    allWorkersHandled &&
    !showInterstitial;

  const persistParticipants = useCallback(
    async (next: BriefingParticipant[]) => {
      if (!id) return;
      const updated = await briefingsApi.update(id, { participants: next });
      setBriefing(updated);
      return updated;
    },
    [id],
  );

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
          await briefingsApi.update(id, {
            inspectorSignature: b64,
            status: 'completed',
          });
          // Record schedule entry (non-fatal).
          await recordCompletion('briefings', id, briefing.dateTime, briefing.projectId).catch(() => {});
          void queryClient.invalidateQueries({ queryKey: qk.calendar.schedules });
          void queryClient.invalidateQueries({ queryKey: qk.calendar.allBriefings });
          router.replace(`/briefings/${id}/done` as any);
        } else {
          // Worker signed — save signature, clear any prior skip, advance to next pending.
          const next = briefing.participants.map((p, i) =>
            i === currentIdx ? { ...p, signature: b64, skipped: false } : p,
          );
          await persistParticipants(next);
          const nextPending = next.findIndex(
            (p, i) => i > currentIdx && !p.signature && !p.skipped,
          );
          if (nextPending !== -1) {
            setCurrentIdx(nextPending);
          } else {
            // No more pending after this index — jump past workers so resume/render
            // either picks the interstitial (if anyone is still skipped) or inspector.
            setCurrentIdx(next.length);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        Alert.alert('შეცდომა', `ხელმოწერის შენახვა ვერ მოხერხდა\n\n${msg}`);
      } finally {
        setSaving(false);
      }
    },
    [briefing, id, currentIdx, isInspectorPhase, persistParticipants, router],
  );

  const handleBack = useCallback(() => {
    if (!briefing) return;
    // Walk backwards to the previous participant slot (signed or otherwise).
    const prev = currentIdx - 1;
    if (prev < 0) return;
    setCurrentIdx(prev);
  }, [currentIdx, briefing]);

  const handleSkip = useCallback(() => {
    if (!briefing) return;
    Alert.alert(
      'ამ მუშაკის გამოტოვება?',
      'შეგიძლიათ მოგვიანებით დაბრუნდეთ სიიდან.',
      [
        { text: 'გაუქმება', style: 'cancel' },
        {
          text: 'გამოტოვება',
          style: 'default',
          onPress: async () => {
            const next = briefing.participants.map((p, i) =>
              i === currentIdx ? { ...p, skipped: true } : p,
            );
            try {
              await persistParticipants(next);
              const nextPending = next.findIndex(
                (p, i) => i > currentIdx && !p.signature && !p.skipped,
              );
              setCurrentIdx(nextPending === -1 ? next.length : nextPending);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              Alert.alert('შეცდომა', `გამოტოვება ვერ მოხერხდა\n\n${msg}`);
            }
          },
        },
      ],
    );
  }, [briefing, currentIdx, persistParticipants]);

  const restoreSkipped = useCallback(
    async (idx: number) => {
      if (!briefing) return;
      const next = briefing.participants.map((p, i) =>
        i === idx ? { ...p, skipped: false } : p,
      );
      await persistParticipants(next);
    },
    [briefing, persistParticipants],
  );

  const jumpTo = useCallback(
    async (idx: number) => {
      if (!briefing) return;
      // Restore skipped on jump so the target becomes the active signer.
      if (briefing.participants[idx]?.skipped) {
        const next = briefing.participants.map((p, i) =>
          i === idx ? { ...p, skipped: false } : p,
        );
        await persistParticipants(next);
      }
      setCurrentIdx(idx);
      setSkipReviewed(false);
    },
    [briefing, persistParticipants],
  );

  const openRoster = useCallback(() => {
    if (!briefing) return;
    showSheet({
      dismissable: true,
      content: ({ dismiss }) => (
        <RosterSheet
          briefing={briefing}
          currentIdx={currentIdx}
          onJump={async (idx) => {
            dismiss();
            await jumpTo(idx);
          }}
          onRestore={async (idx) => {
            await restoreSkipped(idx);
          }}
          dismiss={dismiss}
        />
      ),
    });
  }, [briefing, currentIdx, jumpTo, restoreSkipped, showSheet]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'გასვლა',
      'ინსტრუქტაჟი დაიწყო. შეგიძლიათ მოგვიანებით დაბრუნდეთ და დაასრულოთ.',
      [
        { text: 'გაგრძელება', style: 'cancel' },
        { text: 'გასვლა', style: 'destructive', onPress: () => router.back() },
      ],
    );
  }, [router]);

  if (!briefing) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  // ── Interstitial: skipped workers remain after all pending handled ────────
  if (showInterstitial) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <View style={styles.interstitial}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.accent} />
          <Text style={styles.interstitialTitle}>
            {skippedCount} მუშაკი გამოტოვებული
          </Text>
          <Text style={styles.interstitialBody}>
            შეგიძლიათ დაუბრუნდეთ მათ ან გააგრძელოთ ინსპექტორის ხელმოწერაზე.
          </Text>
          <View style={styles.interstitialActions}>
            <Button
              title="შეხედე სიას"
              variant="secondary"
              size="lg"
              onPress={openRoster}
              style={{ flex: 1 }}
            />
            <Button
              title="გააგრძელე →"
              size="lg"
              onPress={() => setSkipReviewed(true)}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Inspector phase ──────────────────────────────────────────────────────
  if (isInspectorPhase) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow}>ინსპექტორის ხელმოწერა</Text>
          </View>
          <Text style={styles.signerName} numberOfLines={2}>
            {briefing.inspectorName || 'ინსპექტორი'}
          </Text>
          <Text style={styles.promptText}>გთხოვთ მოაწეროთ ხელი</Text>
        </View>

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

        <View style={styles.footer}>
          {hasStroke && (
            <Pressable onPress={handleClear} style={styles.skipBtn} {...a11y('გასუფთავება', 'ხელმოწერის გასუფთავება', 'button')}>
              <Ionicons name="refresh" size={16} color={theme.colors.inkSoft} />
              <Text style={styles.skipBtnText}>გასუფთავება</Text>
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

  // ── Worker signing phase ─────────────────────────────────────────────────
  const workerName = briefing.participants[currentIdx]?.name ?? '';
  const alreadySigned = !!briefing.participants[currentIdx]?.signature;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={styles.header}>
        {/* Top row: cancel + status pill */}
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={handleCancel}
            hitSlop={12}
            style={styles.cancelBtn}
            {...a11y('გაუქმება', 'ინსტრუქტაჟიდან გასვლა', 'button')}
          >
            <Ionicons name="close" size={20} color={theme.colors.inkSoft} />
          </Pressable>

          <Pressable
            onPress={openRoster}
            style={styles.statusPill}
            {...a11y('სია', 'ხელმომწერთა სია', 'button')}
          >
            <View style={styles.statusGroup}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} />
              <Text style={styles.statusNum}>{signedCount}</Text>
            </View>
            <View style={styles.statusGroup}>
              <Ionicons name="ellipse-outline" size={14} color={theme.colors.inkSoft} />
              <Text style={styles.statusNum}>{pendingCount}</Text>
            </View>
            {skippedCount > 0 && (
              <View style={styles.statusGroup}>
                <Ionicons name="remove-circle-outline" size={14} color={theme.colors.inkSoft} />
                <Text style={styles.statusNum}>{skippedCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={14} color={theme.colors.inkSoft} />
          </Pressable>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(signedCount / Math.max(totalWorkers, 1)) * 100}%` as any },
            ]}
          />
        </View>

        <Text style={styles.eyebrowCenter}>ხელს აწერს</Text>
        <Text style={styles.signerName} numberOfLines={2}>
          {workerName}
        </Text>
        <Text style={styles.promptText}>
          {currentIdx + 1} / {totalWorkers}
          {alreadySigned ? ' · უკვე მოწერილია — გადაწერა' : ''}
        </Text>
      </View>

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
          onPress={handleBack}
          disabled={currentIdx === 0 || saving}
          style={[styles.iconBtn, (currentIdx === 0 || saving) && { opacity: 0.3 }]}
          {...a11y('უკან', 'წინა მუშაკზე დაბრუნება', 'button')}
        >
          <Ionicons name="arrow-back" size={18} color={theme.colors.inkSoft} />
        </Pressable>
        <Pressable
          onPress={handleClear}
          disabled={!hasStroke}
          style={[styles.iconBtn, !hasStroke && { opacity: 0.3 }]}
          {...a11y('გასუფთავება', 'ხელმოწერის გასუფთავება', 'button')}
        >
          <Ionicons name="refresh" size={16} color={theme.colors.inkSoft} />
        </Pressable>
        <Pressable
          onPress={handleSkip}
          disabled={saving}
          style={[styles.skipBtn, saving && { opacity: 0.3 }]}
          {...a11y('გამოტოვება', 'ამ მუშაკის გამოტოვება', 'button')}
        >
          <Text style={styles.skipBtnText}>გამოტოვება</Text>
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

// ── Roster bottom sheet body ────────────────────────────────────────────────

function RosterSheet({
  briefing,
  currentIdx,
  onJump,
  onRestore,
  dismiss,
}: {
  briefing: Briefing;
  currentIdx: number;
  onJump: (idx: number) => void;
  onRestore: (idx: number) => Promise<void>;
  dismiss: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getRosterStyles(theme), [theme]);
  const [restoring, setRestoring] = useState<number | null>(null);

  const handleRestore = async (idx: number) => {
    setRestoring(idx);
    try {
      await onRestore(idx);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <View style={styles.body}>
      <Text style={styles.title}>ხელმოწერების სია</Text>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 8 }}>
        {briefing.participants.map((p, idx) => {
          const status = statusOf(p, idx, currentIdx);
          return (
            <Pressable
              key={`${p.name}-${idx}`}
              onPress={() => onJump(idx)}
              style={({ pressed }) => [
                styles.row,
                status === 'current' && styles.rowCurrent,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.rowIcon}>
                {status === 'signed' && (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />
                )}
                {status === 'current' && (
                  <Ionicons name="ellipse" size={22} color={theme.colors.accent} />
                )}
                {status === 'skipped' && (
                  <Ionicons name="remove-circle-outline" size={22} color={theme.colors.inkSoft} />
                )}
                {status === 'pending' && (
                  <Ionicons name="ellipse-outline" size={22} color={theme.colors.inkSoft} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.rowStatus}>
                  {status === 'signed' && 'მოწერილია'}
                  {status === 'current' && 'ახლა აწერს'}
                  {status === 'skipped' && 'გამოტოვებული'}
                  {status === 'pending' && 'სასურველია'}
                </Text>
              </View>
              {status === 'skipped' && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRestore(idx);
                  }}
                  hitSlop={8}
                  style={styles.restoreBtn}
                  disabled={restoring === idx}
                >
                  <Text style={styles.restoreBtnText}>
                    {restoring === idx ? '...' : 'აღდგენა'}
                  </Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable onPress={dismiss} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>დახურვა</Text>
      </Pressable>
    </View>
  );
}

function getRosterStyles(theme: any) {
  return StyleSheet.create({
    body: {
      backgroundColor: theme.colors.white,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    rowCurrent: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    rowIcon: {
      width: 24,
      alignItems: 'center',
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    rowStatus: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      marginTop: 2,
    },
    restoreBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    restoreBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    closeBtn: {
      marginTop: 8,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    closeBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.ink,
    },
  });
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
    eyebrowCenter: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      textAlign: 'center',
      marginTop: 8,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cancelBtn: {
      padding: 4,
    },
    statusPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    statusGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statusNum: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    progressTrack: {
      height: 4,
      backgroundColor: theme.colors.hairline,
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 4,
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
      marginTop: 2,
    },
    promptText: {
      fontSize: 13,
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
      gap: 8,
      padding: 16,
      paddingTop: 14,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    skipBtn: {
      paddingHorizontal: 14,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    skipBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    interstitial: {
      flex: 1,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    interstitialTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    interstitialBody: {
      fontSize: 14,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      marginBottom: 16,
    },
    interstitialActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
  });
}
