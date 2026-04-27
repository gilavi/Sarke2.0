import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

type Props = {
  latitude: number;
  longitude: number;
  pinColor?: string;
  style?: any;
};

export function MapPreview({ latitude, longitude, pinColor, style }: Props) {
  return (
    <View style={style}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={{ latitude, longitude }} pinColor={pinColor} />
      </MapView>
    </View>
  );
}
