import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAccessibilitySettings } from '../../lib/accessibility';

const PARTICLE_COUNT = 50;
const DURATION_MS = 1800;
const DURATION_S = DURATION_MS / 1000;
const GRAVITY = 1400;

const COLORS = [
  '#FF6B6B',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
  '#B266FF',
  '#FF8E72',
];

interface Particle {
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: 'rect' | 'circle';
  rotationSpeed: number;
  initialRotation: number;
  fadeStart: number;
}

function createParticle(): Particle {
  // Bias upward with a wide spread so confetti explodes up-and-out, then falls.
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
  const speed = 250 + Math.random() * 350;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 4 + Math.random() * 5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
    rotationSpeed: (Math.random() - 0.5) * 8,
    initialRotation: Math.random() * Math.PI * 2,
    fadeStart: 0.5 + Math.random() * 0.2,
  };
}

function ConfettiPiece({
  particle,
  progress,
}: {
  particle: Particle;
  progress: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value * DURATION_S;
    const tx = particle.vx * t;
    const ty = particle.vy * t + 0.5 * GRAVITY * t * t;
    const rot = particle.initialRotation + particle.rotationSpeed * t;
    const fadeRange = 1 - particle.fadeStart;
    const fadeProgress = Math.max(
      0,
      (progress.value - particle.fadeStart) / fadeRange
    );
    const opacity = 1 - fadeProgress;
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${rot}rad` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          borderRadius: particle.shape === 'circle' ? particle.size / 2 : 1,
          marginLeft: -particle.size / 2,
          marginTop: -particle.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

function Ring({ progress }: { progress: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    // Ring expands and fades inside the first ~700ms (first ~38% of the run).
    const ringT = Math.min(1, progress.value / 0.38);
    const eased = 1 - (1 - ringT) * (1 - ringT) * (1 - ringT);
    const scale = 0.2 + eased * 5.5;
    const opacity = (1 - eased) * 0.7;
    return {
      transform: [{ scale }],
      opacity,
    };
  });
  return <Animated.View style={[styles.ring, animatedStyle]} />;
}

export function CelebrationBurst() {
  const { reduceMotion } = useAccessibilitySettings();
  const [done, setDone] = useState(false);
  const progress = useSharedValue(0);
  const { width, height } = useWindowDimensions();

  const particles = useMemo<Particle[]>(
    () => Array.from({ length: PARTICLE_COUNT }, createParticle),
    []
  );

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withTiming(1, {
      duration: DURATION_MS,
      easing: Easing.linear,
    });
    const timer = setTimeout(() => setDone(true), DURATION_MS + 50);
    return () => clearTimeout(timer);
  }, [reduceMotion, progress]);

  if (reduceMotion || done) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { width, height }]}
    >
      <View style={styles.center}>
        <Ring progress={progress} />
        {particles.map((p, i) => (
          <ConfettiPiece key={i} particle={p} progress={progress} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  center: {
    position: 'absolute',
    top: '28%',
    left: '50%',
  },
  particle: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});
