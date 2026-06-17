import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { MapPin, Map } from 'lucide-react-native';
import { useTheme } from '../lib/theme';

export type LatLng = { latitude: number; longitude: number };

type Props = {
  value: LatLng | null;
  onChange: (loc: LatLng | null) => void;
  address: string;
  onAddressChange: (s: string) => void;
  height?: number;
};

// Web fallback: no native map. Address text is the source of truth.
// (Geocoding was removed with the expo-location dependency, 2026-06.)
export function MapPicker({ value, onChange, address, onAddressChange, height = 220 }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  void onChange; // pin editing is mobile-only; web keeps the same props shape

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <MapPin size={16} color={theme.colors.inkFaint} strokeWidth={1.5} />
        <TextInput
          value={address}
          onChangeText={onAddressChange}
          placeholder="მისამართი"
          placeholderTextColor={theme.colors.inkFaint}
          style={styles.searchInput}
        />
      </View>
      <View style={[styles.mapWrap, { height }]}>
        <View style={styles.placeholder}>
          <Map size={28} color={theme.colors.inkFaint} strokeWidth={1.5} />
          <Text style={styles.placeholderText}>
            რუკა ხელმიუწვდომელია ვებში - გამოიყენეთ მისამართის ველი
          </Text>
          {value ? (
            <Text style={styles.coords}>
              {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  wrap: { gap: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.ink, padding: 0 },
  searchErr: { color: theme.colors.danger, fontSize: 12, paddingHorizontal: 4 },
  mapWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    backgroundColor: theme.colors.subtleSurface,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
  },
  placeholderText: {
    fontSize: 12,
    color: theme.colors.inkFaint,
    textAlign: 'center',
  },
  coords: { fontSize: 12, color: theme.colors.ink, fontWeight: '600' },
});
}
