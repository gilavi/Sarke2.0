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
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../../components/ui';
import {
  answersApi,
  certificatesApi,
  inspectionsApi,
  projectsApi,
  templatesApi,
} from '../../lib/services';
import { shareStoredPdf } from '../../lib/sharePdf';
import { useToast } from '../../lib/toast';
import { theme } from '../../lib/theme';
import type { Answer, Certificate, Inspection, Project, Question, Template } from '../../types/models';

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
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await inspectionsApi.getById(id);
      if (!insp) {
        toast.error('ინსპექცია ვერ მოიძებნა');
        setLoading(false);
        return;
      }
      setInspection(insp);
      // If this is still a draft, bounce into the wizard — the detail view
      // only makes sense once the inspection is immutable.
      if (insp.status === 'draft') {
        router.replace(`/inspections/${insp.id}/wizard` as any);
        return;
      }
      const [tpl, proj, cs] = await Promise.all([
        templatesApi.getById(insp.template_id).catch(() => null),
        projectsApi.getById(insp.project_id).catch(() => null),
        certificatesApi.listByInspection(insp.id).catch(() => [] as Certificate[]),
      ]);
      setTemplate(tpl);
      setProject(proj);
      setCerts(cs);
      // Load questions + answers so we can show what was filled in
      if (tpl) {
        const [qs, ans] = await Promise.all([
          templatesApi.questions(tpl.id).catch(() => [] as Question[]),
          answersApi.list(insp.id).catch(() => [] as Answer[]),
        ]);
        setQuestions(qs);
        setAnswers(ans);
      }
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sharePdf = async (cert: Certificate) => {
    try { await shareStoredPdf(cert.pdf_url); }
    catch (e: any) { toast.error(e?.message ?? 'ვერ გაიხსნა'); }
  };

  const deleteCert = (cert: Certificate) => {
    Alert.alert(
      'PDF რეპორტის წაშლა?',
      'ეს წაშლის დაგენერირებულ PDF-ს. ინსპექცია უცვლელი დარჩება.',
      [
        { text: 'გაუქმება', style: 'cancel' },
        {
          text: 'წაშლა',
          style: 'destructive',
          onPress: async () => {
            try {
              await certificatesApi.remove(cert.id);
              setCerts(prev => prev.filter(c => c.id !== cert.id));
              toast.success('წაიშალა');
            } catch (e: any) {
              toast.error(e?.message ?? 'ვერ წაიშალა');
            }
          },
        },
      ],
    );
  };

  const generateNew = () => {
    if (!inspection) return;
    router.push(`/certificates/new?inspectionId=${inspection.id}` as any);
  };

  if (loading || !inspection) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'ინსპექცია' }} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
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
              <FlatList
                // Nested-scroll-free: wrapped in the parent ScrollView already.
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
                  return (
                    <Pressable onPress={() => setPreviewCert(item)}>
                      <Card padding={12}>
                        {/* Header row: icon + title + actions */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                          <View style={[
                            styles.certDot,
                            isSafe === false && { backgroundColor: theme.colors.dangerSoft },
                          ]}>
                            <Ionicons
                              name="document-text"
                              size={18}
                              color={isSafe === false ? theme.colors.danger : theme.colors.accent}
                            />
                          </View>
                          <View style={{ flex: 1, gap: 4 }}>
                            {/* Title row: "PDF #N" + safety badge */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.certTitle}>PDF #{index + 1}</Text>
                              <View style={[
                                styles.certBadge,
                                isSafe === false
                                  ? { backgroundColor: theme.colors.dangerSoft }
                                  : { backgroundColor: theme.colors.accentSoft },
                              ]}>
                                <Text style={[
                                  styles.certBadgeText,
                                  { color: isSafe === false ? theme.colors.danger : theme.colors.accent },
                                ]}>
                                  {isSafe === false ? 'არ არის უსაფრთხო' : 'უსაფრთხოა'}
                                </Text>
                              </View>
                            </View>
                            {/* Date */}
                            <Text style={styles.certMeta}>
                              {new Date(item.generated_at).toLocaleString('ka')}
                            </Text>
                            {/* Expert */}
                            {expertName ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="person-outline" size={11} color={theme.colors.inkFaint} />
                                <Text style={styles.certMeta}>{expertName}</Text>
                              </View>
                            ) : null}
                            {/* Qual certs */}
                            {qualTypes.length > 0 ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="ribbon-outline" size={11} color={theme.colors.inkFaint} />
                                <Text style={styles.certMeta} numberOfLines={1}>
                                  {qualTypes.map(q => q.number ? `${q.type} №${q.number}` : q.type).join(' · ')}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          {/* Actions */}
                          <View style={{ gap: 4 }}>
                            <Pressable
                              hitSlop={10}
                              onPress={() => deleteCert(item)}
                              style={{ padding: 6 }}
                              accessibilityLabel="delete certificate"
                            >
                              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                            </Pressable>
                            <Ionicons name="share-outline" size={18} color={theme.colors.inkFaint} style={{ padding: 6 }} />
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
        </ScrollView>
      </SafeAreaView>

      {/* PDF preview sheet */}
      <Modal
        visible={previewCert !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewCert(null)}
      >
        <Pressable
          style={previewStyles.backdrop}
          onPress={() => setPreviewCert(null)}
        />
        {previewCert ? (
          <CertPreviewSheet
            cert={previewCert}
            templateName={template?.name ?? null}
            projectName={project?.name ?? null}
            onClose={() => setPreviewCert(null)}
            onShare={() => {
              void sharePdf(previewCert);
              setPreviewCert(null);
            }}
          />
        ) : null}
      </Modal>
    </Screen>
  );
}

