// Inspection (act) DETAILS screen — reached by tapping a saved act in a list.
//
// Renders the reusable DocumentDetails shell (type="act"): inspection points,
// editable signatures, certificates, Share PDF. The post-save SUCCESS screen is
// the separate /inspections/[id]/done route (FlowSuccessScreen) — this is NOT
// it. A draft tapped here is redirected into the wizard by useActResult.
//
// All data + the legal signature/PDF logic lives in useActResult so this screen
// and the success screen never drift (captured signatures are never persisted;
// see features/signatures/AGENTS.md).
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CircleAlert, ClipboardCheck, CloudOff } from 'lucide-react-native';
import { Button, Screen } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonCard } from '../../components/Skeleton';
import { SubscriptionNotice } from '../../components/SubscriptionNotice';
import { DocumentDetails, InspectionPointsContent, type DocumentInfoRow } from '../../components/document-details';
import { useActResult } from '../../features/inspection-result';
import { inspectionsApi } from '../../lib/services';
import { invalidateRecordLists } from '../../lib/apiHooks';
import { queryClient } from '../../lib/queryClient';
import { duplicateDocument } from '../../lib/documents/duplicate';
import { routeForInspection } from '../../lib/inspectionRouting';
import { inspectionDisplayName, shortCode } from '../../lib/shared/documentName';
import { friendlyError } from '../../lib/errorMap';
import { haptic } from '../../lib/haptics';
import { useToast } from '../../lib/toast';

export default function InspectionDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const r = useActResult(id);
  const [duplicating, setDuplicating] = useState(false);

  const onDuplicate = useCallback(async () => {
    if (!r.inspection || duplicating) return;
    setDuplicating(true);
    try {
      haptic.medium();
      const { id: newId } = await duplicateDocument({ kind: 'genericInspection', id: r.inspection.id }, qc);
      toast.success(t('details.duplicate.done'));
      router.replace(routeForInspection(r.template?.category, newId, false) as never);
    } catch (e) {
      toast.error(friendlyError(e, t('details.duplicate.failed')));
      setDuplicating(false);
    }
  }, [r.inspection, r.template?.category, duplicating, qc, router, toast, t]);

  const onDelete = useCallback(() => {
    if (!r.inspection) return;
    const inspectionId = r.inspection.id;
    Alert.alert(t('details.delete.title'), t('details.delete.confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await inspectionsApi.remove(inspectionId);
            invalidateRecordLists(queryClient);
            toast.success(t('notifications.deleted'));
            router.back();
          } catch (e) {
            toast.error(friendlyError(e, t('errors.deleteFailed')));
          }
        },
      },
    ]);
  }, [r.inspection, router, toast, t]);

  if (!r.loading && (r.notFound || r.loadError)) {
    return (
      <Screen edges={['bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title={t('inspections.title')} />
        <View style={{ flex: 1 }}>
          <ErrorState
            title={r.notFound ? t('inspections.notFoundTitle') : t('components.errorStateTitle')}
            error={r.loadError ?? undefined}
            message={r.notFound ? t('inspections.notFoundDesc') : undefined}
            icon={r.notFound ? CircleAlert : CloudOff}
            onRetry={r.notFound ? undefined : () => void r.reload()}
            retrying={r.loading}
          />
          <View style={{ padding: 16 }}>
            <Button
              title={t('inspections.backToHome')}
              variant="ghost"
              onPress={() => router.replace('/(tabs)/home' as never)}
            />
          </View>
        </View>
      </Screen>
    );
  }

  if (!r.inspection) {
    return (
      <Screen edges={['bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  const safe = r.inspection.is_safe_for_use !== false;

  const info: DocumentInfoRow[] = [
    { label: t('details.info.project'), value: r.project ? (r.project.company_name || r.project.name) : '—' },
  ];
  if (r.inspection.harness_name) {
    info.push({ label: t('details.info.object'), value: r.inspection.harness_name });
  }
  info.push({ label: t('details.info.date'), value: new Date(r.inspection.created_at).toLocaleDateString('ka-GE') });
  info.push({ label: t('details.info.expert'), value: r.creatorName || '—' });
  info.push({ label: t('details.info.code'), value: shortCode(r.inspection.id) });

  return (
    <>
      <DocumentDetails
        type="act"
        tileIcon={ClipboardCheck}
        title={inspectionDisplayName(r.template?.name)}
        typeLabel={t('details.type.act')}
        status={
          safe
            ? { tone: 'safe', label: t('success.status.safe') }
            : { tone: 'severe', label: t('inspections.notSafe') }
        }
        info={info}
        contentLabel={t('details.content.act')}
        contentTab={t('details.content.act')}
        signatures={{ mode: 'edit', state: r.signatures, creatorName: r.creatorName }}
        certificates={{
          items: r.certItems,
          onAdd: r.openCertificatesSheet,
          onOpen: () => r.openCertificatesSheet(),
        }}
        onEdit={r.onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        editing={r.reopening}
        duplicating={duplicating}
        onSharePdf={r.downloadPdf}
        sharing={r.downloading}
        pdfLocked={r.pdfLocked}
        onBack={() => router.back()}
      >
        <InspectionPointsContent questions={r.questions} answers={r.answers} />
      </DocumentDetails>
      <SubscriptionNotice visible={r.limitNoticeVisible} onClose={() => r.setLimitNoticeVisible(false)} />
    </>
  );
}
