import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui';
import { theme } from '../../lib/theme';

const items = [
  {
    title: 'საქართველოს შრომის უსაფრთხოების კოდექსი',
    description: 'ძირითადი საკანონმდებლო აქტი შრომის უსაფრთხოების სფეროში.',
    url: 'https://matsne.gov.ge/ka/document/view/4486188',
  },
  {
    title: 'ფასადის ხარაჩოები — ტექნიკური რეგლამენტი',
    description: 'ხარაჩოების აწყობისა და ექსპლუატაციის წესები.',
  },
  {
    title: 'სიმაღლიდან ვარდნისგან დამცავი საშუალებები',
    description: 'ქამრების, თოკების, კარაბინების შერჩევა, შემოწმება.',
  },
];

export default function RegulationsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.ink, padding: 20 }}>
        რეგულაციები
      </Text>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {items.map(item => (
          <Card key={item.title}>
            <Text style={{ fontWeight: '600', fontSize: 16, color: theme.colors.ink }}>
              {item.title}
            </Text>
            <Text style={{ color: theme.colors.inkSoft, marginTop: 4 }}>{item.description}</Text>
            {item.url ? (
              <Text
                onPress={() => Linking.openURL(item.url!)}
                style={{ color: theme.colors.accent, marginTop: 8, fontSize: 12 }}
              >
                ბმული
              </Text>
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
