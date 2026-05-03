import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const BRAND = '#1D9E75';
const BRAND_DARK = '#0F6E56';

interface TourSlide {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

const TOUR_SLIDES: TourSlide[] = [
  {
    key: 'tap-good',
    icon: 'checkmark-circle-outline',
    title: 'შეაფასეთ თითოეული პუნქტი',
    body: 'თითოეული პუნქტი ცალ-ცალკე გამოჩნდება. თუ ყველაფერი რიგზეა, დააჭირეთ «გამართულია» — სისტემა ავტომატურად გადაგიყვანთ შემდეგ პუნქტზე.',
  },
  {
    key: 'tap-problem',
    icon: 'warning-outline',
    title: 'მხოლოდ პრობლემების შემთხვევაში',
    body: 'თუ რამე ხარვეზი შეამჩნიეთ, აირჩიეთ «ხარვეზია» ან «გამოუსადეგია». გამოჩნდება ველი კომენტარისა და ფოტოს დასამატებლად.',
  },
  {
    key: 'resume',
    icon: 'refresh-circle-outline',
    title: 'შეგიძლიათ გააგრძელოთ მოგვიანებით',
    body: 'თქვენი პროგრესი ავტომატურად ინახება. დატოვებისას შემოწმებას ზუსტად იქიდან გააგრძელებთ, სადაც შეჩერდით.',
  },
];

const TOUR_SEEN_KEY = 'checklist-tour-seen';

export { TOUR_SEEN_KEY };

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ChecklistTour({ visible, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<TourSlide>>(null);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) setIndex(i);
  };

  const goNext = () => {
    if (index < TOUR_SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      onClose();
    }
  };

  const isLast = index === TOUR_SLIDES.length - 1;
  const total = TOUR_SLIDES.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.stepCounter}>
              {index + 1} / {total}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel="გამოტოვება"
            >
              <Text style={styles.skipText}>გამოტოვება</Text>
            </Pressable>
          </View>

          <Text style={styles.intro}>შემოწმების აქტის შევსება — სწრაფად და მარტივად</Text>

          <FlatList
            ref={listRef}
            data={TOUR_SLIDES}
            keyExtractor={item => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={[styles.page, { width: SCREEN_W }]}>
                <View style={styles.card}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={item.icon} size={64} color={BRAND} />
                  </View>
                  <Text style={styles.title}>{item.title}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.copy}>{item.body}</Text>
                </View>
              </View>
            )}
          />

          <View style={styles.dots}>
            {TOUR_SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </SafeAreaView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.btnText}>{isLast ? 'დაწყება' : 'შემდეგი'}</Text>
            {!isLast ? (
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            ) : null}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
    stepCounter: {
      fontSize: 13,
      fontWeight: '700',
      color: BRAND,
    },
    skipBtn: {
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    skipText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.inkSoft,
      textDecorationLine: 'underline',
    },
    intro: {
      fontSize: 13,
      color: BRAND_DARK,
      textAlign: 'center',
      paddingHorizontal: 24,
      paddingTop: 6,
      paddingBottom: 12,
      fontWeight: '600',
    },
    page: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 8,
    },
    card: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      paddingVertical: 36,
      paddingHorizontal: 24,
      alignItems: 'center',
      gap: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconWrap: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
      paddingHorizontal: 4,
    },
    divider: {
      width: 40,
      height: 3,
      borderRadius: 2,
      backgroundColor: BRAND,
      opacity: 0.4,
    },
    copy: {
      fontSize: 15,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 4,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.accentSoft,
    },
    dotActive: {
      width: 22,
      backgroundColor: BRAND,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 8,
      backgroundColor: theme.colors.surface,
    },
    btn: {
      flexDirection: 'row',
      backgroundColor: BRAND,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: BRAND_DARK,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    btnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
