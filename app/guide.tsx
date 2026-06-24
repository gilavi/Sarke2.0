import { useMemo, useRef, useState, useCallback } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  Animated,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { A11yText as Text } from '../components/primitives/A11yText';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const PARTS_DATA = {
  frame_left: {
    titleKey: 'guide.frameLeft' as const,
    title_eng: 'Left Vertical Frame',
    steps: [
      'Place on firm, level surface. No dirt or debris under legs.',
      'Check all spring clips / pins are locked and seated fully.',
      'Use a level - frame must be plumb (vertical) within 1°.',
      'Ensure coupling pins are greased and slide freely.',
    ],
  },
  frame_right: {
    titleKey: 'guide.frameRight' as const,
    title_eng: 'Right Vertical Frame',
    steps: [
      'Mirror the left frame exactly. Both must be parallel.',
      'Brace connection holes must align perfectly before inserting braces.',
      'Never climb until both frames are independently stable.',
    ],
  },
  cross_brace: {
    titleKey: 'guide.crossBrace' as const,
    title_eng: 'Cross Bracing',
    steps: [
      'Install braces BEFORE climbing or loading the platform.',
      'Hook one end first, then stretch and lock the opposite end.',
      'Never omit braces - they provide 70% of lateral stability.',
      'Check tension: brace should not rattle or bow under hand pressure.',
    ],
  },
  platform: {
    titleKey: 'guide.platform' as const,
    title_eng: 'Platform / Deck',
    steps: [
      'Deck must overhang the frame by minimum 150mm on both sides.',
      'Check for cracks, warping, or oil contamination before placing.',
      'Secure with deck locks; platform should not shift when kicked.',
      'Max load: 250kg evenly distributed. Mark load limit visibly.',
    ],
  },
  guardrail: {
    titleKey: 'guide.guardrail' as const,
    title_eng: 'Guardrails',
    steps: [
      'Top rail height: 1.0–1.2m from platform surface.',
      'Mid-rail required. Toe-board required if objects can fall.',
      'Install guardrails BEFORE ascending to platform height.',
      'Check all rail clips are fully closed and locked.',
    ],
  },
  wheels: {
    titleKey: 'guide.wheels' as const,
    title_eng: 'Casters / Wheels',
    steps: [
      'Brakes must be engaged before anyone steps onto the scaffold.',
      'Wheels rated for hard flat surfaces only - never gravel slopes.',
      'If scaffold height > 3m, replace wheels with base plates.',
      'Inspect wheel locks daily; replace worn casters immediately.',
    ],
  },
} as const;

type PartKey = keyof typeof PARTS_DATA;

const HOTSPOTS: { key: PartKey; x: number; y: number; w: number; h: number }[] = [
  { key: 'frame_left', x: 0.15, y: 0.28, w: 0.14, h: 0.48 },
  { key: 'frame_right', x: 0.71, y: 0.28, w: 0.14, h: 0.48 },
  { key: 'cross_brace', x: 0.33, y: 0.40, w: 0.34, h: 0.28 },
  { key: 'platform', x: 0.22, y: 0.32, w: 0.56, h: 0.10 },
  { key: 'guardrail', x: 0.18, y: 0.22, w: 0.64, h: 0.10 },
  { key: 'wheels', x: 0.28, y: 0.74, w: 0.44, h: 0.14 },
];

export default function GuideScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<PartKey | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const openPanel = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const closePanel = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelected(null));
  }, [slideAnim]);

  const onSelect = useCallback(
    (key: PartKey) => {
      setSelected(key);
      openPanel();
    },
    [openPanel]
  );

  const panelTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H * 0.5, 0],
  });

  const data = selected ? PARTS_DATA[selected] : null;

  const styles = useMemo(() => getStyles(), []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={24} color="#cbd5e1" strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('guide.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.inner}>
        {/* Hint pill */}
        {!selected && (
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>
              {t('guide.hint')}
            </Text>
          </View>
        )}

        {/* Image + hotspots */}
        <View style={styles.imageWrap}>
          <Image
            source={require('../assets/images/scaffold.png')}
            style={styles.image}
            contentFit="contain"
            transition={0}
          />
          {HOTSPOTS.map((h) => {
            const active = selected === h.key;
            return (
              <Pressable
                key={h.key}
                onPress={() => onSelect(h.key)}
                style={[
                  styles.hotspot,
                  {
                    left: `${h.x * 100}%`,
                    top: `${h.y * 100}%`,
                    width: `${h.w * 100}%`,
                    height: `${h.h * 100}%`,
                  },
                  active && styles.hotspotActive,
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Bottom panel */}
      <Animated.View
        style={[
          styles.panel,
          { transform: [{ translateY: panelTranslateY }] },
        ]}
        pointerEvents={selected ? 'auto' : 'none'}
      >
        {data && (
          <View>
            <View style={styles.panelHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.titleGeo}>{t(data.titleKey)}</Text>
                <Text style={styles.titleEng}>{data.title_eng}</Text>
              </View>
              <Pressable onPress={closePanel} style={styles.closeBtn} hitSlop={8}>
                <X size={22} color="#94a3b8" strokeWidth={1.5} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: SCREEN_H * 0.32 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {data.steps.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

function getStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0f172a',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 10,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      color: '#ffffff',
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
    },
    inner: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 12,
    },
    hintPill: {
      backgroundColor: '#1e293b',
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginHorizontal: 20,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#334155',
    },
    hintText: {
      color: '#cbd5e1',
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 17,
    },
    imageWrap: {
      width: SCREEN_W * 0.95,
      height: SCREEN_H * 0.72,
      position: 'relative',
      alignSelf: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    hotspot: {
      position: 'absolute',
      backgroundColor: 'transparent',
      borderRadius: 8,
    },
    hotspotActive: {
      borderWidth: 2,
      borderColor: 'rgba(59,130,246,0.6)',
      backgroundColor: 'rgba(59,130,246,0.15)',
    },
    panel: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: SCREEN_H * 0.45,
      backgroundColor: '#1e293b',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 10,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    titleGeo: {
      color: '#ffffff',
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 2,
    },
    titleEng: {
      color: '#94a3b8',
      fontSize: 13,
      fontWeight: '500',
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#334155',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 14,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#3b82f6',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    stepNumberText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    stepText: {
      flex: 1,
      color: '#cbd5e1',
      fontSize: 14,
      lineHeight: 20,
    },
  });
}
