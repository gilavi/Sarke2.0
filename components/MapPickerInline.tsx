import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { A11yText as Text } from './primitives/A11yText';
import { Button } from './ui';
import { MapPicker, type LatLng } from './MapPicker';

interface MapPickerInlineProps {
  initialPin: LatLng | null;
  initialAddress: string;
  onConfirm: (pin: LatLng | null, address: string) => void;
  onCancel: () => void;
  /** Border radius of the bottom action bar. Defaults to 24. */
  sheetRadius?: number;
}

export function MapPickerInline({
  initialPin,
  initialAddress,
  onConfirm,
  onCancel,
  sheetRadius = 24,
}: MapPickerInlineProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState<LatLng | null>(initialPin);
  const [address, setAddress] = useState(initialAddress);

  const screenH = Dimensions.get('window').height;
  // Reserve space for header (~60) + bottom action bar (~160) + safe areas
  const mapHeight = Math.max(240, screenH - insets.top - insets.bottom - 220);

  useEffect(() => {
    setPin(initialPin);
    setAddress(initialAddress);
  }, [initialPin, initialAddress]);

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <MapPicker
          value={pin}
          onChange={setPin}
          address={address}
          onAddressChange={setAddress}
          height={mapHeight}
        />
      </View>

      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: sheetRadius,
            borderTopRightRadius: sheetRadius,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <Button
          title="დადასტურება"
          size="lg"
          onPress={() => onConfirm(pin, address)}
          disabled={!pin}
        />
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: theme.colors.inkSoft }]}>
            გაუქმება
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrap: {
    flex: 1,
    marginHorizontal: 16,
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
