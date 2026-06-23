import { useLocalSearchParams } from 'expo-router';
import { AddEntryWizard } from '../../../../../features/breathalyzer-log';

export default function AddBreathalyzerEntryRoute() {
  const { id, logId, repeatForId } = useLocalSearchParams<{
    id: string;
    logId: string;
    repeatForId?: string;
  }>();
  if (!id || !logId) return null;
  return <AddEntryWizard projectId={id} logId={logId} repeatForId={repeatForId} />;
}
