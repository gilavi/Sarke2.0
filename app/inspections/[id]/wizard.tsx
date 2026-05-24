import { useLocalSearchParams } from 'expo-router';
import { InspectionWizard } from '../../../features/inspection-wizard';

export default function QuestionnaireWizardRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <InspectionWizard inspectionId={id} />;
}
