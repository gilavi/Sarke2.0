import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Stack, useLocalSearchParams } from 'expo-router';
import { CircleAlert, RefreshCw } from 'lucide-react-native';
import { Button } from '../../../components/ui';
import { FlowHeader } from '../../../components/FlowHeader';
import { ChipNavStrip } from '../../../components/inspection-parts/ChipNavStrip';
import { SignatureStage } from '../../../components/briefings/SignatureStage';
import { useBriefingSigning } from '../../../components/briefings/useBriefingSigning';
import { useTheme } from '../../../lib/theme';
import { SkeletonListCard } from '../../../components/Skeleton';
import { a11y } from '../../../lib/accessibility';

export default function BriefingSignScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useBriefingSigning(id);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (s.phase === 'loading' || !s.briefing) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <View style={{ padding: 16, paddingTop: insets.top + 24 }}>
          <SkeletonListCard rows={4} />
        </View>
      </View>
    );
  }

  const header = (
    <FlowHeader
      flowTitle="ინსტრუქტაჟი"
      project={s.project}
      step={3}
      totalSteps={3}
      leading="back"
      trailing="close"
      onBack={s.handleBack}
      backDisabled={s.backDisabled}
      onClose={s.onCancel}
      confirmExit
      surfaceColor={theme.colors.surface}
    />
  );

  const chipStrip = (
    <ChipNavStrip
      items={s.signerChips}
      activeIndex={s.activeChipIndex}
      onSelect={s.handleChipSelect}
      tone="neutral"
      dotMode="check"
    />
  );

  // ── Interstitial: skipped workers remain after all pending handled ──────────
  if (s.phase === 'interstitial') {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        {header}
        {chipStrip}
        <View style={styles.interstitial}>
          <CircleAlert size={48} color={theme.colors.ink} strokeWidth={1.5} />
          <Text style={styles.interstitialTitle}>
            {s.skippedCount} მუშაკი გამოტოვებული
          </Text>
          <Text style={styles.interstitialBody}>
            შეგიძლიათ დაუბრუნდეთ მათ ან გააგრძელოთ ინსპექტორის ხელმოწერაზე.
          </Text>
          <View style={styles.interstitialActions}>
            <Button
              title="გამოტოვებულზე დაბრუნება"
              variant="secondary"
              size="lg"
              onPress={s.goToFirstSkipped}
              style={{ flex: 1 }}
            />
            <Button
              title="გააგრძელე →"
              size="lg"
              onPress={s.continueFromInterstitial}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    );
  }

  // ── Inspector phase ─────────────────────────────────────────────────────────
  if (s.phase === 'inspector') {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        {header}
        {chipStrip}
        <SignatureStage
          eyebrow="ინსპექტორის ხელმოწერა"
          name={s.briefing.inspectorName || 'ინსპექტორი'}
          caption="გთხოვთ მოაწეროთ ხელი"
          canvasKey="inspector"
          canvasRef={s.canvasRef}
          hasStroke={s.hasStroke}
          onBegin={s.onStroke}
          onEnd={s.onStroke}
          onOK={s.handleOK}
        />
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          {s.hasStroke && (
            <Pressable onPress={s.handleClear} style={styles.skipBtn} {...a11y('გასუფთავება', 'ხელმოწერის გასუფთავება', 'button')}>
              <RefreshCw size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
              <Text style={styles.skipBtnText}>გასუფთავება</Text>
            </Pressable>
          )}
          <Button
            title={s.saving ? 'იტვირთება...' : 'დასრულება და PDF გენერირება'}
            size="lg"
            onPress={s.handleConfirm}
            disabled={!s.hasStroke || s.saving}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    );
  }

  // ── Worker signing phase ─────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      {header}
      {chipStrip}
      <SignatureStage
        eyebrow="ხელს აწერს"
        name={s.workerName}
        caption={`${s.currentIdx + 1} / ${s.totalWorkers}${s.alreadySigned ? ' · უკვე მოწერილია - გადაწერა' : ''}`}
        canvasKey={s.currentIdx}
        canvasRef={s.canvasRef}
        hasStroke={s.hasStroke}
        onBegin={s.onStroke}
        onEnd={s.onStroke}
        onOK={s.handleOK}
      />
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          onPress={s.handleClear}
          disabled={!s.hasStroke}
          style={[styles.iconBtn, !s.hasStroke && { opacity: 0.3 }]}
          {...a11y('გასუფთავება', 'ხელმოწერის გასუფთავება', 'button')}
        >
          <RefreshCw size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
        </Pressable>
        <Pressable
          onPress={s.handleSkip}
          disabled={s.saving}
          style={[styles.skipBtn, s.saving && { opacity: 0.3 }]}
          {...a11y('გამოტოვება', 'ამ მუშაკის გამოტოვება', 'button')}
        >
          <Text style={styles.skipBtnText}>გამოტოვება</Text>
        </Pressable>
        <Button
          title={s.saving ? 'ინახება...' : 'დადასტურება →'}
          size="lg"
          onPress={s.handleConfirm}
          disabled={!s.hasStroke || s.saving}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function getstyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.card,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 12,
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 14,
      height: 40,
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
