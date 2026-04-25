import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, type Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { theme } from '../lib/theme';
import { logError } from '../lib/logError';

export type LatLng = { latitude: number; longitude: number };

type Props = {
  /** Current pinned location, or null if none. */
  value: LatLng | null;
  onChange: (loc: LatLng | null) => void;
  /**
   * Controlled address text. The search box edits this directly, and tapping
   * or dragging the pin on the map reverse-geocodes into it. There is no
   * separate address Input above this component — this IS the address field.
   */
  address: string;
  onAddressChange: (s: string) => void;
  height?: number;
};

// Tbilisi — sane fallback when no pin and no geocode result yet. Most users
// of this app are working on construction sites in Georgia.
const FALLBACK_REGION: Region = {
  latitude: 41.7151,
  longitude: 44.8271,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const PIN_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

export function MapPicker({ value, onChange, address, onAddressChange, height = 220 }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  // Strings we wrote into `address` ourselves (via reverse-geocode) — don't
  // re-forward-geocode them or we ping-pong: pin → text → pin → text.
  const skipNextSearch = useRef<string | null>(null);
  // Track the last query we actually geocoded so we don't repeat work as the
  // user types past a string we already looked up.
  const lastGeocoded = useRef<string>('');

  // When `value` changes from outside, animate the map to it.
  useEffect(() => {
    if (value && mapRef.current) {
      mapRef.current.animateToRegion({ ...value, ...PIN_DELTA }, 350);
    }
  }, [value]);

  const reverseGeocode = async (coord: LatLng) => {
    try {
      const results = await Location.reverseGeocodeAsync(coord);
      if (!results.length) return;
      const r = results[0];
      const parts = [r.street, r.name, r.city, r.region]
        .filter((p): p is string => !!p && p !== r.street);
      const formatted = [r.street, ...parts].filter(Boolean).join(', ');
      if (formatted) {
        skipNextSearch.current = formatted;
        lastGeocoded.current = formatted;
        onAddressChange(formatted);
      }
    } catch (e) {
      logError(e, 'MapPicker.reverseGeocode');
    }
  };

  const handleMapPress = (e: { nativeEvent: { coordinate: LatLng } }) => {
    onChange(e.nativeEvent.coordinate);
    void reverseGeocode(e.nativeEvent.coordinate);
  };

  const handleDragEnd = (e: { nativeEvent: { coordinate: LatLng } }) => {
    onChange(e.nativeEvent.coordinate);
    void reverseGeocode(e.nativeEvent.coordinate);
  };

  const runSearch = async (q: string) => {
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
      logError(e, 'MapPicker.geocode');
      setSearchError('ძებნა ვერ მოხერხდა');
    } finally {
      setSearching(false);
    }
  };

  // Debounced auto-geocode as the user types. Skips strings we just wrote
  // ourselves from reverse-geocoding, and skips repeats / very short input.
  useEffect(() => {
    const q = (address ?? '').trim();
    if (q.length < 3) return;
    if (skipNextSearch.current === address) {
      skipNextSearch.current = null;
      return;
    }
    if (q === lastGeocoded.current) return;
    const handle = setTimeout(() => {
      lastGeocoded.current = q;
      void runSearch(q);
    }, 600);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const initialRegion: Region = value
    ? { ...value, ...PIN_DELTA }
    : FALLBACK_REGION;

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
          placeholder="მისამართი"
          placeholderTextColor={theme.colors.inkFaint}
          style={styles.searchInput}
        />
        {searching ? <ActivityIndicator size="small" color={theme.colors.accent} /> : null}
      </View>
      {searchError ? (
        <Text style={styles.searchErr}>{searchError}</Text>
      ) : null}
      <View style={[styles.mapWrap, { height }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onPress={handleMapPress}
        >
          {value ? (
            <Marker
              coordinate={value}
              draggable
              onDragEnd={handleDragEnd}
              pinColor={theme.colors.accent}
            />
          ) : null}
        </MapView>
        {!value ? (
          <View pointerEvents="none" style={styles.hintOverlay}>
            <View style={styles.hintBubble}>
              <Ionicons name="hand-left" size={14} color={theme.colors.ink} />
              <Text style={styles.hintText}>შეეხეთ რუკას ან მოძებნეთ მისამართი</Text>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => onChange(null)} style={styles.clearBtn}>
            <Ionicons name="close" size={14} color={theme.colors.white} />
            <Text style={styles.clearTxt}>პინის მოხსნა</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.ink,
    padding: 0,
  },
  searchBtn: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  searchErr: {
    color: theme.colors.danger,
    fontSize: 12,
    paddingHorizontal: 4,
  },
  mapWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    backgroundColor: theme.colors.subtleSurface,
  },
  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  hintBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  hintText: { fontSize: 12, color: theme.colors.ink, fontWeight: '600' },
  clearBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearTxt: { color: theme.colors.white, fontSize: 11, fontWeight: '700' },
});
