// PinchZoomCrop — the simplified cropper for PhotoAnnotator.
//
// No resizable rect, no aspect presets: the crop WINDOW is the whole photo box
// (aspect == image aspect, so at scale 1 the image fills it exactly = no crop).
// The user pinches to zoom (scale 1…MAX_ZOOM) and drags to reposition; whatever
// the window frames is the crop. The output keeps the source aspect.
//
// Gestures use react-native-gesture-handler's modern Gesture API + reanimated
// shared values (UI-thread smooth). The live transform is read on Apply via the
// imperative handle (`getTransform`) and mapped to a source-pixel crop by
// `cropGeometry.zoomPanToPixels` — this component owns NO crop math itself.
//
// The grid + corner brackets are a non-interactive overlay; the crop is applied
// through expo-image-manipulator (not captureRef), so this chrome never bakes in.

import { forwardRef, useImperativeHandle } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ZoomIn } from 'lucide-react-native';
import { MAX_ZOOM, type Size, type ZoomPan } from './cropGeometry';
import { EDITOR } from './styles';

export interface PinchZoomCropHandle {
  /** Current transform, read on the JS thread when committing the crop. */
  getTransform: () => ZoomPan;
  /** Animate back to fit (scale 1, no pan). */
  reset: () => void;
}

interface PinchZoomCropProps {
  uri: string;
  box: Size; // == photoLayout (display size of the crop window)
  hint: string;
}

export const PinchZoomCrop = forwardRef<PinchZoomCropHandle, PinchZoomCropProps>(
  function PinchZoomCrop({ uri, box, hint }, ref) {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);

    useImperativeHandle(ref, () => ({
      getTransform: () => ({ scale: scale.value, tx: tx.value, ty: ty.value }),
      reset: () => {
        scale.value = withTiming(1, { duration: 180 });
        savedScale.value = 1;
        tx.value = withTiming(0, { duration: 180 });
        ty.value = withTiming(0, { duration: 180 });
      },
    }));

    // Pinch about the box center; re-clamp the pan into the cover bounds as the
    // zoom (and thus the slack) changes.
    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        'worklet';
        const next = Math.min(MAX_ZOOM, Math.max(1, savedScale.value * e.scale));
        scale.value = next;
        const mx = (box.w * (next - 1)) / 2;
        const my = (box.h * (next - 1)) / 2;
        tx.value = Math.min(mx, Math.max(-mx, tx.value));
        ty.value = Math.min(my, Math.max(-my, ty.value));
      })
      .onEnd(() => {
        'worklet';
        savedScale.value = scale.value;
      });

    // Drag incrementally (changeX/changeY, not translation + a saved baseline):
    // adding or removing a finger mid-pinch never makes the image jump, and pan
    // owns no persisted offset to get out of sync with the pinch. Clamped so the
    // image always covers the window (no empty gaps).
    const pan = Gesture.Pan().onChange((e) => {
      'worklet';
      const mx = (box.w * (scale.value - 1)) / 2;
      const my = (box.h * (scale.value - 1)) / 2;
      tx.value = Math.min(mx, Math.max(-mx, tx.value + e.changeX));
      ty.value = Math.min(my, Math.max(-my, ty.value + e.changeY));
    });

    const composed = Gesture.Simultaneous(pinch, pan);

    const imgStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    }));

    return (
      <View style={[styles.window, { width: box.w, height: box.h }]}>
        <GestureDetector gesture={composed}>
          <Animated.View style={StyleSheet.absoluteFill}>
            <Animated.Image
              source={{ uri }}
              style={[StyleSheet.absoluteFill, imgStyle]}
              resizeMode="contain"
            />
          </Animated.View>
        </GestureDetector>

        {/* Thirds grid + frame + corner brackets (no touches). */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={styles.frame} />
          <View style={[styles.gv, { left: '33.33%' }]} />
          <View style={[styles.gv, { left: '66.66%' }]} />
          <View style={[styles.gh, { top: '33.33%' }]} />
          <View style={[styles.gh, { top: '66.66%' }]} />
          <View style={[styles.br, { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 }]} />
          <View style={[styles.br, { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 }]} />
          <View style={[styles.br, { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
          <View style={[styles.br, { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3 }]} />
        </View>

        {/* Interaction hint (fades out is unnecessary — it's faint chrome). */}
        <View pointerEvents="none" style={styles.hintWrap}>
          <View style={styles.hintPill}>
            <ZoomIn size={15} color={EDITOR.ink} strokeWidth={1.8} />
            <Text style={styles.hintText}>{hint}</Text>
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  window: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: EDITOR.bg,
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  gv: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: EDITOR.cropGrid },
  gh: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: EDITOR.cropGrid },
  br: { position: 'absolute', width: 22, height: 22, borderColor: EDITOR.cropFrame },
  hintWrap: { position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: EDITOR.scrim,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EDITOR.scrimBorder,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  hintText: { fontSize: 12, color: EDITOR.ink },
});
