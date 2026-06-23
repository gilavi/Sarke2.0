import { useLocalSearchParams } from 'expo-router';
import { BreathalyzerLogScreen } from '../../../../../features/breathalyzer-log';

export default function BreathalyzerLogRoute() {
  const { id, logId } = useLocalSearchParams<{ id: string; logId?: string }>();
  if (!id) return null;
  return <BreathalyzerLogScreen projectId={id} logId={logId} />;
}
