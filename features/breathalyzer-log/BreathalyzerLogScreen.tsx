import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { BookOpen, Plus, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonListCard } from '../../components/Skeleton';
import { OfflineEmptyState } from '../../components/OfflineEmptyState';
import { useListLoadState } from '../../hooks/useListLoadState';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { haptic } from '../../lib/haptics';
import {
  qk,
  useBreathalyzerLog,
  useBreathalyzerLogByDate,
  useProject,
} from '../../lib/apiHooks';
import { saveRecordThroughOutbox } from '../../lib/outbox';
import { buildBreathalizerLogPdfHtml } from '../../lib/breathalyzerLogPdf';
import { generateAndSharePdf } from '../../lib/pdfOpen';
import { formatBlDate, type BreathalizerLog } from '../../types/breathalyzerLog';

import { getStyles } from './styles';
import { EntryRow } from './EntryRow';
import { pendingRepeatEntry, todayISO } from './breathalyzerSchema';

/**
 * Project breathalyzer log: today's register (or a historical one via `logId`).
 * Orchestration only — the add-test + close-shift flows are pushed routes.
 */
export function BreathalyzerLogScreen({
  projectId,
  logId,
}: {
  projectId: string;
  logId?: string;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const today = todayISO();
  const isHistorical = !!logId;
  const project = useProject(projectId).data;

  // Exactly one query is enabled (the other gets an undefined id → disabled).
  const byIdQ = useBreathalyzerLog(logId);
  const byDateQ = useBreathalyzerLogByDate(isHistorical ? undefined : projectId, today);
  const logQ = isHistorical ? byIdQ : byDateQ;
  const log = logQ.data ?? null;

  // Canonical offline-aware guard (hooks/useListLoadState); the "list" here is
  // the single log row, so the count is 0 or 1.
  const loadState = useListLoadState(logQ, log ? 1 : 0);

  const [serial, setSerial] = useState('');
  useEffect(() => {
    setSerial(log?.deviceSerialNumber ?? '');
  }, [log?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isReadOnly = log?.status === 'closed';
  const isTodayLog = !isHistorical || log?.date === today;
  const pendingRepeat = !isReadOnly ? pendingRepeatEntry(log) : null;

  const invalidateActive = () => {
    qc.invalidateQueries({
      queryKey: isHistorical
        ? qk.breathalyzerLog.byId(logId!)
        : qk.breathalyzerLog.byDate(projectId, today),
    });
    qc.invalidateQueries({ queryKey: qk.breathalyzerLog.byProject(projectId) });
  };

  const startLog = async () => {
    try {
      const id = Crypto.randomUUID();
      const now = new Date().toISOString();
      const optimistic: BreathalizerLog = {
        id,
        projectId,
        date: today,
        deviceSerialNumber: null,
        entries: [],
        responsiblePerson: { name: '', signature: null },
        status: 'open',
        pdfUri: null,
        createdAt: now,
        updatedAt: now,
      };
      const res = await saveRecordThroughOutbox({
        entity: 'breathalyzer_log',
        mode: 'create',
        recordId: id,
        payload: { projectId, date: today, id },
        displayTitle: 'ალკოტესტის ჟურნალი',
        projectId,
        detailKey: qk.breathalyzerLog.byId(id),
        optimistic,
      });
      if (res.queued) {
        // This screen finds today's log via byDate — seed it so the queued
        // log renders without a network fetch. The post-flush
        // invalidateRecordLists swaps in the real row once it lands.
        qc.setQueryData(qk.breathalyzerLog.byDate(projectId, today), optimistic);
        toast.success(t('components.savedOffline'));
      } else {
        qc.invalidateQueries({ queryKey: qk.breathalyzerLog.byDate(projectId, today) });
      }
      qc.invalidateQueries({ queryKey: qk.breathalyzerLog.byProject(projectId) });
      haptic.success();
    } catch {
      toast.error(t('breathalyzer.createFailed'));
    }
  };

  const saveSerial = async () => {
    if (!log) return;
    const trimmed = serial.trim() || null;
    if (trimmed === (log.deviceSerialNumber ?? null)) return;
    try {
      const optimistic: BreathalizerLog = {
        ...log,
        deviceSerialNumber: trimmed,
        updatedAt: new Date().toISOString(),
      };
      const res = await saveRecordThroughOutbox({
        entity: 'breathalyzer_log',
        mode: 'update',
        recordId: log.id,
        payload: { deviceSerialNumber: trimmed },
        displayTitle: 'ალკოტესტის ჟურნალი',
        projectId,
        detailKey: qk.breathalyzerLog.byId(log.id),
        optimistic,
      });
      if (res.queued) {
        // Keep the active byDate cache coherent with the queued patch
        // (detailKey already seeded byId); silent — a blur-save, not an
        // explicit user action.
        qc.setQueryData(qk.breathalyzerLog.byDate(projectId, log.date), optimistic);
      } else {
        invalidateActive();
      }
    } catch {
      /* non-fatal */
    }
  };

  const sharePdf = async () => {
    if (!log) return;
    try {
      const html = await buildBreathalizerLogPdfHtml({
        log,
        projectName: project?.name ?? project?.company_name ?? t('common.project'),
        companyName: project?.company_name ?? '',
      });
      await generateAndSharePdf(html, `alkotest-${log.date}.pdf`, undefined);
      haptic.pdfGenerated();
    } catch {
      toast.error(t('breathalyzer.pdfFailed'));
    }
  };

  const base = `/projects/${projectId}/logs/breathalyzer`;
  const goAdd = (repeatForId?: string) =>
    router.push(
      `${base}/add?logId=${log!.id}${repeatForId ? `&repeatForId=${repeatForId}` : ''}` as any,
    );
  const goClose = () => router.push(`${base}/close?logId=${log!.id}` as any);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('breathalyzer.title')}
        right={
          isReadOnly ? (
            <View style={styles.closedBadge}>
              <Text style={styles.closedBadgeText}>{t('breathalyzer.closedBadge')}</Text>
            </View>
          ) : undefined
        }
      />

      {loadState === 'skeleton' ? (
        <View style={{ padding: 16 }}>
          <SkeletonListCard rows={5} />
        </View>
      ) : loadState === 'offline' ? (
        <OfflineEmptyState compact />
      ) : !log ? (
        <View style={styles.center}>
          <BookOpen size={52} color={theme.colors.borderStrong} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>
            {isTodayLog ? t('breathalyzer.noEntryToday') : t('breathalyzer.entryNotFound')}
          </Text>
          {isTodayLog ? (
            <Button title={t('breathalyzer.startEntry')} size="lg" onPress={startLog} />
          ) : null}
        </View>
      ) : (
        <>
          <View style={styles.infoBar}>
            <Text style={styles.infoDate}>{formatBlDate(log.date)}</Text>
            <FloatingLabelInput
              label={t('breathalyzer.deviceSerial')}
              value={serial}
              onChangeText={setSerial}
              onBlur={saveSerial}
              editable={!isReadOnly}
              returnKeyType="done"
              onSubmitEditing={saveSerial}
            />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            {log.entries.length === 0 ? (
              <View style={styles.emptyEntries}>
                <Text style={styles.emptyEntriesText}>{t('breathalyzer.noEntry')}</Text>
              </View>
            ) : (
              log.entries.map((entry, idx) => <EntryRow key={entry.id} entry={entry} index={idx} />)
            )}

            {pendingRepeat ? (
              <View style={styles.repeatCard}>
                <BookOpen size={20} color={theme.colors.ink} strokeWidth={1.5} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.repeatCardTitle}>{t('breathalyzer.personDenied')}</Text>
                  <Text style={styles.repeatCardSub}>{t('breathalyzer.repeatTest')}</Text>
                </View>
                <Button
                  title={t('breathalyzer.repeatTestCard')}
                  variant="outline"
                  size="sm"
                  onPress={() => goAdd(pendingRepeat.id)}
                />
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
            {isReadOnly ? (
              <Button
                title={t('breathalyzer.pdfShare')}
                leftIcon={Share2}
                size="lg"
                onPress={sharePdf}
                style={{ alignSelf: 'stretch' }}
              />
            ) : (
              <>
                {log.entries.length > 0 ? (
                  <Button
                    title={t('breathalyzer.shiftEnd')}
                    variant="outline"
                    size="lg"
                    onPress={goClose}
                    style={{ alignSelf: 'stretch' }}
                  />
                ) : null}
                <Button
                  title={t('breathalyzer.addEntry')}
                  leftIcon={Plus}
                  size="lg"
                  onPress={() => goAdd()}
                  style={{ alignSelf: 'stretch' }}
                />
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}
