import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Keyboard,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { DateTimeField } from '../../components/DateTimeField';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { ChevronRight } from 'lucide-react-native';
import { Button } from '../../components/ui';
import { FlowHeader } from '../../components/FlowHeader';
import { FlowProjectPicker } from '../../components/FlowProjectPicker';
import { TopicSelector } from '../../components/briefings/TopicSelector';
import { ParticipantsStep } from '../../components/briefings/ParticipantsStep';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { useSession } from '../../lib/session';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { briefingsApi } from '../../lib/briefingsApi';
import { queryClient } from '../../lib/queryClient';
import { invalidateRecordLists, qk } from '../../lib/apiHooks';
import { cachedRead } from '../../lib/cachedRead';
import { saveRecordThroughOutbox } from '../../lib/outbox';
import { projectsApi } from '../../lib/services';
import type { Briefing, BriefingParticipant, Project } from '../../types/models';

export default function NewBriefingScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { projectId: paramProjectId, editId } = useLocalSearchParams<{ projectId?: string; editId?: string }>();
  const router = useRouter();
  const session = useSession();
  const toast = useToast();

  // Stable record id for the whole flow: the reopened draft's id in edit mode,
  // a client-generated uuid otherwise (lets an offline create queue + coalesce).
  const briefingId = useRef(editId ?? Crypto.randomUUID()).current;

  // ── Project (for header context) ──
  const [pickedProject, setPickedProject] = useState<Project | null>(null);
  const projectId = paramProjectId ?? pickedProject?.id;
  const [project, setProject] = useState<Project | null>(null);
  useEffect(() => {
    if (!projectId || project) return;
    let mounted = true;
    cachedRead(qk.projects.byId(projectId), () => projectsApi.getById(projectId))
      .then(p => { if (mounted) setProject(p); })
      .catch(() => null);
    return () => { mounted = false; };
  }, [projectId, project]);

  // ── Wizard step (1 = topics, 2 = participants; signing is the next route) ──
  const [step, setStep] = useState<1 | 2>(1);
  // Enabled forward button + on-press control errors (see useSubmitGuard).
  const { attempted, guard, reset: resetAttempted } = useSubmitGuard();

  // ── Form state ──
  const [dateTime, setDateTime] = useState(() => new Date());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [customTopic, setCustomTopic] = useState('');
  const [participants, setParticipants] = useState<BriefingParticipant[]>([]);
  const [busy, setBusy] = useState(false);

  // Edit mode: hydrate from the (reopened) briefing. Topics stored as raw keys
  // with `custom:<text>` for the free-text one — reverse that into the Set + input.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!editId || hydratedRef.current) return;
    hydratedRef.current = true;
    let mounted = true;
    (async () => {
      try {
        const b = await cachedRead(qk.briefings.byId(editId), () => briefingsApi.getById(editId));
        if (!b || !mounted) return;
        const topicSet = new Set<string>();
        let custom = '';
        for (const key of b.topics) {
          if (key.startsWith('custom:')) { custom = key.slice('custom:'.length); topicSet.add('other'); }
          else topicSet.add(key);
        }
        setDateTime(b.dateTime ? new Date(b.dateTime) : new Date());
        setSelectedTopics(topicSet);
        setCustomTopic(custom);
        setParticipants(b.participants ?? []);
      } catch {
        // best-effort: leave the blank form if hydration fails
      }
    })();
    return () => { mounted = false; };
  }, [editId]);

  // ── Inspector name from session ──
  const inspectorName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    if (u) return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
    return session.state.session.user.email ?? '';
  }, [session.state]);

  const toggleTopic = (key: string) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addParticipant = (name: string) => {
    setParticipants(prev => [...prev, { name, signature: null }]);
  };

  const removeParticipant = (idx: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== idx));
  };

  const builtTopics = useMemo(() => {
    const result: string[] = [];
    for (const key of selectedTopics) {
      if (key === 'other') {
        const ct = customTopic.trim();
        if (ct) result.push(`custom:${ct}`);
      } else {
        result.push(key);
      }
    }
    return result;
  }, [selectedTopics, customTopic]);

  const hasTopics = builtTopics.length > 0;
  const canStart = participants.length >= 1 && hasTopics;
  const hasAnyData =
    participants.length > 0 || selectedTopics.size > 0 || customTopic.trim().length > 0;

  const onStart = useCallback(async () => {
    if (!projectId || !canStart) return;
    setBusy(true);
    try {
      const nowIso = new Date().toISOString();
      const optimistic: Briefing = {
        id: briefingId,
        projectId,
        dateTime: dateTime.toISOString(),
        topics: builtTopics,
        participants,
        inspectorSignature: null,
        inspectorName,
        status: 'draft',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      // Edit mode updates the reopened draft in place; signing re-completes it.
      // Offline the save queues and the signing screen reads the seeded cache.
      const res = await saveRecordThroughOutbox({
        entity: 'briefing',
        mode: editId ? 'update' : 'create',
        recordId: briefingId,
        payload: editId
          ? {
              dateTime: dateTime.toISOString(),
              topics: builtTopics,
              participants,
              inspectorName,
            }
          : {
              id: briefingId,
              projectId,
              dateTime: dateTime.toISOString(),
              topics: builtTopics,
              participants,
              inspectorName,
            },
        displayTitle: 'ინსტრუქტაჟი',
        projectId,
        detailKey: qk.briefings.byId(briefingId),
        optimistic,
      });
      if (res.queued) toast.success(t('components.savedOffline'));
      invalidateRecordLists(queryClient);
      router.replace(`/briefings/${briefingId}/sign` as any);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert(t('common.error'), `${t('briefings.createFailed')}\n\n${msg}`);
    } finally {
      setBusy(false);
    }
  }, [projectId, dateTime, participants, builtTopics, inspectorName, canStart, router, editId, briefingId, toast, t]);

  const onBack = useCallback(() => {
    if (step === 2) setStep(1);
    else router.back();
  }, [step, router]);

  // Clear the error reveal whenever the step changes.
  useEffect(() => { resetAttempted(); }, [step, resetAttempted]);

  // Launched from Home without a project - pick one as the first full-screen step.
  if (!projectId) {
    return (
      <FlowProjectPicker
        flowTitle={t('briefings.flowTitle')}
        action="briefing"
        onBack={() => router.back()}
        onPicked={(p) => { setPickedProject(p); setProject(p); }}
      />
    );
  }

  return (
    <View style={styles.root}>
      {/* Swipe-back would bypass the exit confirmation and discard the form —
          disable it while there is anything to lose (hardware back is handled
          by FlowHeader). */}
      <Stack.Screen options={{ headerShown: false, gestureEnabled: !hasAnyData }} />

      {/* Nothing is persisted before onStart creates the draft row, so the
          exit dialog uses the honest discard copy (default body). */}
      <FlowHeader
        flowTitle={t('briefings.flowTitle')}
        project={project}
        step={step}
        totalSteps={3}
        leading="back"
        trailing="close"
        onBack={onBack}
        onClose={() => router.back()}
        confirmExit={hasAnyData}
        backIsExit={step === 1}
        exitCopy={{ body: t('wizard.exitBodyDiscard') }}
        surfaceColor={theme.colors.surface}
      />

      <KeyboardSafeArea contentStyle={{ padding: 16, gap: 20 }}>
        {step === 1 ? (
          <>
            {/* ── Date & Time ── */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{t('briefings.dateTimeSection')}</Text>
              <DateTimeField
                value={dateTime}
                onChange={d => { Keyboard.dismiss(); setDateTime(d); }}
                mode="datetime"
              />
            </View>

            {/* ── Topics ── */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{t('briefings.topicSection')}</Text>
              <Text style={styles.sectionHint}>{t('briefings.topicHint')}</Text>
              <TopicSelector
                selectedTopics={selectedTopics}
                onToggle={toggleTopic}
                customTopic={customTopic}
                onChangeCustomTopic={setCustomTopic}
              />
              {attempted && !hasTopics && (
                <Text style={styles.controlError}>{t('briefings.topicRequired')}</Text>
              )}
            </View>
          </>
        ) : (
          /* ── Participants ── */
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>{t('briefings.participantsSection')}</Text>
              {participants.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{participants.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionHint}>{t('briefings.participantHint')}</Text>
            <ParticipantsStep
              participants={participants}
              onAdd={addParticipant}
              onRemove={removeParticipant}
            />
            {attempted && !canStart && (
              <Text style={styles.controlError}>{t('briefings.participantRequired')}</Text>
            )}
          </View>
        )}
      </KeyboardSafeArea>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          {step === 1 ? (
            <Button
              title={t('common.next')}
              size="lg"
              rightIcon={ChevronRight}
              onPress={() => guard(hasTopics, () => setStep(2))}
              style={{ width: '100%' }}
            />
          ) : (
            <Button
              title={t('briefings.startButton')}
              size="lg"
              onPress={() => guard(canStart, onStart)}
              loading={busy}
              style={{ width: '100%' }}
            />
          )}
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.card,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    sectionHint: {
      fontSize: 12,
      color: theme.colors.inkFaint,
      marginTop: -6,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    countBadge: {
      backgroundColor: theme.colors.subtleSurface,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.inkSoft,
    },
    footer: {
      paddingTop: 12,
      gap: 8,
    },
    controlError: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.danger,
      marginTop: 2,
    },
  });
}
