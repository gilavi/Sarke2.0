import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, Home } from 'lucide-react-native';
import { Card } from '../../../components/ui';
import { SuccessScreen } from '../../../components/success';
import { useTheme } from '../../../lib/theme';
import { useIncident, useProject } from '../../../lib/apiHooks';
import { INCIDENT_TYPE_FULL_LABEL } from '../../../types/models';
import { formatShortDateTime } from '../../../lib/formatDate';
import { incidentColors } from '../../../lib/statusColors';

export default function IncidentSuccessScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: incident } = useIncident(id);
  const { data: project } = useProject(incident?.project_id);

  const badge = incident ? incidentColors(isDark)[incident.type] : null;

  return (
    <SuccessScreen
      title="ინციდენტი შენახულია!"
      subtitle="ყველა მონაცემი შენახულია. PDF ოქმის ნახვა და გაზიარება შეგიძლიათ ინციდენტის გვერდიდან."
      primary={{
        title: 'ინციდენტის ნახვა',
        icon: FileText,
        onPress: () => router.replace(`/incidents/${id}` as any),
      }}
      actions={[
        {
          icon: Home,
          title: 'მთავარ გვერდზე',
          subtitle: 'დაბრუნდი საწყის გვერდზე',
          onPress: () => router.replace('/(tabs)/home' as any),
        },
      ]}
    >
      {incident ? (
        <Card>
          <Text style={styles.eyebrow}>შეჯამება</Text>
          {badge ? (
            <View style={[styles.typeBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.typeBadgeText, { color: badge.text }]}>
                {INCIDENT_TYPE_FULL_LABEL[incident.type]}
              </Text>
            </View>
          ) : null}
          {project ? <Text style={styles.metaText}>{project.name}</Text> : null}
          <Text style={styles.metaText}>{formatShortDateTime(incident.date_time)}</Text>
          {incident.location ? <Text style={styles.metaText}>{incident.location}</Text> : null}
          {incident.description ? (
            <Text style={styles.descText} numberOfLines={3}>
              {incident.description}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </SuccessScreen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    eyebrow: {
      fontSize: 11,
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '700',
    },
    typeBadge: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 6,
      marginBottom: 2,
    },
    typeBadgeText: { fontSize: 12, fontWeight: '700' },
    metaText: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 3 },
    descText: { marginTop: 8, color: theme.colors.ink, fontSize: 14, lineHeight: 20 },
  });
}
