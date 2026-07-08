// Pinch-to-zoom controller for the photo-picker camera pane. Kept as its own
// hook so CameraPane stays under the component size target and the zoom concern
// (shared values + gesture + indicator pill) lives in one place.
import { useCallback, useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ZOOM_SENSITIVITY } from './pickerHelpers';

/**
 * Pinch-to-zoom for the camera viewfinder.
 * @returns
 *  - `zoomDisplay` — current 0–1 zoom, drives CameraView's `zoom` prop + pill text.
 *  - `pinch` — the pinch gesture to attach to the viewfinder.
 *  - `pillStyle` — animated fade style for the zoom-indicator pill.
 *  - `resetZoom` — reset to wide (call after each capture).
 */
export function useCameraZoom() {
  const zoom = useSharedValue(0); // live 0–1 (UI thread)
  const baseZoom = useSharedValue(0); // zoom captured at gesture start
  const pillOpacity = useSharedValue(0);
  const [zoomDisplay, setZoomDisplay] = useState(0); // drives CameraView prop + pill text

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          baseZoom.value = zoom.value;
        })
        .onUpdate((e) => {
          const next = Math.min(Math.max(baseZoom.value + (e.scale - 1) * ZOOM_SENSITIVITY, 0), 1);
          zoom.value = next;
          runOnJS(setZoomDisplay)(next);
          // Pulse the indicator visible, then fade it after the pinch settles.
          pillOpacity.value = withSequence(
            withTiming(1, { duration: 80 }),
            withDelay(900, withTiming(0, { duration: 350 })),
          );
        }),
    [baseZoom, zoom, pillOpacity],
  );

  const pillStyle = useAnimatedStyle(() => ({ opacity: pillOpacity.value }));

  const resetZoom = useCallback(() => {
    zoom.value = 0;
    baseZoom.value = 0;
    setZoomDisplay(0);
    pillOpacity.value = withTiming(0, { duration: 200 });
  }, [zoom, baseZoom, pillOpacity]);

  return { zoomDisplay, pinch, pillStyle, resetZoom };
}