// ── CertPreviewSheet ─────────────────────────────────────────────────────────

function CertPreviewSheet({
  cert,
  templateName,
  projectName,
  onClose,
  onShare,
}: {
  cert: Certificate;
  templateName: string | null;
  projectName: string | null;
  onClose: () => void;
  onShare: () => void;
}) {
  const isSafe = cert.is_safe_for_use;
  const params = cert.params as {
    expertName?: string | null;
    qualTypes?: { type: string; number: string | null }[];
  };
  const qualTypes = params?.qualTypes ?? [];
  const expertName = params?.expertName ?? null;

  const accentColor = isSafe === false ? theme.colors.danger : theme.colors.accent;
  const accentBg = isSafe === false ? theme.colors.dangerSoft : theme.colors.accentSoft;

  return (
    <SafeAreaView style={previewStyles.sheet} edges={['bottom']}>
      {/* Drag handle */}
      <View style={previewStyles.handle} />

      {/* Document card — mimics PDF header layout */}
      <View style={[previewStyles.docCard, { borderTopColor: accentColor }]}>
        {/* Status banner */}
        <View style={[previewStyles.statusBanner, { backgroundColor: accentBg }]}>
          <Ionicons
            name={isSafe === false ? 'warning' : 'checkmark-circle'}
            size={14}
            color={accentColor}
          />
          <Text style={[previewStyles.statusBannerText, { color: accentColor }]}>
            {isSafe === false ? 'არ არის უსაფრთხო ექსპლუატაციისთვის' : 'უსაფრთხოა ექსპლუატაციისთვის'}
          </Text>
        </View>

        {/* Template + project */}
        <Text style={previewStyles.docTitle} numberOfLines={2}>
          {templateName ?? 'ინსპექცია'}
        </Text>
        {projectName ? (
          <Text style={previewStyles.docMeta}>{projectName}</Text>
        ) : null}
        <Text style={previewStyles.docMeta}>
          {new Date(cert.generated_at).toLocaleString('ka')}
        </Text>

        {/* Divider */}
        <View style={previewStyles.divider} />

        {/* Inspector + quals */}
        {expertName ? (
          <View style={previewStyles.metaRow}>
            <Ionicons name="person-circle-outline" size={14} color={theme.colors.inkSoft} />
            <Text style={previewStyles.metaText}>{expertName}</Text>
          </View>
        ) : null}
        {qualTypes.map(q => (
          <View key={q.type} style={previewStyles.metaRow}>
            <Ionicons name="ribbon-outline" size={14} color={theme.colors.inkSoft} />
            <Text style={previewStyles.metaText}>
              {q.type}{q.number ? ` · №${q.number}` : ''}
            </Text>
          </View>
        ))}

        {/* Conclusion snippet */}
        {cert.conclusion_text ? (
          <>
            <View style={previewStyles.divider} />
            <Text style={previewStyles.conclusionLabel}>დასკვნა</Text>
            <Text style={previewStyles.conclusionText} numberOfLines={3}>
              {cert.conclusion_text}
            </Text>
          </>
        ) : null}
      </View>

      {/* Actions */}
      <View style={previewStyles.actions}>
        <Button title="PDF გაზიარება" onPress={onShare} style={{ flex: 1 }} />
        <Button title="დახურვა" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

const previewStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginBottom: 4,
  },
  docCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderTopWidth: 4,
    overflow: 'hidden',
    padding: 16,
    gap: 6,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.ink,
    marginTop: 2,
  },
  docMeta: {
    fontSize: 12,
    color: theme.colors.inkSoft,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.hairline,
    marginVertical: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: theme.colors.ink,
  },
  conclusionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conclusionText: {
    fontSize: 13,
    color: theme.colors.ink,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
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
  certDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certTitle: { fontWeight: '700', fontSize: 14, color: theme.colors.ink },
  certMeta: { fontSize: 11, color: theme.colors.inkSoft },
  certBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  certBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
