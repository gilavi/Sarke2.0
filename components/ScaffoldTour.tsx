import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { QuestionAvatar } from './QuestionAvatar';
import { SCAFFOLD_HELP, ScaffoldHelpEntry } from '../lib/scaffoldHelp';

const BRAND = '#1D9E75';
const BRAND_DARK = '#0F6E56';
const TINT = '#E8F5F0';
const { width: SCREEN_W } = Dimensions.get('window');

export function ScaffoldTour({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<ScaffoldHelpEntry>>(null);
  const insets = useSafeAreaInsets();

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) setIndex(i);
  };

  const goNext = () => {
    if (index < SCAFFOLD_HELP.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      onClose();
    }
  };

  const isLast = index === SCAFFOLD_HELP.length - 1;
  const total = SCAFFOLD_HELP.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Distinctive tour header — green band, makes it obvious you're in a tour */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                <Text style={styles.badgeText}>გაცნობითი ტური</Text>
              </View>
              <Text style={styles.stepCounter}>
                {index + 1} / {total}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel="გამოტოვება"
            >
              <Text style={styles.skipText}>გამოტოვება</Text>
            </Pressable>
          </View>

          <Text style={styles.intro}>
            გაიცანი ხარაჩოს კომპონენტები შემოწმებამდე
          </Text>

          <FlatList
            ref={listRef}
            data={SCAFFOLD_HELP}
            keyExtractor={item => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={[styles.page, { width: SCREEN_W }]}>
                <View style={styles.card}>
                  <View style={styles.illustrationWrap}>
                    <QuestionAvatar illustrationKey={item.key} size={180} />
                  </View>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.copy}>{item.oneLiner}</Text>
                </View>
              </View>
            )}
          />

          <View style={styles.dots}>
            {SCAFFOLD_HELP.map((_, i) => (
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TINT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  stepCounter: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_DARK,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#0F6E56',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  illustrationWrap: {
    marginTop: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
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
    color: '#374151',
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
    backgroundColor: '#C7E5D9',
  },
  dotActive: {
    width: 22,
    backgroundColor: BRAND,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: TINT,
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
