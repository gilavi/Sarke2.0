import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';
import { useTheme } from '../../../lib/theme';
import { SkeletonListCard } from '../../../components/Skeleton';
import { a11y } from '../../../lib/accessibility';

export default function BriefingSignScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useBriefingSigning(id);
  // Enabled confirm button + on-press signature error (see useSubmitGuard).
  const { attempted, guard, reset: resetAttempted } = useSubmitGuard();
  // The canvas remounts per signer (and on the inspector transition); clear the
  // error reveal so it doesn't leak from one signer to the next.
  useEffect(() => { resetAttempted(); }, [s.currentIdx, s.phase, resetAttempted]);

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
      flowTitle={t('briefings.flowTitle')}
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
            {t('briefings.skippedCountLabel', { count: s.skippedCount })}
          </Text>
          <Text style={styles.interstitialBody}>
            {t('briefings.skippedInterstitialBody')}
          </Text>
          <View style={styles.interstitialActions}>
            <Button
              title={t('briefings.backToSkipped')}
              variant="secondary"
              size="lg"
              onPress={s.goToFirstSkipped}
              style={{ flex: 1 }}
            />
            <Button
              title={t('briefings.continueButton')}
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
          eyebrow={t('briefings.inspectorEyebrow')}
          name={s.briefing.inspectorName || t('briefings.inspectorFallbackName')}
          caption={t('briefings.inspectorSignPrompt')}
          canvasKey="inspector"
          canvasRef={s.canvasRef}
          hasStroke={s.hasStroke}
          onBegin={s.onStroke}
          onEnd={s.onStroke}
          onOK={s.handleOK}
        />
        {attempted && !s.hasStroke && (
          <Text style={styles.signatureError}>{t('briefings.signError')}</Text>
        )}
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          {s.hasStroke && (
            <Pressable onPress={s.handleClear} style={styles.skipBtn} {...a11y(t('briefings.clearBtn'), t('briefings.clearBtnA11y'), 'button')}>
              <RefreshCw size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
              <Text style={styles.skipBtnText}>{t('briefings.clearBtn')}</Text>
            </Pressable>
          )}
          <Button
            title={s.saving ? t('briefings.loadingLabel') : t('briefings.completeAndPdf')}
            size="lg"
            onPress={() => guard(s.hasStroke, s.handleConfirm)}
            disabled={s.saving}
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
        eyebrow={t('briefings.workerEyebrow')}
        name={s.workerName}
        caption={`${s.currentIdx + 1} / ${s.totalWorkers}${s.alreadySigned ? ` · ${t('briefings.alreadySigned')}` : ''}`}
        canvasKey={s.currentIdx}
        canvasRef={s.canvasRef}
        hasStroke={s.hasStroke}
        onBegin={s.onStroke}
        onEnd={s.onStroke}
        onOK={s.handleOK}
      />
      {attempted && !s.hasStroke && (
        <Text style={styles.signatureError}>{t('briefings.signError')}</Text>
      )}
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          onPress={s.handleClear}
          disabled={!s.hasStroke}
          style={[styles.iconBtn, !s.hasStroke && { opacity: 0.3 }]}
          {...a11y(t('briefings.clearBtn'), t('briefings.clearBtnA11y'), 'button')}
        >
          <RefreshCw size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
        </Pressable>
        <Pressable
          onPress={s.handleSkip}
          disabled={s.saving}
          style={[styles.skipBtn, s.saving && { opacity: 0.3 }]}
          {...a11y(t('briefings.skipAction'), t('briefings.skipWorkerTitle'), 'button')}
        >
          <Text style={styles.skipBtnText}>{t('briefings.skipAction')}</Text>
        </Pressable>
        <Button
          title={s.saving ? t('briefings.savingLabel') : t('briefings.confirmButton')}
          size="lg"
          onPress={() => guard(s.hasStroke, s.handleConfirm)}
          disabled={s.saving}
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
    signatureError: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.danger,
      textAlign: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
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
