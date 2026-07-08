// Camera viewfinder pane for the /photo-picker flow: live CameraView with
// pinch-to-zoom, the top bar (cancel + system-library shortcut), the shutter,
// the multi-select "დასრულება (n)" commit bar, and the camera-permission
// placeholder. Owns everything camera-internal (permission request, zoom
// shared values, capture) so app/photo-picker.tsx stays a thin orchestrator —
// it just receives the captured URI via onCaptured.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { X, Images, Check, Camera } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { a11y } from '../../lib/accessibility';
import { useTheme } from '../../lib/theme';
import { styles } from './pickerStyles';
import { zoomLabel } from './pickerHelpers';
import { useCameraZoom } from './useCameraZoom';

type Props = {
  /** Cancel (top-bar X) — bus cancel + dismiss handled by the orchestrator. */
  onCancel: () => void;
  /** Open the system photo library (top-bar shortcut). */
  onOpenLibrary: () => void;
  /** A live shutter capture succeeded — hand the URI to the orchestrator. */
  onCaptured: (uri: string) => void;
  multiMode: boolean;
  /** Number of recent-strip assets currently selected (multi mode). */
  selectedCount: number;
  /** True while a pick/commit is resolving — disables the Done bar. */
  selecting: boolean;
  /** Commit the current multi-select ("Done (n)"). */
  onCommit: () => void;
};

/**
 * Live camera pane. Manages its own camera permission + pinch-zoom + capture;
 * emits the captured URI upward via `onCaptured`. Side effect: requests camera
 * permission once on mount (guarded so a dismissed OS sheet doesn't re-prompt).
 */
export function CameraPane({
  onCancel,
  onOpenLibrary,
  onCaptured,
  multiMode,
  selectedCount,
  selecting,
  onCommit,
}: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const askedCamRef = useRef(false);

  // Pinch-to-zoom (shared values + gesture + indicator pill).
  const { zoomDisplay, pinch, pillStyle, resetZoom } = useCameraZoom();

  // Request camera permission on mount, at most once per mount. If the user
  // dismisses the OS sheet (swipe-down) the permission stays
  // {granted:false, canAskAgain:true} - without this guard the effect would
  // re-fire and re-prompt indefinitely.
  useEffect(() => {
    if (askedCamRef.current) return;
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) {
      askedCamRef.current = true;
      void requestCamPerm();
    }
  }, [camPerm]);

  const capture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) onCaptured(photo.uri);
      resetZoom(); // next shot starts wide
    } catch (e) {
      console.warn('[photo-picker] capture failed', e);
    } finally {
      setCapturing(false);
    }
  }, [capturing, onCaptured, resetZoom]);

  const camReady = camPerm?.granted ?? false;
  const camDeniedFinal = camPerm && !camPerm.granted && !camPerm.canAskAgain;

  return (
    // Pinch-to-zoom wraps ONLY the camera area so it never fights the horizontal
    // recent-photos strip below.
    <GestureDetector gesture={pinch}>
      <View style={styles.cameraWrap}>
        {camReady ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            zoom={zoomDisplay}
          />
        ) : camDeniedFinal ? (
          <View style={styles.permPlaceholder}>
            <Camera size={36} color="#fff" strokeWidth={1.5} />
            <Text style={styles.permText}>{t('photoPicker.cameraPermDenied')}</Text>
            <Pressable onPress={() => void Linking.openSettings()} style={styles.permButton}>
              <Text style={styles.permButtonText}>{t('photoPicker.openSettings')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.permPlaceholder}>
            <ActivityIndicator color="#fff" />
          </View>
        )}

        {/* Zoom indicator pill - fades out when idle. */}
        {camReady ? (
          <Animated.View style={[styles.zoomPill, pillStyle]} pointerEvents="none">
            <Text style={styles.zoomPillText}>{zoomLabel(zoomDisplay)}</Text>
          </Animated.View>
        ) : null}

        {/* Top bar: cancel + system-library shortcut */}
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable
            onPress={onCancel}
            hitSlop={12}
            style={styles.iconBtn}
            {...a11y(t('photoPicker.close'), undefined, 'button')}
          >
            <X size={22} color="#fff" strokeWidth={1.5} />
          </Pressable>
          <Pressable
            onPress={onOpenLibrary}
            hitSlop={12}
            style={styles.libraryShortcut}
            {...a11y(t('photoPicker.library'), undefined, 'button')}
          >
            <Images size={18} color="#fff" strokeWidth={1.5} />
            <Text style={styles.libraryShortcutText}>{t('photoPicker.library')}</Text>
          </Pressable>
        </View>

        {/* Shutter */}
        {camReady ? (
          <Pressable
            onPress={capture}
            disabled={capturing}
            {...a11y(t('photoPicker.capture'), undefined, 'button', { disabled: capturing, busy: capturing })}
            style={({ pressed }) => [
              styles.shutter,
              pressed && { transform: [{ scale: 0.94 }] },
              capturing && { opacity: 0.6 },
            ]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
        ) : null}

        {/* Multi-select commit bar */}
        {multiMode && selectedCount > 0 ? (
          <Pressable
            onPress={onCommit}
            disabled={selecting}
            {...a11y(t('photoPicker.done', { count: selectedCount }), undefined, 'button', { disabled: selecting })}
            style={({ pressed }) => [
              styles.doneBar,
              { backgroundColor: theme.colors.accent },
              pressed && { opacity: 0.85 },
              selecting && { opacity: 0.6 },
            ]}
          >
            <Check size={18} color="#fff" strokeWidth={1.5} />
            <Text style={styles.doneBarText}>{t('photoPicker.done', { count: selectedCount })}</Text>
          </Pressable>
        ) : null}
      </View>
    </GestureDetector>
  );
}
