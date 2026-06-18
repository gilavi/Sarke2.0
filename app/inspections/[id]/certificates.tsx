// Equipment-certificate management for one inspection — a real pushed screen
// (was a modal CertificatesActionSheet). Hosting it as a route lets the photo
// picker use the canonical /photo-picker flow, keeps the Save button above the
// keyboard, and gives it the app's standard back button. The result screen
// rebuilds its PDF preview on return via the certDirty signal.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../components/ui';
import { CertificatesManager } from '../../../components/certificates/CertificatesManager';

export default function CertificatesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <CertificatesManager inspectionId={id} onClose={() => router.back()} />
    </Screen>
  );
}
