// Instruction (briefing) done screen.
//
// Renders the unified FlowSuccessScreen in the "instruction" config: signatures
// are VIEW-ONLY here (the inspector + participants signed during the signing
// step), there are no certificates, and the primary action shares the briefing
// PDF. Thin loader: fetch the briefing + project, map the signers, share.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlowSuccessScreen } from '../../../components/success';
import { Screen } from '../../../components/ui';
import { SkeletonCard } from '../../../components/Skeleton';
import { generateAndSharePdf, PdfLimitReachedError } from '../../../lib/pdfOpen';
import { useSession } from '../../../lib/session';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { usePdfUsage, useInvalidatePdfUsage } from '../../../lib/usePdfUsage';
import { briefingsApi } from '../../../lib/briefingsApi';
import { buildBriefingPdfHtml } from '../../../lib/briefingPdf';
import { generatePdfName } from '../../../lib/pdfName';
import { projectsApi } from '../../../lib/services';
import type { Briefing, Project } from '../../../types/models';

export default function BriefingDoneScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const session = useSession();
  const [sharing, setSharing] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  useEffect(() => {
    if (!id) return;
    briefingsApi.getById(id).then(async (b) => {
      if (!b) return;
      setBriefing(b);
      const p = await projectsApi.getById(b.projectId).catch(() => null);
      setProject(p);
    });
  }, [id]);

  // People who signed during the flow — inspector first, then participants.
  const participants = useMemo(() => {
    if (!briefing) return [];
    return [
      { name: briefing.inspectorName, signed: !!briefing.inspectorSignature },
      ...briefing.participants.map((p) => ({ name: p.name, signed: !!p.signature })),
    ];
  }, [briefing]);

  const sharePdf = useCallback(async () => {
    if (!briefing || !project) return;
    if (pdfUsage?.isLocked) { setLimitNoticeVisible(true); return; }
    setSharing(true);
    try {
      const html = buildBriefingPdfHtml(briefing, project);
      const pdfName = generatePdfName(project.company_name || project.name, 'ინსტრუქტაჟი', new Date(briefing.dateTime), briefing.id);
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, userId, {
        title: 'ინსტრუქტაჟი',
        author: briefing.inspectorName || undefined,
        documentId: briefing.id,
        subject: 'შრომის უსაფრთხოების ინსტრუქტაჟი',
      });
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setLimitNoticeVisible(true); return; }
      Alert.alert(t('common.error'), t('briefings.pdfGenerateFailed'));
    } finally {
      setSharing(false);
    }
  }, [briefing, project, pdfUsage, invalidatePdfUsage, session.state, t]);

  if (!briefing || !project) {
    return (
      <Screen edges={['bottom']}>
        <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  return (
    <>
      <FlowSuccessScreen
        flow="instruction"
        participants={participants}
        onSharePdf={sharePdf}
        sharing={sharing}
        pdfLocked={pdfUsage?.isLocked}
        onBackEdit={() => router.replace(`/briefings/${id}` as any)}
        onBackHome={() => router.replace('/(tabs)/home' as any)}
      />
      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
    </>
  );
}
