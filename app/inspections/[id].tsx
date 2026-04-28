// Inspection detail screen.
//
// Lands here when the user taps a completed inspection from history, the
// home recents list, or the inspection-end fork screen's "save inspection"
// CTA. Shows inspection metadata + its attached certificates, and offers
// a CTA to generate another certificate from the same inspection.
//
// Draft inspections still route through `/inspections/[id]/wizard`.
import { useCallback, useEffect, useState , useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { Button, Card, Chip, Screen } from '../../components/ui';
import { Skeleton, SkeletonCard, SkeletonListCard } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { AddRemoteSignerSheet, type AddRemoteSignerResult } from '../../components/AddRemoteSignerModal';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { getStorageImageDisplayUrl } from '../../lib/imageUrl';
import {
  answersApi,
  certificatesApi,
  inspectionsApi,
  projectsApi,
  remoteSigningApi,
  signaturesApi,
  templatesApi,
} from '../../lib/services';
import { buildPdfPreviewHtml } from '../../lib/pdf';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errorMap';
import { toErrorMessage } from '../../lib/logError';
import { scheduleDelete } from '../../lib/pendingDeletes';
import { haptic } from '../../lib/haptics';
import { formatShortDateTime } from '../../lib/formatDate';
// openSigningSMS kept in lib/sms.ts as fallback; Twilio edge fn used instead.
import { useTheme } from '../../lib/theme';

import type {
  Answer,
  AnswerPhoto,
  Certificate,
  Inspection,
  Project,
  Question,
  RemoteSigningRequest,
  RemoteSigningStatus,
  SignatureRecord,
  Template,
} from '../../types/models';
import { SIGNER_ROLE_LABEL } from '../../types/models';
import { a11y } from '../../lib/accessibility';

export default function InspectionDetailScreen() {
  const { theme } = useTheme();
  const remoteStyles = useMemo(() => getremoteStyles(theme), [theme]);
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [photosByAnswer, setPhotosByAnswer] = useState<Record<string, AnswerPhoto[]>>({});
  /** Resolved display URL for the *first* photo of each answer (used in problem cards). */
  const [issuePhotoUrls, setIssuePhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [notFound, setNotFound] = useState(false);
  const [remoteRequests, setRemoteRequests] = useState<RemoteSigningRequest[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  // PDF preview is now an on-demand modal (not a tab). The earlier tab+effect
  // pattern had a cleanup-cancellation race: setPreviewLoading(true) re-fired
  // the effect, the cleanup set cancelled=true, and the in-flight async
  // never reached setPreviewHtml — leaving the spinner stuck forever.
  // Triggering on a button press eliminates the race.
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
      // Load questions, answers, signatures so the redesigned screen has all
      // data on first paint. Photos fetched in a follow-up pass keyed off answers.
      if (tpl) {
        const [qs, ans, sigs] = await Promise.all([
          templatesApi.questions(tpl.id).catch(() => [] as Question[]),
          answersApi.list(insp.id).catch(() => [] as Answer[]),
          signaturesApi.list(insp.id).catch(() => [] as SignatureRecord[]),
        ]);
        setQuestions(qs);
        setAnswers(ans);
        setSignatures(sigs);

        if (ans.length > 0) {
          const photoMap = await answersApi
            .photosByAnswerIds(ans.map(a => a.id))
            .catch(() => ({} as Record<string, AnswerPhoto[]>));
          setPhotosByAnswer(photoMap);
        }
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

  // Resolve display URLs for the first photo on each issue answer so the
  // problem cards can show a thumbnail. Runs once per inspection focus.
  useEffect(() => {
    let cancelled = false;
    const entries = Object.entries(photosByAnswer);
    if (entries.length === 0) return;
    (async () => {
      const urls: Record<string, string> = {};
      await Promise.all(
        entries.map(async ([answerId, photos]) => {
          const first = photos[0];
          if (!first) return;
          try {
            urls[answerId] = await getStorageImageDisplayUrl(
              STORAGE_BUCKETS.answerPhotos,
              first.storage_path,
            );
          } catch {
            // Best-effort — missing thumbnail is fine, the problem text alone is enough.
          }
        }),
      );
      if (!cancelled) setIssuePhotoUrls(urls);
    })();
    return () => {
      cancelled = true;
    };
  }, [photosByAnswer]);

  /**
   * Open the PDF preview modal. Builds HTML on demand from already-loaded data.
   * Logs and surfaces errors instead of leaving the spinner orphaned.
   */
  const openPreview = useCallback(() => {
    if (!inspection || !template || !project) {
      toast.error('მონაცემები ჯერ იტვირთება');
      return;
    }
    setPreviewVisible(true);
    setPreviewError(null);
    if (previewHtml) return; // cached from a prior open
    setPreviewLoading(true);
    try {
      const html = buildPdfPreviewHtml({
        questionnaire: inspection,
        template,
        project,
        questions,
        answers,
        signatures,
        photosByAnswer,
      });
      setPreviewHtml(html);
    } catch (e) {
      const msg = toErrorMessage(e);
      console.error('[inspection.preview] buildPdfPreviewHtml failed:', msg, e);
      setPreviewError(msg || 'პრევიუ ვერ აიწყო');
      toast.error(friendlyError(e, 'პრევიუს ჩატვირთვა ვერ მოხერხდა'));
    } finally {
      setPreviewLoading(false);
    }
  }, [inspection, template, project, questions, answers, signatures, photosByAnswer, previewHtml, toast]);

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
        <Stack.Screen options={{ headerShown: true, title: 'ინსპექცია', headerBackTitle: 'მთავარი' }} />
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <ErrorState
            title={notFound ? 'ინსპექცია ვერ მოიძებნა' : 'ვერ ჩაიტვირთა'}
            error={loadError ?? undefined}
            message={notFound ? 'შესაძლოა წაიშალა, ან თქვენ არ გაქვთ წვდომა.' : undefined}
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
        <Stack.Screen options={{ headerShown: true, title: 'ინსპექცია', headerBackTitle: 'მთავარი' }} />
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

  // Compute scorecard-style stats once for header + stats row
  const stats = computeStats(questions, answers);
  const hasProblems = stats.issueCount > 0 || inspection.is_safe_for_use === false;
  const tintBg = hasProblems
    ? theme.colors.dangerSoft
    : (inspection.is_safe_for_use === true || answers.length > 0)
      ? theme.colors.accentSoft
      : theme.colors.background;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'ინსპექცია', headerBackTitle: 'მთავარი' }} />
      <View style={{ flex: 1, backgroundColor: tintBg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            {/* 1. HEADER — inspection name + project + date */}
            <View style={styles.header}>
              <Text style={styles.templateName} numberOfLines={2}>
                {template?.name ?? 'ინსპექცია'}
              </Text>
              {project ? (
                <Text style={styles.project} numberOfLines={1}>
                  {project.name}
                </Text>
              ) : null}
              <Text style={styles.date}>
                {formatShortDateTime(inspection.completed_at ?? inspection.created_at)}
              </Text>
            </View>

            {/* 2. STATUS HERO — large centered badge */}
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: hasProblems
                    ? theme.colors.danger
                    : theme.colors.accent,
                },
              ]}
            >
              <Ionicons
                name={hasProblems ? 'warning' : 'shield-checkmark'}
                size={36}
                color={theme.colors.white}
              />
              <Text style={styles.heroLabel} numberOfLines={2}>
                {hasProblems ? 'გამოვლენილია პრობლემები ⚠' : 'უსაფრთხოა ✓'}
              </Text>
            </View>

            {/* 3. PROBLEMS — only when problems exist; comes FIRST */}
            {stats.issueQuestions.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.sectionHeading}>გამოვლენილი პრობლემები</Text>
                {stats.issueQuestions.map(item => {
                  const ans = stats.answerMap.get(item.question.id);
                  const photoUrl = ans ? issuePhotoUrls[ans.id] : undefined;
                  const detail = ans?.comment || ans?.notes || ans?.value_text || '';
                  return (
                    <Card key={item.question.id} padding={0} style={styles.problemCard}>
                      <View style={styles.problemAccent} />
                      <View style={styles.problemBody}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={styles.problemTitle} numberOfLines={3}>
                            {item.question.title}
                          </Text>
                          {detail ? (
                            <Text style={styles.problemDetail} numberOfLines={4}>
                              {detail}
                            </Text>
                          ) : (
                            <Text style={styles.problemDetailMuted}>{item.label}</Text>
                          )}
                        </View>
                        {photoUrl ? (
                          <Image
                            source={{ uri: photoUrl }}
                            style={styles.problemThumb}
                            resizeMode="cover"
                          />
                        ) : null}
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : null}

            {/* 4. STATS — single compact row, max 3 items */}
            <Card padding={12}>
              <View style={styles.statsRow}>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>
                    {answers.length}/{stats.total}
                  </Text>
                  <Text style={styles.statKey}>შემოწმდა</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.statCell}>
                  <Text
                    style={[
                      styles.statValue,
                      { color: stats.issueCount > 0 ? theme.colors.danger : theme.colors.accent },
                    ]}
                  >
                    {stats.issueCount}
                  </Text>
                  <Text style={styles.statKey}>პრობლემა</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{stats.skippedCount}</Text>
                  <Text style={styles.statKey}>გამოტოვდა</Text>
                </View>
              </View>
            </Card>

            {/* 5. PARTICIPANTS — who signed */}
            {signatures.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.sectionHeading}>მონაწილეები</Text>
                <Card padding={0}>
                  {signatures.map((sig, idx) => {
                    const isSigned = sig.status === 'signed';
                    const name = sig.full_name || sig.person_name || SIGNER_ROLE_LABEL[sig.signer_role];
                    return (
                      <View
                        key={sig.id}
                        style={[
                          styles.participantRow,
                          idx === signatures.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <View
                          style={[
                            styles.participantDot,
                            {
                              backgroundColor: isSigned
                                ? theme.colors.accentSoft
                                : theme.colors.subtleSurface,
                            },
                          ]}
                        >
                          <Ionicons
                            name={isSigned ? 'checkmark' : 'remove'}
                            size={14}
                            color={isSigned ? theme.colors.accent : theme.colors.inkFaint}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.participantName} numberOfLines={1}>
                            {name}
                          </Text>
                          <Text style={styles.participantRole} numberOfLines={1}>
                            {SIGNER_ROLE_LABEL[sig.signer_role]}
                            {isSigned && sig.signed_at
                              ? ` · ${formatShortDateTime(sig.signed_at)}`
                              : ''}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.participantStatus,
                            {
                              color: isSigned ? theme.colors.accent : theme.colors.inkFaint,
                            },
                          ]}
                        >
                          {isSigned ? 'ხელი მოწერილი' : 'არ ესწრებოდა'}
                        </Text>
                      </View>
                    );
                  })}
                </Card>
              </View>
            ) : null}

            {/* 6. ACTIONS — two stacked buttons (no tabs) */}
            <View style={{ gap: 10, marginTop: 4 }}>
              <Button
                title="PDF გენერირება და გაგზავნა"
                size="lg"
                onPress={generateNew}
              />
              <Button
                title="PDF პრევიუ"
                variant="outline"
                size="lg"
                onPress={openPreview}
              />
            </View>

            {/* 7. PDF რეპორტები — only when count > 0 */}
            {certs.length > 0 ? (
              <View style={{ gap: 8, marginTop: 4 }}>
                <Text style={styles.sectionHeading}>PDF რეპორტები ({certs.length})</Text>
                <FlatList
                  scrollEnabled={false}
                  data={certs}
                  keyExtractor={c => c.id}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  renderItem={({ item, index }) => {
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
                      <Pressable
                        onPress={() => openCertPreview(item)}
                        {...a11y(`PDF რეპორტი #${index + 1}`, 'რეპორტის დეტალების ნახვა', 'button')}
                      >
                        <Card padding={12}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                            <View style={{ flex: 1, gap: 3 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                <Text style={styles.certTitle}>PDF #{index + 1}</Text>
                                <View style={[styles.certBadge, { backgroundColor: safeBg }]}>
                                  <Text style={[styles.certBadgeText, { color: safeColor }]} numberOfLines={1}>
                                    {isSafe === false ? 'არ არის უსაფრთხო' : 'უსაფრთხოა'}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.certMeta}>
                                {formatShortDateTime(item.generated_at)}
                              </Text>
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
                            <View style={{ alignItems: 'center', gap: 2 }}>
                              <Pressable
                                hitSlop={10}
                                onPress={() => deleteCert(item)}
                                style={{ padding: 6 }}
                                {...a11y('წაშლა', 'PDF რეპორტის წაშლა', 'button')}
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
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* PDF preview modal — opens on demand from the action button */}
      <Modal
        visible={previewVisible}
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>PDF პრევიუ</Text>
            <Pressable
              onPress={() => setPreviewVisible(false)}
              hitSlop={10}
              {...a11y('დახურვა', 'პრევიუს დახურვა', 'button')}
            >
              <Ionicons name="close" size={24} color={theme.colors.ink} />
            </Pressable>
          </View>
          {previewLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={{ color: theme.colors.inkSoft }}>პრევიუ იტვირთება…</Text>
            </View>
          ) : previewError ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
              <Ionicons name="alert-circle" size={36} color={theme.colors.danger} />
              <Text style={{ color: theme.colors.danger, textAlign: 'center' }}>{previewError}</Text>
            </View>
          ) : previewHtml ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: previewHtml }}
              style={{ flex: 1 }}
              scalesPageToFit
              javaScriptEnabled={false}
              domStorageEnabled={false}
            />
          ) : null}
        </SafeAreaView>
      </Modal>

      {false && (
        <AddRemoteSignerSheet
          onCancel={() => setAddOpen(false)}
          onSubmit={handleAddRemoteSigner}
          busy={addBusy}
        />
      )}
    </Screen>
  );
}

