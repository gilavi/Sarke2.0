import { useState , useMemo} from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../lib/theme';

import { logError } from '../lib/logError';

export type LatLng = { latitude: number; longitude: number };

type Props = {
  value: LatLng | null;
  onChange: (loc: LatLng | null) => void;
  address: string;
  onAddressChange: (s: string) => void;
  height?: number;
};

// Web fallback: no native map. Address text is the source of truth, with a
// manual "search" that calls expo-location's geocoder if available.
export function MapPicker({ value, onChange, address, onAddressChange, height = 220 }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const runSearch = async () => {
    const q = (address ?? '').trim();
    if (q.length < 3) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await Location.geocodeAsync(q);
      if (!results.length) {
        setSearchError('მისამართი ვერ მოიძებნა');
        return;
      }
      const { latitude, longitude } = results[0];
      onChange({ latitude, longitude });
    } catch (e) {
      logError(e, 'MapPicker.web.geocode');
      setSearchError('ძებნა ვერ მოხერხდა (ვებზე ხელმიუწვდომელია)');
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={theme.colors.inkFaint} />
        <TextInput
          value={address}
          onChangeText={(t) => {
            onAddressChange(t);
            if (searchError) setSearchError(null);
          }}
          onSubmitEditing={runSearch}
          placeholder="მისამართი"
          placeholderTextColor={theme.colors.inkFaint}
          style={styles.searchInput}
        />
        {searching ? <ActivityIndicator size="small" color={theme.colors.accent} /> : null}
      </View>
      {searchError ? <Text style={styles.searchErr}>{searchError}</Text> : null}
      <View style={[styles.mapWrap, { height }]}>
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={28} color={theme.colors.inkFaint} />
          <Text style={styles.placeholderText}>
            რუკა ხელმიუწვდომელია ვებში — გამოიყენეთ მისამართის ველი
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
