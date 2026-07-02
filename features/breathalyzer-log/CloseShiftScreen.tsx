import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { CircleCheck, Pencil } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button, Screen } from '../../components/ui';
import { FlowHeader } from '../../components/FlowHeader';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import { a11y } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { qk, useBreathalyzerLog, useProject } from '../../lib/apiHooks';
import { saveRecordThroughOutbox } from '../../lib/outbox';
import { buildBreathalizerLogPdfHtml } from '../../lib/breathalyzerLogPdf';
import { generateAndSharePdf } from '../../lib/pdfOpen';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import type { BreathalizerLog } from '../../types/breathalyzerLog';

import { getStyles } from './styles';
import { SummaryStats } from './SummaryStats';

/** Full-screen close-shift: summary + responsible person + signature → PDF. */
export function CloseShiftScreen({ projectId, logId }: { projectId: string; logId: string }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const keyboardOpen = useKeyboardState(s => s.isVisible);

  const logQ = useBreathalyzerLog(logId);
  const log = logQ.data ?? null;
  const project = useProject(projectId).data;

  const { attempted, guard } = useSubmitGuard();
  const [name, setName] = useState('');
  const [sig, setSig] = useState<string | null>(null);
  const [showSig, setShowSig] = useState(false);
  const [closing, setClosing] = useState(false);

  const finish = () =>
    guard(!!name.trim(), async () => {
      if (!log) return;
      setClosing(true);
      try {
        const responsiblePerson = { name: name.trim(), signature: sig };
        const html = await buildBreathalizerLogPdfHtml({
          log: { ...log, responsiblePerson },
          projectName: project?.name ?? project?.company_name ?? t('common.project'),
          companyName: project?.company_name ?? '',
        });
        // The PDF is local-only (expo-print → share sheet); pdf_uri is always
        // written as null in this flow, so no storage upload to stage.
        const optimistic: BreathalizerLog = {
          ...log,
          responsiblePerson,
          status: 'closed',
          pdfUri: null,
          updatedAt: new Date().toISOString(),
        };
        const res = await saveRecordThroughOutbox({
          entity: 'breathalyzer_log',
          mode: 'update',
          recordId: log.id,
          payload: { close: { responsiblePerson, pdfUri: null } },
          displayTitle: 'ალკოტესტის ჟურნალი',
          projectId,
          detailKey: qk.breathalyzerLog.byId(log.id),
          optimistic,
        });
        if (res.queued) {
          // The log screen reads today's log via byDate — mirror the seeded
          // byId model there so the log shows as closed offline.
          qc.setQueryData(qk.breathalyzerLog.byDate(projectId, log.date), optimistic);
        } else {
          qc.invalidateQueries({ queryKey: qk.breathalyzerLog.byId(log.id) });
          qc.invalidateQueries({ queryKey: qk.breathalyzerLog.byDate(projectId, log.date) });
        }
        qc.invalidateQueries({ queryKey: qk.breathalyzerLog.byProject(projectId) });
        haptic.pdfGenerated();
        toast.success(
          res.queued ? t('components.savedOffline') : t('breathalyzer.shiftComplete'),
        );
        await generateAndSharePdf(html, `alkotest-${log.date}.pdf`, undefined);
        router.back();
      } catch {
        toast.error(t('breathalyzer.error'));
      } finally {
        setClosing(false);
      }
    });

  return (
    <Screen edgeToEdge edges={[]} style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlowHeader
        flowTitle={t('breathalyzer.shiftEnd')}
        project={project ? { name: project.name } : null}
        leading="back"
        trailing="close"
        onBack={() => router.back()}
        onClose={() => router.back()}
      />

      {!log ? (
        <View style={styles.center}>
          {logQ.fetchStatus === 'paused' && !logQ.isFetched ? (
            <Text style={styles.emptyTitle}>{t('components.offlineEmptyTitle')}</Text>
          ) : logQ.isFetched ? (
            <Text style={styles.emptyTitle}>{t('breathalyzer.entryNotFound')}</Text>
          ) : (
            <ActivityIndicator color={theme.colors.inkSoft} />
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <KeyboardAwareScrollView
            style={styles.stepScroll}
            contentContainerStyle={styles.stepScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bottomOffset={120}
          >
            <SummaryStats entries={log.entries} />

            <FloatingLabelInput
              label={t('breathalyzer.responsiblePerson')}
              required
              value={name}
              onChangeText={setName}
              error={attempted && !name.trim() ? t('errors.requiredField') : undefined}
            />

            <Pressable
              onPress={() => setShowSig(true)}
              style={[styles.sigPlaceholder, sig ? styles.sigPlaceholderDone : null]}
              {...a11y(t('breathalyzer.stepSignature'), t('a11y.saveSignatureHint'), 'button')}
            >
              {sig ? (
                <View style={styles.sigDone}>
                  <CircleCheck size={28} color={theme.colors.ink} strokeWidth={1.5} />
                  <Text style={styles.sigDoneText}>{t('breathalyzer.sigSaved')}</Text>
                </View>
              ) : (
                <View style={styles.sigDone}>
                  <Pencil size={28} color={theme.colors.inkSoft} strokeWidth={1.5} />
                  <Text style={styles.sigHintText}>{t('breathalyzer.tapToSign')}</Text>
                </View>
              )}
            </Pressable>
          </KeyboardAwareScrollView>

          <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
            <View
              style={[
                styles.footer,
                keyboardOpen ? { paddingBottom: 10 } : { paddingBottom: insets.bottom + 12 },
              ]}
            >
              <Button
                title={t('breathalyzer.finishAndPdf')}
                size="lg"
                loading={closing}
                onPress={finish}
                style={{ alignSelf: 'stretch' }}
              />
            </View>
          </KeyboardStickyView>
        </View>
      )}

      <SignatureCanvas
        visible={showSig}
        personName={name}
        onCancel={() => setShowSig(false)}
        onConfirm={b64 => {
          setShowSig(false);
          setSig(b64);
        }}
      />
    </Screen>
  );
}
