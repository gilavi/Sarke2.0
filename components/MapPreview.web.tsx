import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';

type Props = {
  latitude: number;
  longitude: number;
  pinColor?: string;
  style?: any;
};

export function MapPreview({ latitude, longitude, style }: Props) {
  return (
    <View style={[style, styles.placeholder]}>
      <Ionicons name="location" size={20} color={theme.colors.inkFaint} />
      <Text style={styles.coords}>
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.subtleSurface,
    gap: 4,
  },
  coords: { fontSize: 12, color: theme.colors.ink, fontWeight: '600' },
});
