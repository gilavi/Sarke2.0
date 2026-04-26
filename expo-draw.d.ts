declare module 'expo-draw' {
  import * as React from 'react';
  import { ViewStyle } from 'react-native';

  interface DrawProps {
    strokes?: any[];
    enabled?: boolean;
    style?: ViewStyle;
    rewind?: (fn: () => void) => void;
    clear?: (fn: () => void) => void;
  }

  export default class Draw extends React.Component<DrawProps> {
    rewind(): void;
    clear(): void;
  }
}
