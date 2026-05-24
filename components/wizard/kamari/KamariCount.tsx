import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../primitives/A11yText';
import { useTheme } from '../../../lib/theme';
import { useAccessibilitySettings } from '../../../lib/accessibility';
import { haptic } from '../../../lib/haptics';
import { BRAND_GREEN } from './_shared';
import { getstyles } from './styles';

// ─────────────────────────── Step 1: Count ──────────────────────────────────

export const KamariCount = memo(function KamariCount({
  count,
  onChange,
  max,
}: {
  count: number;
  onChange: (n: number) => void;
  max: number;
}) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const dec = () => {
    if (count <= 1) return;
    haptic.light();
    onChange(count - 1);
  };
  const inc = () => {
    if (count >= max) return;
    haptic.light();
    onChange(count + 1);
  };
  return (
    <View style={styles.countWrap}>
      <Text size="2xl" weight="bold" style={styles.countTitle}>
        რამდენი ქამარია?
      </Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={dec}
          disabled={count <= 1}
          hitSlop={12}
          style={({ pressed }) => [pressed && { opacity: 0.6 }, count <= 1 && { opacity: 0.35 }]}
        >
          <Ionicons name="remove-circle" size={52} color={BRAND_GREEN} />
        </Pressable>
        <View style={styles.countNumberWrap}>
          <Text style={styles.countNumber}>{count}</Text>
        </View>
        <Pressable
          onPress={inc}
          disabled={count >= max}
          hitSlop={12}
          style={({ pressed }) => [pressed && { opacity: 0.6 }, count >= max && { opacity: 0.35 }]}
        >
          <Ionicons name="add-circle" size={52} color={BRAND_GREEN} />
        </Pressable>
      </View>
    </View>
  );
});