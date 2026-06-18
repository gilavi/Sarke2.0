import { useEffect, useRef, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { A11yText as Text } from './primitives/A11yText';
import MapView, { Marker, type Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { MapPin, Hand, X } from 'lucide-react-native';
import { useTheme } from '../lib/theme';

import { a11y } from '../lib/accessibility';

export type LatLng = { latitude: number; longitude: number };

type Props = {
  /** Current pinned location, or null if none. */
  value: LatLng | null;
  onChange: (loc: LatLng | null) => void;
  /**
   * Controlled address text. The search box edits this directly, and tapping
   * or dragging the pin on the map reverse-geocodes into it. There is no
   * separate address Input above this component - this IS the address field.
   */
  address: string;
  onAddressChange: (s: string) => void;
  height?: number;
};

// Tbilisi - sane fallback when no pin and no geocode result yet. Most users
// of this app are working on construction sites in Georgia.
const FALLBACK_REGION: Region = {
  latitude: 41.7151,
  longitude: 44.8271,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const PIN_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

export function MapPicker({ value, onChange, address, onAddressChange, height = 220 }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const mapRef = useRef<MapView | null>(null);

  // When `value` changes from outside, animate the map to it.
  useEffect(() => {
    if (value && mapRef.current) {
      mapRef.current.animateToRegion({ ...value, ...PIN_DELTA }, 350);
    }
  }, [value]);

  // Geocoding was removed with the expo-location dependency (2026-06 -
  // location permission dropped app-wide). The address field is plain text;
  // the pin is set by tapping/dragging the map.
  const handleMapPress = (e: { nativeEvent: { coordinate: LatLng } }) => {
    onChange(e.nativeEvent.coordinate);
  };

  const handleDragEnd = (e: { nativeEvent: { coordinate: LatLng } }) => {
    onChange(e.nativeEvent.coordinate);
  };

  const initialRegion: Region = value
    ? { ...value, ...PIN_DELTA }
    : FALLBACK_REGION;

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
      <View style={[styles.mapWrap, { height }]} collapsable={false}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          mapType="standard"
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
              <Hand size={14} color={theme.colors.ink} strokeWidth={1.5} />
              <Text style={styles.hintText}>შეეხეთ რუკას ან მოძებნეთ მისამართი</Text>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => onChange(null)} hitSlop={{ top: 7, bottom: 7, left: 0, right: 0 }} style={styles.clearBtn} {...a11y('მდებარეობის გასუფთავება', 'შეეხეთ მონიშნული მდებარეობის წასაშლელად', 'button')}>
            <X size={14} color={theme.colors.white} strokeWidth={1.5} />
            <Text style={styles.clearTxt}>პინის მოხსნა</Text>
          </Pressable>
        )}
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
    backgroundColor: theme.colors.surface,
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
}
