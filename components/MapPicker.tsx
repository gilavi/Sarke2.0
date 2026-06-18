import { useEffect, useRef, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { A11yText as Text } from './primitives/A11yText';
import MapView, { Marker, type Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { MapPin, Hand, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { forwardGeocode, reverseGeocode, coordsLabel } from '../lib/geocode';
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
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const mapRef = useRef<MapView | null>(null);
  // Geocoding runs over the public Nominatim HTTP API (lib/geocode.ts) — the
  // pin and the address text stay in sync without re-adding expo-location.
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const fwdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fwdAbort = useRef<AbortController | null>(null);
  const revAbort = useRef<AbortController | null>(null);
  const focusedRef = useRef(false);

  // When `value` changes from outside, animate the map to it.
  useEffect(() => {
    if (value && mapRef.current) {
      mapRef.current.animateToRegion({ ...value, ...PIN_DELTA }, 350);
    }
  }, [value]);

  // Cancel any in-flight geocode + timer on unmount.
  useEffect(() => () => {
    if (fwdTimer.current) clearTimeout(fwdTimer.current);
    fwdAbort.current?.abort();
    revAbort.current?.abort();
  }, []);

  // Reverse sync (pin → address): tapping/dragging the pin reverse-geocodes the
  // coordinate into the address field. Falls back to a "lat, lng" label.
  const reverseFill = (coord: LatLng) => {
    revAbort.current?.abort();
    const ac = new AbortController();
    revAbort.current = ac;
    setNotFound(false);
    setSearching(true);
    reverseGeocode(coord.latitude, coord.longitude, ac.signal).then((name) => {
      if (ac.signal.aborted) return;
      setSearching(false);
      onAddressChange(name ?? coordsLabel(coord));
    });
  };

  const handleMapPress = (e: { nativeEvent: { coordinate: LatLng } }) => {
    const coord = e.nativeEvent.coordinate;
    onChange(coord);
    reverseFill(coord);
  };

  const handleDragEnd = (e: { nativeEvent: { coordinate: LatLng } }) => {
    const coord = e.nativeEvent.coordinate;
    onChange(coord);
    reverseFill(coord);
  };

  // Forward sync (address → pin): the search box geocodes the typed text and
  // drops the pin there. Debounced while focused so reverse-written text (the
  // pin path above, which lands while the box is blurred) never fights back.
  const runForward = (text: string) => {
    const q = text.trim();
    if (q.length < 5) return;
    fwdAbort.current?.abort();
    const ac = new AbortController();
    fwdAbort.current = ac;
    setNotFound(false);
    setSearching(true);
    forwardGeocode(q, ac.signal).then((hit) => {
      if (ac.signal.aborted) return;
      setSearching(false);
      if (hit) onChange({ latitude: hit.latitude, longitude: hit.longitude });
      else setNotFound(true);
    });
  };

  const handleSearchChange = (text: string) => {
    onAddressChange(text);
    setNotFound(false);
    if (fwdTimer.current) clearTimeout(fwdTimer.current);
    fwdTimer.current = setTimeout(() => {
      if (focusedRef.current) runForward(text);
    }, 800);
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
          onChangeText={handleSearchChange}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; }}
          onSubmitEditing={() => runForward(address)}
          returnKeyType="search"
          placeholder="მისამართი"
          placeholderTextColor={theme.colors.inkFaint}
          style={styles.searchInput}
        />
        {searching ? <ActivityIndicator size="small" color={theme.colors.inkFaint} /> : null}
      </View>
      {notFound ? (
        <Text style={styles.searchErr}>{t('geocode.notFound')}</Text>
      ) : searching ? (
        <Text style={[styles.searchErr, { color: theme.colors.inkFaint }]}>{t('geocode.searching')}</Text>
      ) : null}
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
