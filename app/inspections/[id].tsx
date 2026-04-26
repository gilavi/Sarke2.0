// Inspection detail screen.
//
// Lands here when the user taps a completed inspection from history, the
// home recents list, or the inspection-end fork screen's "save inspection"
// CTA. Shows inspection metadata + its attached certificates, and offers
// a CTA to generate another certificate from the same inspection.
//
// Draft inspections still route through `/inspections/[id]/wizard`.
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Screen, SectionHeader } from '../../components/ui';
import { Skeleton, SkeletonCard, SkeletonListCard } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { AddRemoteSignerModal, type AddRemoteSignerResult } from '../../components/AddRemoteSignerModal';
import {
  answersApi,
  certificatesApi,
  inspectionsApi,
  projectsApi,
  remoteSigningApi,
  templatesApi,
} from '../../lib/services';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errorMap';
import { scheduleDelete } from '../../lib/pendingDeletes';
import { haptic } from '../../lib/haptics';
// openSigningSMS kept in lib/sms.ts as fallback; Twilio edge fn used instead.
import { theme } from '../../lib/theme';
import type {
  Answer,
  Certificate,
  Inspection,
  Project,
  Question,
  RemoteSigningRequest,
  RemoteSigningStatus,
  Template,
} from '../../types/models';
import { SIGNER_ROLE_LABEL } from '../../types/models';

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [notFound, setNotFound] = useState(false);
  const [remoteRequests, setRemoteRequests] = useState<RemoteSigningRequest[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const insp = await inspectionsApi.getById(id);
      if (!insp) {
        setNotFound(true);
        return;
      }
      setInspection(insp);
      // If this is still a draft, bounce into the wizard — the detail view
      // only makes sense once the inspection is immutable. The wizard does
      // NOT mirror this redirect, so we won't ping-pong: even when a queued
      // local "complete this" patch is sitting in storage, the wizard now
      // ignores its `status` field and trusts the server's row.
      if (insp.status === 'draft') {
        router.push(`/inspections/${insp.id}/wizard` as any);
        return;
      }
      const [tpl, proj, cs, rsrs] = await Promise.all([
        templatesApi.getById(insp.template_id).catch(() => null),
        projectsApi.getById(insp.project_id).catch(() => null),
        certificatesApi.listByInspection(insp.id).catch(() => [] as Certificate[]),
        remoteSigningApi.listByInspection(insp.id).catch(() => [] as RemoteSigningRequest[]),
      ]);
      setTemplate(tpl);
      setProject(proj);
      setCerts(cs);
      setRemoteRequests(rsrs);
      // Load questions + answers so we can show what was filled in
      if (tpl) {
        const [qs, ans] = await Promise.all([
          templatesApi.questions(tpl.id).catch(() => [] as Question[]),
          answersApi.list(insp.id).catch(() => [] as Answer[]),
        ]);
        setQuestions(qs);
        setAnswers(ans);
      }
    } catch (e) {
      setLoadError(e);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openCertPreview = (cert: Certificate) => {
    router.push(`/certificates/${cert.id}` as any);
  };

  const deleteCert = (cert: Certificate) => {
    haptic.warn();
    setCerts(prev => prev.filter(c => c.id !== cert.id));
    scheduleDelete({
      message: 'PDF რეპორტი წაიშალა',
      toast,
      onUndo: () => setCerts(prev => [cert, ...prev.filter(c => c.id !== cert.id)]),
      onExecute: async () => {
        try {
          await certificatesApi.remove(cert.id);
          haptic.success();
        } catch (e) {
          setCerts(prev => [cert, ...prev.filter(c => c.id !== cert.id)]);
          toast.error(friendlyError(e));
        }
      },
    });
  };

  const generateNew = () => {
    if (!inspection) return;
    router.push(`/certificates/new?inspectionId=${inspection.id}` as any);
  };

  // ── Remote-signing handlers ──────────────────────────────────────────────

  const handleAddRemoteSigner = async (result: AddRemoteSignerResult) => {
    if (!inspection) return;
    if (certs.length === 0) {
      toast.error('ჯერ დააგენერირე PDF რეპორტი');
      return;
    }
    setAddBusy(true);
    try {
      const row = await remoteSigningApi.create({
        inspectionId: inspection.id,
        signerName: result.signerName,
        signerPhone: result.signerPhone,
        signerRole: result.signerRole,
      });
      // Optimistic insert; refetch on focus reconciles.
      setRemoteRequests(prev => [row, ...prev]);
      setAddOpen(false);
      // Send SMS via Twilio edge function.
      await remoteSigningApi.sendSMS(row.id);
      setRemoteRequests(prev =>
        prev.map(r =>
          r.id === row.id
            ? { ...r, status: 'sent', last_sent_at: new Date().toISOString() }
            : r,
        ),
      );
      haptic.success();
      toast.success('SMS გაიგზავნა');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setAddBusy(false);
    }
  };

  const resendRemote = async (req: RemoteSigningRequest) => {
    try {
      await remoteSigningApi.sendSMS(req.id);
      setRemoteRequests(prev =>
        prev.map(r =>
          r.id === req.id
            ? { ...r, status: 'sent', last_sent_at: new Date().toISOString() }
            : r,
        ),
      );
      haptic.light();
      toast.success('SMS ხელახლა გაიგზავნა');
    } catch (e) {
      toast.error(friendlyError(e));
    }
  };

  const cancelRemote = (req: RemoteSigningRequest) => {
    haptic.warn();
    setRemoteRequests(prev => prev.filter(r => r.id !== req.id));
    scheduleDelete({
      message: 'მოთხოვნა წაიშალა',
      toast,
      onUndo: () => setRemoteRequests(prev => [req, ...prev.filter(r => r.id !== req.id)]),
      onExecute: async () => {
        try {
          await remoteSigningApi.cancel(req.id);
          haptic.success();
        } catch (e) {
          setRemoteRequests(prev => [req, ...prev.filter(r => r.id !== req.id)]);
          toast.error(friendlyError(e));
        }
      },
    });
  };

  if (!loading && (notFound || loadError)) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'ინსპექცია' }} />
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <ErrorState
            title={notFound ? 'ინსპექცია ვერ მოიძებნა' : 'ვერ ჩაიტვირთა'}
            error={loadError ?? undefined}
            message={notFound ? 'შესაძლოა წაიშალა ან არ გაქვს წვდომა.' : undefined}
            icon={notFound ? 'alert-circle-outline' : 'cloud-offline-outline'}
            onRetry={notFound ? undefined : () => void load()}
            retrying={loading}
          />
          <View style={{ padding: 16 }}>
            <Button title="მთავარ გვერდზე" variant="ghost" onPress={() => router.replace('/(tabs)/home' as any)} />
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  if (loading || !inspection) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'ინსპექცია' }} />
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <SkeletonCard>
              <Skeleton width={80} height={10} />
              <View style={{ height: 8 }} />
              <Skeleton width={'80%'} height={20} />
              <View style={{ height: 6 }} />
              <Skeleton width={'40%'} height={12} />
              <View style={{ height: 6 }} />
              <Skeleton width={110} height={22} radius={999} />
            </SkeletonCard>
            <SkeletonCard>
              <Skeleton width={70} height={10} />
              <View style={{ height: 8 }} />
              <Skeleton width={'90%'} height={14} />
              <View style={{ height: 4 }} />
              <Skeleton width={'75%'} height={14} />
            </SkeletonCard>
            <SkeletonListCard rows={3} />
          </ScrollView>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'ინსპექცია' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          {/* Document header — title + meta + status badge */}
          <View style={{ gap: 4, paddingBottom: 4 }}>
            <Text style={styles.templateName}>{template?.name ?? 'ინსპექცია'}</Text>
            {project ? (
              <Text style={styles.project}>{project.name}</Text>
            ) : null}
            <Text style={styles.date}>
              {new Date(inspection.completed_at ?? inspection.created_at).toLocaleString('ka')}
            </Text>
            {/* Small inline status pill */}
            <View
              style={[
                styles.statusPill,
                inspection.is_safe_for_use === false
                  ? { backgroundColor: theme.colors.dangerSoft }
                  : { backgroundColor: theme.colors.accentSoft },
              ]}
            >
              <Ionicons
                name={inspection.is_safe_for_use === false ? 'warning' : 'checkmark-circle'}
                size={13}
                color={inspection.is_safe_for_use === false ? theme.colors.danger : theme.colors.accent}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: inspection.is_safe_for_use === false ? theme.colors.danger : theme.colors.accent },
                ]}
                numberOfLines={1}
              >
                {inspection.is_safe_for_use === false
                  ? 'არ არის უსაფრთხო'
                  : 'უსაფრთხოა'}
              </Text>
            </View>
          </View>

          {/* Conclusion */}
          <Card>
            <Text style={styles.eyebrow}>დასკვნა</Text>
            <Text style={{ marginTop: 6, color: theme.colors.ink, lineHeight: 20 }}>
              {inspection.conclusion_text || '—'}
            </Text>
          </Card>

          {/* Inspection scorecard */}
          {questions.length > 0 ? (
            <InspectionScorecard questions={questions} answers={answers} />
          ) : null}

          {/* PDF reports list */}
          <View style={{ marginTop: 4 }}>
            <Text style={styles.sectionTitle}>PDF რეპორტები ({certs.length})</Text>
            {certs.length === 0 ? (
              <Card>
                <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>
                  ამ ინსპექციისთვის ჯერ არ არის დაგენერირებული PDF რეპორტი.
                </Text>
              </Card>
            ) : (
              <FlashList estimatedItemSize={120}
                // Nested-scroll-free: wrapped in the parent ScrollView already.
                scrollEnabled={false}
                data={certs}
                keyExtractor={c => c.id}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item, index }: { item: typeof certs[0]; index: number }) => {
                  const isSafe = item.is_safe_for_use;
                  const params = item.params as {
                    expertName?: string | null;
                    qualTypes?: { type: string; number: string | null }[];
                  };
                  const qualTypes = params?.qualTypes ?? [];
                  const expertName = params?.expertName ?? null;
                  const safeColor = isSafe === false ? theme.colors.danger : theme.colors.accent;
                  const safeBg = isSafe === false ? theme.colors.dangerSoft : theme.colors.accentSoft;
                  const barColor = isSafe === false ? theme.colors.danger : theme.colors.accent;
                  return (
                    <Pressable onPress={() => openCertPreview(item)}>
                      <Card padding={12}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          {/* Thumbnail */}
                          <View style={styles.certThumb}>
                            <View style={[styles.certThumbBar, { backgroundColor: barColor }]} />
                            <View style={styles.certThumbBody}>
                              <Ionicons name="document-text" size={12} color={theme.colors.inkFaint} />
                              <View style={{ gap: 3, marginTop: 5 }}>
                                {(['90%', '65%', '75%', '50%', '70%'] as const).map((w, i) => (
                                  <View key={i} style={[styles.certThumbLine, { width: w, opacity: i > 1 ? 0.5 : 1 }]} />
                                ))}
                              </View>
                            </View>
                          </View>

                          {/* Body */}
                          <View style={{ flex: 1, gap: 3 }}>
                            {/* Title + safety badge — wrap so the Georgian
                                "არ არის უსაფრთხო" label drops below the
                                title in tight rows instead of getting cut. */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <Text style={styles.certTitle}>PDF #{index + 1}</Text>
                              <View style={[styles.certBadge, { backgroundColor: safeBg }]}>
                                <Text style={[styles.certBadgeText, { color: safeColor }]} numberOfLines={1}>
                                  {isSafe === false ? 'არ არის უსაფრთხო' : 'უსაფრთხოა'}
                                </Text>
                              </View>
                            </View>

                            {/* Date */}
                            <Text style={styles.certMeta}>
                              {new Date(item.generated_at).toLocaleString('ka')}
                            </Text>

                            {/* Badges row */}
                            {(expertName || qualTypes.length > 0) ? (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                                {expertName ? (
                                  <View style={styles.infoBadge}>
                                    <Ionicons name="person-outline" size={10} color={theme.colors.inkSoft} />
                                    <Text style={styles.infoBadgeText}>{expertName}</Text>
                                  </View>
                                ) : null}
                                {qualTypes.map(q => (
                                  <View key={q.type} style={styles.infoBadge}>
                                    <Ionicons name="ribbon-outline" size={10} color={theme.colors.inkSoft} />
                                    <Text style={styles.infoBadgeText}>
                                      {q.number ? `№${q.number}` : q.type}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            ) : null}
                          </View>

                          {/* Actions */}
                          <View style={{ alignItems: 'center', gap: 2 }}>
                            <Pressable
                              hitSlop={10}
                              onPress={() => deleteCert(item)}
                              style={{ padding: 6 }}
                              accessibilityLabel="delete"
                            >
                              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                            </Pressable>
                            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} style={{ padding: 6 }} />
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>

          <Button
            title={certs.length === 0 ? 'PDF რეპორტის გენერაცია' : 'ახალი PDF რეპორტის გენერაცია'}
            onPress={generateNew}
            style={{ marginTop: 10 }}
          />

          {/* External (remote) signatures — temporarily hidden. Code retained for re-enable. */}
          {false && (
            <View style={{ marginTop: 12 }}>
              <View style={{ paddingHorizontal: 0 }}>
                <View style={remoteStyles.headerRow}>
                  <Text style={styles.sectionTitle}>გარე ხელისმოწერები ({remoteRequests.length})</Text>
                  <Pressable
                    onPress={() => {
                      if (certs.length === 0) {
                        toast.error('ჯერ დააგენერირე PDF რეპორტი');
                        return;
                      }
                      setAddOpen(true);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="ახალი მოთხოვნა"
                  >
                    <Text style={remoteStyles.addLink}>+ ახალი</Text>
                  </Pressable>
                </View>
              </View>
              {remoteRequests.length === 0 ? (
                <Card>
                  <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>
                    გაგზავნე ხელის მოწერის ლინკი გარე ხელისმომწერებს SMS-ით.
                  </Text>
                </Card>
              ) : (
                <View style={{ gap: 8 }}>
                  {remoteRequests.map(req => (
                    <RemoteRequestRow
                      key={req.id}
                      request={req}
                      onResend={() => resendRemote(req)}
                      onCancel={() => cancelRemote(req)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      {false && (
        <AddRemoteSignerModal
          visible={addOpen}
          busy={addBusy}
          onCancel={() => setAddOpen(false)}
          onSubmit={handleAddRemoteSigner}
        />
      )}
    </Screen>
  );
}

// ── Remote signing row ─────────────────────────────────────────────────────

function statusVisuals(status: RemoteSigningStatus): { label: string; tint: string; bg: string } {
  switch (status) {
    case 'pending':
      return { label: 'არ გაგზავნილა', tint: theme.colors.inkSoft, bg: theme.colors.subtleSurface };
    case 'sent':
      return { label: 'გაგზავნილია', tint: theme.colors.warn, bg: theme.colors.warnSoft };
    case 'signed':
      return { label: 'ხელმოწერილი', tint: theme.colors.accent, bg: theme.colors.accentSoft };
    case 'declined':
      return { label: 'უარი', tint: theme.colors.danger, bg: theme.colors.dangerSoft };
    case 'expired':
      return { label: 'ვადაგასული', tint: theme.colors.danger, bg: theme.colors.dangerSoft };
  }
}

function RemoteRequestRow({
  request,
  onResend,
  onCancel,
}: {
  request: RemoteSigningRequest;
  onResend: () => void;
  onCancel: () => void;
}) {
  const v = statusVisuals(request.status);
  const isOpen = request.status === 'pending' || request.status === 'sent';
  return (
    <Card padding={12}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={remoteStyles.iconBox}>
          <Ionicons name="paper-plane-outline" size={18} color={theme.colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={remoteStyles.name} numberOfLines={1}>
            {request.signer_name}
          </Text>
          <Text style={remoteStyles.meta} numberOfLines={1}>
            {SIGNER_ROLE_LABEL[request.signer_role]} · {request.signer_phone}
          </Text>
          {request.status === 'declined' && request.declined_reason ? (
            <Text style={[remoteStyles.meta, { color: theme.colors.danger }]} numberOfLines={2}>
              მიზეზი: {request.declined_reason}
            </Text>
          ) : null}
          {request.status === 'signed' && request.signed_at ? (
            <Text style={remoteStyles.meta} numberOfLines={1}>
              {new Date(request.signed_at).toLocaleString('ka')}
            </Text>
          ) : null}
        </View>
        <Chip tint={v.tint} bg={v.bg}>
          {v.label}
        </Chip>
      </View>
      {isOpen ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Button
            title={request.status === 'pending' ? 'გაგზავნე SMS' : 'ხელახლა გაგზავნე'}
            variant="ghost"
            style={{ flex: 1 }}
            onPress={onResend}
          />
          <Button title="გაუქმება" variant="danger" style={{ flex: 1 }} onPress={onCancel} />
        </View>
      ) : null}
    </Card>
  );
}

const remoteStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  addLink: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '700', color: theme.colors.ink },
  meta: { fontSize: 12, color: theme.colors.inkSoft },
});

// ── Scorecard component ──────────────────────────────────────────────────────

function InspectionScorecard({
  questions,
  answers,
}: {
  questions: Question[];
  answers: Answer[];
}) {
  const answerMap = new Map(answers.map(a => [a.question_id, a]));

  // Compute stats
  let okCount = 0;
  let issueCount = 0;
  let skippedCount = 0;

  const issueQuestions: { question: Question; label: string }[] = [];

  for (const q of questions) {
    const ans = answerMap.get(q.id);
    if (!ans) {
      skippedCount += 1;
      continue;
    }
    if (q.type === 'yesno') {
      if (ans.value_bool === false) {
        issueCount += 1;
        issueQuestions.push({ question: q, label: '✗ არა' });
      } else if (ans.value_bool === true) {
        okCount += 1;
      } else {
        skippedCount += 1;
      }
    } else if (q.type === 'measure') {
      if (ans.value_num != null) okCount += 1;
      else skippedCount += 1;
    } else if (q.type === 'freetext') {
      if (ans.value_text) okCount += 1;
      else skippedCount += 1;
    } else if (q.type === 'component_grid') {
      if (ans.grid_values && Object.keys(ans.grid_values).length > 0) okCount += 1;
      else skippedCount += 1;
    } else {
      // photo_upload etc.
      okCount += 1;
    }
  }

  const total = questions.length;

  return (
    <View style={{ marginTop: 4 }}>
      <Text style={scorecardStyles.sectionTitle}>შეჯამება</Text>
      <Card>
        {/* Stats chips row */}
        <View style={scorecardStyles.statsRow}>
          <View style={scorecardStyles.statChip}>
            <Text style={scorecardStyles.statNum}>{answers.length}/{total}</Text>
            <Text style={scorecardStyles.statLabel}>შეავსე</Text>
          </View>
          <View style={[scorecardStyles.statChip, { backgroundColor: theme.colors.accentSoft }]}>
            <Text style={[scorecardStyles.statNum, { color: theme.colors.accent }]}>{okCount}</Text>
            <Text style={[scorecardStyles.statLabel, { color: theme.colors.accent }]}>გამართული</Text>
          </View>
          {issueCount > 0 ? (
            <View style={[scorecardStyles.statChip, { backgroundColor: theme.colors.dangerSoft }]}>
              <Text style={[scorecardStyles.statNum, { color: theme.colors.danger }]}>{issueCount}</Text>
              <Text style={[scorecardStyles.statLabel, { color: theme.colors.danger }]}>პრობლემა</Text>
            </View>
          ) : null}
          {skippedCount > 0 ? (
            <View style={scorecardStyles.statChip}>
              <Text style={scorecardStyles.statNum}>{skippedCount}</Text>
              <Text style={scorecardStyles.statLabel}>გამოტოვ.</Text>
            </View>
          ) : null}
        </View>

        {/* Issues list */}
        {issueCount === 0 && answers.length > 0 ? (
          <View style={scorecardStyles.allOkRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
            <Text style={{ fontSize: 13, color: theme.colors.accent, fontWeight: '600' }}>
              პრობლემა არ გამოვლინდა
            </Text>
          </View>
        ) : issueQuestions.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={scorecardStyles.issueLabel}>გამოვლენილი პრობლემები</Text>
            {issueQuestions.map((item, idx) => (
              <View
                key={item.question.id}
                style={[
                  scorecardStyles.issueRow,
                  idx === issueQuestions.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Ionicons name="warning" size={14} color={theme.colors.danger} style={{ marginTop: 1 }} />
                <Text style={scorecardStyles.issueText} numberOfLines={2}>
                  {item.question.title}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const scorecardStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    flex: 1,
    minWidth: 60,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
    gap: 2,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.inkSoft,
    textAlign: 'center',
  },
  allOkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
  },
  issueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  issueText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.ink,
    lineHeight: 18,
  },
});

const styles = StyleSheet.create({
  templateName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  project: { fontSize: 13, color: theme.colors.inkSoft, marginTop: 2 },
  date: { fontSize: 12, color: theme.colors.inkFaint, marginTop: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 8,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
  },
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  certThumb: {
    width: 50,
    height: 70,
    borderRadius: 7,
    backgroundColor: theme.colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  certThumbBar: { width: 4, height: '100%' },
  certThumbBody: { flex: 1, padding: 6 },
  certThumbLine: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.inkFaint,
  },
  certTitle: { fontWeight: '700', fontSize: 14, color: theme.colors.ink },
  certMeta: { fontSize: 11, color: theme.colors.inkSoft },
  certBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  certBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 0,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.subtleSurface,
  },
  infoBadgeText: {
    fontSize: 11,
    color: theme.colors.inkSoft,
  },
});
