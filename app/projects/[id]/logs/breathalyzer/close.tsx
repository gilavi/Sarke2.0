import { useLocalSearchParams } from 'expo-router';
import { CloseShiftScreen } from '../../../../../features/breathalyzer-log';

export default function CloseBreathalyzerShiftRoute() {
  const { id, logId } = useLocalSearchParams<{ id: string; logId: string }>();
  if (!id || !logId) return null;
  return <CloseShiftScreen projectId={id} logId={logId} />;
}
