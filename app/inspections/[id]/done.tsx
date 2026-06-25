// Inspection (act) SUCCESS screen — the post-save destination.
//
// The generic/harness wizard finishes by routing here. This renders the unified
// FlowSuccessScreen in the "act" config (verdict hero + editable signatures +
// certificates + Share PDF). It is reached ONLY post-save; tapping a saved act
// from a list goes to /inspections/[id] (DocumentDetails) instead.
//
// All data + the legal signature/PDF logic lives in useActResult so this screen
// and the details screen never drift. Captured signatures are never persisted
// (see features/signatures/AGENTS.md).
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlowSuccessScreen } from '../../../components/success';
import { Screen } from '../../../components/ui';
import { SkeletonCard } from '../../../components/Skeleton';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { useActResult } from '../../../features/inspection-result';

export default function InspectionDoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useActResult(id);

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

  return (
    <>
      <FlowSuccessScreen
        flow="act"
        hero={
          safe
            ? { tone: 'safe', label: t('success.status.safe') }
            : { tone: 'severe', label: t('inspections.notSafe') }
        }
        signatures={r.signatures}
        creatorName={r.creatorName}
        certificates={r.certItems}
        onAddCertificate={r.openCertificatesSheet}
        onOpenCertificate={() => r.openCertificatesSheet()}
        onBackEdit={r.reopening ? undefined : r.onEdit}
        onSharePdf={r.downloadPdf}
        sharing={r.downloading}
        pdfLocked={r.pdfLocked}
        onBackHome={() => router.replace('/(tabs)/home' as never)}
      />
      <SubscriptionNotice visible={r.limitNoticeVisible} onClose={() => r.setLimitNoticeVisible(false)} />
    </>
  );
}