// ── Stats helper ─────────────────────────────────────────────────────────────

interface InspectionStats {
  total: number;
  okCount: number;
  issueCount: number;
  skippedCount: number;
  issueQuestions: { question: Question; label: string }[];
  answerMap: Map<string, Answer>;
}

function computeStats(questions: Question[], answers: Answer[]): InspectionStats {
  const answerMap = new Map(answers.map(a => [a.question_id, a]));
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
      okCount += 1;
    }
  }

  return {
    total: questions.length,
    okCount,
    issueCount,
    skippedCount,
    issueQuestions,
    answerMap,
  };
}

// ── Remote signing row ─────────────────────────────────────────────────────

function statusVisuals(status: RemoteSigningStatus, theme: any): { label: string; tint: string; bg: string } {
  switch (status) {
    case 'pending':
      return { label: 'არ გაგზავნილა', tint: theme.colors.inkSoft, bg: theme.colors.subtleSurface };
    case 'sent':
      return { label: 'გაგზავნილია', tint: theme.colors.warn, bg: theme.colors.warnSoft };
    case 'signed':
      return { label: 'ხელმოწერილი', tint: theme.colors.accent, bg: theme.colors.accentSoft };
    case 'declined':
      return { label: 'უარი თქვა', tint: theme.colors.danger, bg: theme.colors.dangerSoft };
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
  const { theme } = useTheme();
  const remoteStyles = useMemo(() => getremoteStyles(theme), [theme]);

  const v = statusVisuals(request.status, theme);
  const isOpen = request.status === 'pending' || request.status === 'sent';
  return (
    <Card padding={12}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} {...a11y(request.signer_name, 'გარე ხელმოწერის სტატუსი', 'button')}>
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
              {formatShortDateTime(request.signed_at)}
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

function getremoteStyles(theme: any) {
  return StyleSheet.create({
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
}

function getstyles(theme: any) {
  return StyleSheet.create({
  // 1. Header
  header: { gap: 4, marginBottom: 4 },
  templateName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.ink,
    lineHeight: 28,
  },
  project: { fontSize: 14, color: theme.colors.inkSoft, marginTop: 2 },
  date: { fontSize: 12, color: theme.colors.inkFaint, marginTop: 2 },

  // 2. Status hero
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: theme.radius.xl,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  heroLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.white,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // 3. Problems
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  problemCard: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  problemAccent: {
    width: 4,
    backgroundColor: theme.colors.danger,
  },
  problemBody: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  problemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
    lineHeight: 20,
  },
  problemDetail: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    lineHeight: 18,
  },
  problemDetailMuted: {
    fontSize: 12,
    color: theme.colors.danger,
    fontWeight: '600',
  },
  problemThumb: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.subtleSurface,
  },

  // 4. Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  statKey: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    fontWeight: '600',
    textAlign: 'center',
  },
  statSep: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.hairline,
  },

  // 5. Participants
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  participantDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  participantRole: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    marginTop: 1,
  },
  participantStatus: {
    fontSize: 11,
    fontWeight: '700',
  },

  // PDF preview modal
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
  },

  // 7. PDF reports list (carried over)
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
}
