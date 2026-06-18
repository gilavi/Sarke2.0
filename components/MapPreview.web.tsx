import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTheme } from '../lib/theme';


type Props = {
  latitude: number;
  longitude: number;
  pinColor?: string;
  style?: any;
};

export function MapPreview({ latitude, longitude, style }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={[style, styles.placeholder]}>
      <MapPin size={20} color={theme.colors.inkFaint} strokeWidth={2} />
      <Text style={styles.coords}>
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </Text>
    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.subtleSurface,
    gap: 4,
  },
  coords: { fontSize: 12, color: theme.colors.ink, fontWeight: '600' },
});
}
