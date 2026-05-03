// Web stub for react-native-maps.
// The real package uses native-only modules that can't bundle on web.
// This stub exports no-op components so Metro can compile successfully.
import { View } from 'react-native';

export default View;

export const Marker = () => null;
export const PROVIDER_DEFAULT = null;
export const PROVIDER_GOOGLE = 'google';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};
