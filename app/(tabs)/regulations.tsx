import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect, G } from 'react-native-svg';
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

function HeaderIllustration() {
  return (
    <Svg width={200} height={120} viewBox="0 0 200 120">
      {/* Background circle */}
      <Circle cx={100} cy={60} r={50} fill={theme.colors.regsSoft} opacity={0.5} />
      {/* Scale / balance */}
      <Line x1={100} y1={30} x2={100} y2={80} stroke={theme.colors.regsTint} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={70} y1={40} x2={130} y2={40} stroke={theme.colors.regsTint} strokeWidth={2} strokeLinecap="round" />
      {/* Left scale pan */}
      <Path d="M70 40 L60 55 L80 55 Z" fill={theme.colors.regsSoft} stroke={theme.colors.regsTint} strokeWidth={1.5} />
      <Line x1={60} y1={55} x2={80} y2={55} stroke={theme.colors.regsTint} strokeWidth={1.5} />
      {/* Right scale pan */}
      <Path d="M130 40 L120 55 L140 55 Z" fill={theme.colors.regsSoft} stroke={theme.colors.regsTint} strokeWidth={1.5} />
      <Line x1={120} y1={55} x2={140} y2={55} stroke={theme.colors.regsTint} strokeWidth={1.5} />
      {/* Base */}
      <Rect x={88} y={80} width={24} height={6} rx={3} fill={theme.colors.regsTint} />
      <Rect x={80} y={86} width={40} height={5} rx={2.5} fill={theme.colors.regsTint} opacity={0.6} />
      {/* Document with checkmark (left pan) */}
      <G opacity={0.8}>
        <Rect x={64} y={46} width={10} height={12} rx={1} fill="#fff" stroke={theme.colors.regsTint} strokeWidth={0.8} />
        <Path d="M66 52l2 2 4-4" stroke={theme.colors.regsTint} strokeWidth={1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {/* Hard hat (right pan) */}
      <G opacity={0.8}>
        <Path d="M125 48c-3 0-5 2-5 4h10c0-2-2-4-5-4z" fill={theme.colors.warnSoft} stroke={theme.colors.warn} strokeWidth={0.8} />
        <Rect x={124} y={51} width={4} height={1.5} rx={0.75} fill={theme.colors.warn} />
      </G>
      {/* Small decorative stars */}
      <Path d="M40 35l1 2 2 0-1.5 1.5 0.5 2-2-1-2 1 0.5-2-1.5-1.5 2 0z" fill={theme.colors.regsTint} opacity={0.3} />
      <Path d="M160 45l1 2 2 0-1.5 1.5 0.5 2-2-1-2 1 0.5-2-1.5-1.5 2 0z" fill={theme.colors.regsTint} opacity={0.3} />
    </Svg>
  );
}

export default function RegulationsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      {/* Visual header */}
      <View style={styles.header}>
        <HeaderIllustration />
        <Text style={styles.headerTitle}>რეგულაციები</Text>
        <Text style={styles.headerSubtitle}>
          შრომის უსაფრთხოების საკანონმდებლო ბაზა და ტექნიკური რეგლამენტები
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {items.map((item, index) => (
          <Card key={item.title} style={{ overflow: 'hidden' }}>
            <View style={styles.cardAccent} />
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                  {item.url ? (
                    <Text
                      onPress={() => Linking.openURL(item.url!)}
                      style={styles.cardLink}
                    >
                      ბმული →
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.ink,
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 300,
  },
  cardAccent: {
    height: 3,
    backgroundColor: theme.colors.regsTint,
    opacity: 0.8,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.regsSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numberText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.regsTint,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 15,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  cardDescription: {
    color: theme.colors.inkSoft,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  cardLink: {
    color: theme.colors.accent,
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
});
