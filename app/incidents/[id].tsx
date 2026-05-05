import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { PaywallModal } from '../../components/PaywallModal';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { incidentsApi, projectsApi, storageApi } from '../../lib/services';
import { useIncident, useProject } from '../../lib/apiHooks';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { buildIncidentPdfHtml } from '../../lib/incidentPdf';
import { generatePdfName } from '../../lib/pdfName';
import {
  signatureAsDataUrl,
  pdfPhotoEmbed,
  imageForDisplay,
} from '../../lib/imageUrl';
import { shareStoredPdf } from '../../lib/sharePdf';
import { queuePdfUpload, stagePdfForQueue } from '../../lib/pdfUploadQueue';
import * as FileSystem from 'expo-file-system/legacy';
import { logError } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { formatShortDateTime } from '../../lib/formatDate';
import type { Incident, Project } from '../../types/models';
import { ErrorScreen } from '../../components/ErrorScreen';
import {
  INCIDENT_TYPE_FULL_LABEL,
  INCIDENT_TYPE_LABEL,
} from '../../types/models';

function getTypeBadge(theme: any): Record<string, { bg: string; text: string; border: string }> {
  const isDark = theme.colors.semantic.dangerSoft === '#3A1F1F';
  if (isDark) {
    return {
      minor:    { bg: '#3F2E0F', text: '#FCD34D', border: '#F59E0B' },
      severe:   { bg: '#3D1F08', text: '#FCA673', border: '#F97316' },
      fatal:    { bg: '#3A1F1F', text: '#FCA5A5', border: '#EF4444' },
      mass:     { bg: '#3A1F1F', text: '#FCA5A5', border: '#EF4444' },
      nearmiss: { bg: '#2D1F4F', text: '#C4B5FD', border: '#8B5CF6' },
    };
  }
  return {
    minor:    { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    severe:   { bg: '#FFEDD5', text: '#9A3412', border: '#F97316' },
    fatal:    { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
    mass:     { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
    nearmiss: { bg: '#EDE9FE', text: '#5B21B6', border: '#8B5CF6' },
  };
}

export default function IncidentDetail() {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();

  const incidentQ = useIncident(id);
  const projectQ = useProject(incidentQ.data?.project_id);

  const [incident, setIncident] = useState<Incident | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [photoDisplayUrls, setPhotoDisplayUrls] = useState<string[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfPhase, setPdfPhase] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  useEffect(() => { if (incidentQ.data !== undefined) setIncident(incidentQ.data); }, [incidentQ.data]);
  useEffect(() => { if (projectQ.data !== undefined) setProject(projectQ.data); }, [projectQ.data]);
  useEffect(() => {
    if (incidentQ.data && !incidentQ.isLoading) setLoaded(true);
  }, [incidentQ.data, incidentQ.isLoading]);

  const inspector = useMemo(() => {
    if (session.state.status !== 'signedIn') return { name: '', sigPath: null };
    const u = session.state.user;
    const name = u
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
      : session.state.session.user.email ?? '';
    return { name, sigPath: u?.saved_signature_url ?? null };
  }, [session.state]);

  // Load photo display URLs on mount only. The incident + project data
  // already flow from React Query hooks above, so back-navigation is instant.
  useEffect(() => {
    if (!incident) return;
    let cancelled = false;
    (async () => {
      if (incident.photos?.length) {
        const urls = await Promise.all(
          incident.photos.map(path =>
            imageForDisplay(STORAGE_BUCKETS.incidentPhotos, path).catch(() => ''),
          ),
        );
        if (!cancelled) setPhotoDisplayUrls(urls.filter(Boolean));
      } else {
        setPhotoDisplayUrls([]);
      }
    })();
    return () => { cancelled = true; };
  }, [incident?.id]);

  const badge = incident ? getTypeBadge(theme)[incident.type] : null;
  const isNearMiss = incident?.type === 'nearmiss';

  // ── share / generate PDF ─────────────────────────────────────────────────

  const sharePdf = async () => {
    if (!incident?.pdf_url) return;
    try {
      await shareStoredPdf(incident.pdf_url);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF-ის გაზიარება ვერ მოხერხდა'));
    }
  };

  const generatePdf = async () => {
    if (!incident || !project) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    setPdfPhase('მზადდება...');
    try {
      let sigDataUrl: string | undefined;
      if (inspector.sigPath) {
        sigDataUrl = await signatureAsDataUrl(
          STORAGE_BUCKETS.signatures,
          inspector.sigPath,
        ).catch(() => undefined);
      }
      setPdfPhase('ფოტოები ემატება...');
      const photoDataUrls = await Promise.all(
        (incident.photos ?? []).map(p =>
          pdfPhotoEmbed(STORAGE_BUCKETS.incidentPhotos, p).catch(() => ''),
        ),
      ).then(urls => urls.filter(Boolean));

      setPdfPhase('მზადდება PDF...');
      const html = buildIncidentPdfHtml({
        incident,
        project,
        inspectorName: inspector.name,
        inspectorSignatureDataUrl: sigDataUrl,
        photoDataUrls,
      });
      // Keep the pretty-named copy for background upload
      const incidentTypeLabel = INCIDENT_TYPE_FULL_LABEL[incident.type];
      const docType = `ინციდენტი_${incidentTypeLabel}`;
      const pdfName = generatePdfName(project.company_name || project.name, docType, new Date(incident.date_time), incident.id);
      const pdfPath = `incidents/${pdfName}`;
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      const localUri = await generateAndSharePdf(html, pdfName, true, userId);
      invalidatePdfUsage();
      if (localUri) {

        setPdfPhase('დასრულდა ✓');
        toast.success('PDF შექმნილია');

        // Background: upload PDF + update incident row.
        // If this fails, queue for retry so the user isn't blocked.
        (async () => {
          try {
            await storageApi.uploadFromUri(STORAGE_BUCKETS.pdfs, pdfPath, localUri, 'application/pdf');
            const updated = await incidentsApi.update(incident.id, {
              pdf_url: pdfPath,
              status: 'completed',
            });
            setIncident(updated);
            // Clean up the temp copy after successful upload
            FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
          } catch (e) {
            logError(e, 'incidentId.backgroundUpload');
            const stagedUri = await stagePdfForQueue(localUri, pdfName);
            await queuePdfUpload({
              localUri: stagedUri,
              bucket: STORAGE_BUCKETS.pdfs,
              path: pdfPath,
              contentType: 'application/pdf',
              dbOp: {
                kind: 'incident_update',
                payload: { incidentId: incident.id, pdf_url: pdfPath, status: 'completed' },
              },
            });
            toast.info('PDF შენახულია ლოკალურად; სინქრონიზაცია მოხდება ქსელზე დაბრუნებისას');
          }
        })();
      } else {
        setPdfPhase('დასრულდა ✓');
        toast.success('PDF შექმნილია');
      }
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      toast.error(friendlyError(e, 'PDF-ის შექმნა ვერ მოხერხდა'));
    } finally {
      setGeneratingPdf(false);
      setPdfPhase(null);
    }
  };

  const deleteIncident = () => {
    if (!incident) return;
    Alert.alert('ინციდენტის წაშლა', 'გსურთ ამ ინციდენტის წაშლა?', [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: async () => {
          try {
            await incidentsApi.remove(incident.id);
            toast.success('ინციდენტი წაშლილია');
            router.back();
          } catch (e) {
            toast.error(friendlyError(e, 'წაშლა ვერ მოხერხდა'));
          }
        },
      },
    ]);
  };

  // ── loading ──────────────────────────────────────────────────────────────

  if (!id) {
    return <ErrorScreen onGoHome={() => router.replace('/(tabs)/home')} onRetry={() => router.back()} />;
  }

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: true, title: 'ინციდენტი' }} />
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Stack.Screen options={{ headerShown: true, title: 'ინციდენტი' }} />
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.borderStrong} />
        <Text style={{ color: theme.colors.inkFaint, fontSize: 15 }}>ინციდენტი ვერ მოიძებნა</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'ინციდენტი',
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 120,
          gap: 14,
        }}
      >
        {/* Header card */}
        <View style={s.headerCard}>
          {badge && (
            <View style={[s.typeBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[s.typeBadgeText, { color: badge.text }]}>
                {INCIDENT_TYPE_LABEL[incident.type]}
              </Text>
            </View>
          )}
          <Text style={s.typeFullLabel}>
            {INCIDENT_TYPE_FULL_LABEL[incident.type] ?? incident.type}
          </Text>
          <Text style={s.dateLine}>
            {formatShortDateTime(incident.date_time)}
          </Text>
          {incident.status === 'draft' && (
            <View style={s.draftChip}>
              <Ionicons name="pencil" size={12} color="#92400E" />
              <Text style={s.draftChipText}>დრაფტი</Text>
            </View>
          )}
        </View>

        {/* Incident details */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>
            {isNearMiss ? 'გარემოება' : 'დაზარალებული'}
          </Text>
          {isNearMiss ? (
            <Text style={s.nearMissNote}>
              საშიში შემთხვევა — დაზიანება არ მომხდარა
            </Text>
          ) : (
            <>
              {incident.injured_name ? (
                <DetailRow
                  icon="person-outline"
                  label="სახელი, გვარი"
                  value={incident.injured_name}
                  theme={theme}
                  s={s}
                />
              ) : null}
              {incident.injured_role ? (
                <DetailRow
                  icon="briefcase-outline"
                  label="თანამდებობა"
                  value={incident.injured_role}
                  theme={theme}
                  s={s}
                />
              ) : null}
            </>
          )}
          <DetailRow
            icon="location-outline"
            label="ადგილი"
            value={incident.location || '—'}
            theme={theme}
            s={s}
          />
          {project && (
            <DetailRow
              icon="business-outline"
              label="პროექტი"
              value={project.company_name || project.name}
              theme={theme}
              s={s}
            />
          )}
        </View>

        {/* Description */}
        {incident.description ? (
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>შემთხვევის გარემოება</Text>
            <Text style={s.bodyText}>{incident.description}</Text>
          </View>
        ) : null}

        {/* Cause */}
        {incident.cause ? (
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>სავარაუდო მიზეზი</Text>
            <Text style={s.bodyText}>{incident.cause}</Text>
          </View>
        ) : null}

        {/* Actions */}
        {incident.actions_taken ? (
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>მიღებული ზომები</Text>
            <Text style={s.bodyText}>{incident.actions_taken}</Text>
          </View>
        ) : null}

        {/* Witnesses */}
        {incident.witnesses?.length > 0 && (
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>მოწმეები</Text>
            {incident.witnesses.map((w, i) => (
              <View key={`${i}-${w}`} style={s.witnessRow}>
                <Ionicons name="person-outline" size={14} color={theme.colors.inkSoft} />
                <Text style={s.witnessText}>{w}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Photos */}
        {photoDisplayUrls.length > 0 && (
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>ფოტო მასალა</Text>
            <View style={s.photoGrid}>
              {photoDisplayUrls.map((uri, i) => (
                <View key={`${i}-${uri}`} style={s.photoThumb}>
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Labour inspection notice */}
        {(incident.type === 'severe' || incident.type === 'fatal') && (
          <View style={s.warningBanner}>
            <Ionicons name="warning" size={18} color="#991B1B" />
            <Text style={s.warningText}>
              შრომის შემოწმების აქტის სამსახური უნდა ეცნობოს 24 საათის
              განმავლობაში:{'\n'}
              <Text
                style={{ fontWeight: '700', textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL('tel:0322430043')}
              >
                0322 43 00 43
              </Text>
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {incident.pdf_url ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              title="PDF გაზიარება"
              leftIcon="share-outline"
              variant="ghost"
              onPress={sharePdf}
              style={{ flex: 1 }}
            />
            <Button
              title={generatingPdf && pdfPhase ? pdfPhase : "განახლება"}
              variant="secondary"
              loading={generatingPdf}
              onPress={generatePdf}
              style={{ flex: 0.6 }}
            />
          </View>
        ) : incident.status === 'draft' ? (
          <View style={{ gap: 10 }}>
            <Button
              title={generatingPdf && pdfPhase ? pdfPhase : pdfUsage?.isLocked ? '🔒 PDF გენერირება' : 'PDF გენერირება'}
              leftIcon="document-text"
              loading={generatingPdf}
              onPress={generatePdf}
              style={{ width: '100%' }}
            />
            <Button
              title="განახლება"
              variant="link"
              onPress={() => router.push(`/incidents/new?projectId=${incident.project_id}` as any)}
              style={{ width: '100%' }}
            />
          </View>
        ) : null}
      </View>
      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
    </View>
  );
}

function DetailRow({
  icon, label, value, theme, s,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon} size={15} color={theme.colors.inkSoft} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    headerCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 18,
      gap: 8,
      shadowColor: theme.colors.ink,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    typeBadge: {
      alignSelf: 'flex-start',
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    typeFullLabel: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.ink,
    },
    dateLine: {
      fontSize: 13,
      color: theme.colors.inkSoft,
    },
    draftChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#FEF3C7',
      borderRadius: 16,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    draftChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#92400E',
    },

    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 14,
      gap: 10,
      shadowColor: theme.colors.ink,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 2,
    },
    nearMissNote: {
      fontSize: 14,
      color: theme.colors.inkSoft,
      fontStyle: 'italic',
    },
    detailRow: {
      flexDirection: 'row',
      gap: 10,
    },
    detailLabel: {
      fontSize: 12,
      color: theme.colors.inkFaint,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    bodyText: {
      fontSize: 14,
      color: theme.colors.ink,
      lineHeight: 22,
    },

    witnessRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    witnessText: {
      fontSize: 14,
      color: theme.colors.ink,
    },

    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    photoThumb: {
      width: 96,
      height: 96,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceSecondary,
    },

    warningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: '#FEF2F2',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#FCA5A5',
      padding: 12,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      color: '#991B1B',
      lineHeight: 20,
    },

    bottomBar: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: 24,
      paddingTop: 12,
    },
  });
}
