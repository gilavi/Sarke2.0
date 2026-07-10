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
import { X } from 'lucide-react-native';
import { A11yText as Text } from '../components/primitives/A11yText';
import { ScreenHeader } from '../components/ScreenHeader';
import { useTheme, withOpacity, type Theme } from '../lib/theme';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Each scaffold part maps to a localized title + a localized array of numbered
// steps (locales/*.json → guide.*). No copy is hardcoded here — the screen is
// Georgian-native like the rest of the app, with English parity for `en`.
const PARTS_DATA = {
  frame_left: { titleKey: 'guide.frameLeft', stepsKey: 'guide.frameLeftSteps' },
  frame_right: { titleKey: 'guide.frameRight', stepsKey: 'guide.frameRightSteps' },
  cross_brace: { titleKey: 'guide.crossBrace', stepsKey: 'guide.crossBraceSteps' },
  platform: { titleKey: 'guide.platform', stepsKey: 'guide.platformSteps' },
  guardrail: { titleKey: 'guide.guardrail', stepsKey: 'guide.guardrailSteps' },
  wheels: { titleKey: 'guide.wheels', stepsKey: 'guide.wheelsSteps' },
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
  const { t } = useTranslation();
  const { theme } = useTheme();
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
  const rawSteps = data ? t(data.stepsKey, { returnObjects: true }) : [];
  const steps: string[] = Array.isArray(rawSteps) ? (rawSteps as string[]) : [];

  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('guide.title')} />

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
              </View>
              <Pressable onPress={closePanel} style={styles.closeBtn} hitSlop={8}>
                <X size={22} color={theme.colors.inkSoft} strokeWidth={1.5} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: SCREEN_H * 0.32 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {steps.map((step, idx) => (
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
    </View>
  );
}

function getStyles(theme: Theme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    inner: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 12,
    },
    hintPill: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginHorizontal: 20,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    hintText: {
      color: c.inkSoft,
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
      borderColor: withOpacity(c.accent, 0.6),
      backgroundColor: withOpacity(c.accent, 0.15),
    },
    panel: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: SCREEN_H * 0.45,
      backgroundColor: c.surfaceElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...theme.shadows.lg,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    titleGeo: {
      color: c.ink,
      fontSize: 17,
      fontWeight: '700',
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surfaceSecondary,
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
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    stepNumberText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    stepText: {
      flex: 1,
      color: c.inkSoft,
      fontSize: 14,
      lineHeight: 20,
    },
  });
}
