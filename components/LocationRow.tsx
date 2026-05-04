import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { A11yText as Text } from './primitives/A11yText';
import { MapPreview } from './MapPreview';
import type { LatLng } from './MapPicker';

interface LocationRowProps {
  pin: LatLng | null;
  address: string;
  onPress: () => void;
}

export function LocationRow({ pin, address, onPress }: LocationRowProps) {
  const { theme } = useTheme();

  if (!pin) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.emptyRow,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: theme.colors.hairline,
          },
        ]}
      >
        <Ionicons name="location-outline" size={20} color={theme.colors.accent} />
        <Text style={[styles.emptyText, { color: theme.colors.inkSoft }]}>
          დააჭირეთ მდებარეობის ასარჩევად
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress}>
      <View style={styles.pinned}>
        <MapPreview
          latitude={pin.latitude}
          longitude={pin.longitude}
          pinColor={theme.colors.accent}
          style={styles.mapPreview}
        />
        {address ? (
          <Text style={[styles.address, { color: theme.colors.inkSoft }]} numberOfLines={2}>
            {address}
          </Text>
        ) : null}
        <Text style={[styles.changeLink, { color: theme.colors.accent }]}>
          შეცვლა
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pinned: {
    gap: 8,
  },
  mapPreview: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  address: {
    fontSize: 13,
  },
  changeLink: {
    fontSize: 13,
    fontWeight: '600',
  },
});
