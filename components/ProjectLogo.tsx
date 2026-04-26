import { Image, StyleSheet, Text, View } from 'react-native';

const BRAND_GREEN = '#1D9E75';

function initials(name: string | null | undefined): string {
  if (!name) return '??';
  const trimmed = name.trim();
  if (!trimmed) return '??';
  const chars = Array.from(trimmed);
  return chars.slice(0, 2).join('').toUpperCase();
}

export function ProjectLogo({
  uri,
  name,
  size = 48,
}: {
  uri?: string | null;
  name: string | null | undefined;
  size?: number;
}) {
  const radius = Math.round(size * 0.22);
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.box, { width: size, height: size, borderRadius: radius }]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={[
        styles.box,
        styles.fallback,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.38) }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
