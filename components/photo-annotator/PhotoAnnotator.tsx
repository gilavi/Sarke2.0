// PhotoAnnotator.tsx - Full-screen photo edit canvas (crop / annotate)
//
// Inspectors edit photos before upload: frame the shot (pinch-to-zoom + drag
// crop), then draw — circle defects, arrow to cracks, write measurements. The
// editor is ALWAYS dark (the image is the hero; standard for photo editors) and
// has two modes behind a segmented control:
//   - Crop   : PinchZoomCrop transforms the image inside a fixed window; on
//              commit the transform is mapped to a source-pixel crop and applied
//              via expo-image-manipulator (lib/imageEditing → useImageEditSession).
//   - Markup : SVG + PanResponder drawing, flattened with react-native-view-shot.
//
// The markup photo box is sized to the image's true aspect (photoLayout) with the
// image `contain`, so display→pixel is one uniform scale and captureRef keeps the
// real aspect. That SAME box is the crop window, so the crop the user frames maps
// back to pixels exactly (cropGeometry.zoomPanToPixels).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { Check, Trash2, Undo2, X } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import { a11y } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';

import { COLORS, SIZE_PRESETS, uid, pointsToPathD, arrowHead, annotationBounds, hitTestAnnotation, translateAnnotation } from './schema';
import type { Annotation, PhotoAnnotatorProps, Point, Tool } from './schema';
import { EDITOR, getstyles, getmodalStyles } from './styles';
import { useImageEditSession } from './useImageEditSession';
import { AnnotatorToolbar } from './AnnotatorToolbar';
import { PinchZoomCrop, type PinchZoomCropHandle } from './PinchZoomCrop';
import { isIdentityZoomPan, zoomPanToPixels } from './cropGeometry';

type EditMode = 'crop' | 'markup';

// Animate the crop/markup sheet swap (Android opt-in).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const animateLayout = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

/* ─────────────────────────── Component ─────────────────────────── */

export default function PhotoAnnotator({ sourceUri, onSave, onCancel }: PhotoAnnotatorProps) {
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(), []);
  const modalStyles = useMemo(() => getmodalStyles(), []);
  const insets = useSafeAreaInsets();

  // Working image + dims + crop/rotate transforms.
  const { workingUri, imgW, imgH, photoLayout, busy, applyCrop } = useImageEditSession(sourceUri, insets);

  const [mode, setMode] = useState<EditMode>('markup');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0].value);
  const [width, setWidth] = useState<number>(SIZE_PRESETS[1]);
  const [current, setCurrent] = useState<Annotation | null>(null);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<Point>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  // Move tool: id of the annotation currently selected for dragging.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const cropRef = useRef<PinchZoomCropHandle>(null);
  const photoContainerRef = useRef<View>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Refs to avoid stale closures in PanResponder
  const toolRef = useRef(tool);
  const currentRef = useRef(current);
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  // Live mirrors for the move tool's hit-testing / drag session.
  const annotationsRef = useRef(annotations);
  const selectedIdRef = useRef(selectedId);
  const dragRef = useRef<{ id: string; startX: number; startY: number; original: Annotation } | null>(null);
  useEffect(() => {
    toolRef.current = tool;
    currentRef.current = current;
    colorRef.current = color;
    widthRef.current = width;
    annotationsRef.current = annotations;
    selectedIdRef.current = selectedId;
  }, [tool, current, color, width, annotations, selectedId]);

  // Leaving the move tool drops any active selection so the outline disappears.
  useEffect(() => {
    if (tool !== 'move' && selectedId !== null) setSelectedId(null);
  }, [tool, selectedId]);

  /* PanResponder for drawing */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const t = toolRef.current;
        const { locationX, locationY } = evt.nativeEvent;
        if (t === 'move') {
          // Pick the topmost annotation under the touch (last drawn wins).
          const list = annotationsRef.current;
          let hit: Annotation | null = null;
          for (let i = list.length - 1; i >= 0; i--) {
            if (hitTestAnnotation(list[i], { x: locationX, y: locationY })) {
              hit = list[i];
              break;
            }
          }
          if (hit) {
            dragRef.current = { id: hit.id, startX: locationX, startY: locationY, original: hit };
            setSelectedId(hit.id);
            selectedIdRef.current = hit.id;
            haptic.light();
          } else {
            dragRef.current = null;
            setSelectedId(null);
            selectedIdRef.current = null;
          }
          return;
        }
        if (t === 'text') {
          setTextPos({ x: locationX, y: locationY });
          setTextInput('');
          setTextModalVisible(true);
          return;
        }
        const id = uid();
        const c = colorRef.current;
        const w = widthRef.current;
        if (t === 'pen') {
          const stroke: Annotation = { id, tool: 'pen', color: c, width: w, points: [{ x: locationX, y: locationY }] };
          setCurrent(stroke);
          currentRef.current = stroke;
        } else if (t === 'arrow' || t === 'circle' || t === 'rect') {
          const shape: Annotation = { id, tool: t, color: c, width: w, start: { x: locationX, y: locationY }, end: { x: locationX, y: locationY } };
          setCurrent(shape);
          currentRef.current = shape;
        }
      },
      onPanResponderMove: (evt) => {
        const t = toolRef.current;
        const { locationX, locationY } = evt.nativeEvent;
        if (t === 'move') {
          const d = dragRef.current;
          if (!d) return;
          const dx = locationX - d.startX;
          const dy = locationY - d.startY;
          const moved = translateAnnotation(d.original, dx, dy);
          setAnnotations((prev) => prev.map((a) => (a.id === d.id ? moved : a)));
          return;
        }
        const cur = currentRef.current;
        if (!cur) return;
        if (t === 'pen') {
          const updated: Annotation = { ...cur, points: [...(cur.points ?? []), { x: locationX, y: locationY }] };
          setCurrent(updated);
          currentRef.current = updated;
        } else if (t === 'arrow' || t === 'circle' || t === 'rect') {
          const updated: Annotation = { ...cur, end: { x: locationX, y: locationY } };
          setCurrent(updated);
          currentRef.current = updated;
        }
      },
      onPanResponderRelease: () => {
        const t = toolRef.current;
        if (t === 'move') {
          // Drop moment of a drag → Heavy.
          if (dragRef.current) haptic.heavy();
          dragRef.current = null;
          return;
        }
        const cur = currentRef.current;
        if (!cur) return;
        if (t === 'pen' && (cur.points?.length ?? 0) < 2) {
          setCurrent(null);
          currentRef.current = null;
          return;
        }
        setAnnotations((prev) => [...prev, cur]);
        setCurrent(null);
        currentRef.current = null;
        haptic.light();
      },
    }),
  ).current;

  /* Markup actions */
  const undo = useCallback(() => {
    setAnnotations((prev) => prev.slice(0, -1));
    haptic.light();
  }, []);

  const clearAll = useCallback(() => {
    Alert.alert(t('photoAnnotator.clearTitle'), t('photoAnnotator.clearBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          setAnnotations([]);
          haptic.heavy();
        },
      },
    ]);
  }, [t]);

  const addTextAnnotation = useCallback(() => {
    if (!textInput.trim()) {
      setTextModalVisible(false);
      return;
    }
    setAnnotations((prev) => [
      ...prev,
      { id: uid(), tool: 'text', color, width: 0, text: textInput.trim(), x: textPos.x, y: textPos.y },
    ]);
    setTextModalVisible(false);
    setTextInput('');
    haptic.light();
  }, [textInput, textPos, color]);

  // Entering crop changes the coordinate space, so existing annotations no longer
  // map — confirm before discarding them, then run the action.
  const runWithAnnotationReset = useCallback(
    (action: () => void) => {
      if (annotationsRef.current.length === 0) {
        action();
        return;
      }
      Alert.alert(t('photoAnnotator.resetTitle'), t('photoAnnotator.resetBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('photoAnnotator.resetConfirm'),
          style: 'destructive',
          onPress: () => {
            setAnnotations([]);
            action();
          },
        },
      ]);
    },
    [t],
  );

  const handleTool = useCallback((next: Tool) => {
    setTool(next);
  }, []);

  /* Crop */
  // Read the live pinch/zoom transform and bake it into the pixels. No-op for an
  // untouched (identity) transform. Returns the URI to finalize.
  const commitCrop = useCallback(async (): Promise<string> => {
    const tf = cropRef.current?.getTransform();
    if (!tf || !photoLayout || !imgW || !imgH || isIdentityZoomPan(tf)) return workingUri;
    const px = zoomPanToPixels({ w: photoLayout.w, h: photoLayout.h }, { w: imgW, h: imgH }, tf);
    const r = await applyCrop(px);
    haptic.light();
    return r.uri;
  }, [photoLayout, imgW, imgH, applyCrop, workingUri]);

  const onMode = useCallback(
    (next: EditMode) => {
      if (next === mode || busy) return;
      if (next === 'crop') {
        setSelectedId(null);
        runWithAnnotationReset(() => {
          animateLayout();
          setMode('crop');
        });
      } else {
        // Leaving crop → commit the framed crop, then switch to markup.
        (async () => {
          await commitCrop();
          animateLayout();
          setMode('markup');
        })();
      }
    },
    [mode, busy, runWithAnnotationReset, commitCrop],
  );

  const onResetCrop = useCallback(() => cropRef.current?.reset(), []);

  /* Finalize */
  const finalize = useCallback(
    async (uri: string) => {
      // No annotations → return the (possibly cropped) image at full resolution,
      // skipping the captureRef downscale.
      if (annotationsRef.current.length === 0 || !photoContainerRef.current) {
        onSave(uri);
        return;
      }
      setSaving(true);
      // Drop the move-tool selection outline and let the frame repaint so it isn't
      // baked into the flattened image.
      setSelectedId(null);
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      try {
        const out = await captureRef(photoContainerRef, { format: 'jpg', quality: 0.9, result: 'tmpfile' });
        onSave(out);
      } catch (e) {
        haptic.error();
        Alert.alert(t('photoAnnotator.saveFailed'), t('photoAnnotator.saveTryAgain'));
        setSaving(false);
      }
    },
    [onSave, t],
  );

  const onDone = useCallback(async () => {
    if (saving || busy) return;
    const uri = mode === 'crop' ? await commitCrop() : workingUri;
    await finalize(uri);
  }, [mode, saving, busy, commitCrop, finalize, workingUri]);

  /* Render helpers */
  const renderAnnotation = (a: Annotation, isCurrent = false) => {
    const opacity = isCurrent ? 0.7 : 0.95;
    const key = isCurrent ? 'current' : a.id;

    if (a.tool === 'pen' && a.points && a.points.length > 1) {
      return (
        <Path key={key} d={pointsToPathD(a.points)} stroke={a.color} strokeWidth={a.width} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={opacity} />
      );
    }
    if (a.tool === 'arrow' && a.start && a.end) {
      return (
        <G key={key}>
          <Line x1={a.start.x} y1={a.start.y} x2={a.end.x} y2={a.end.y} stroke={a.color} strokeWidth={a.width} strokeLinecap="round" opacity={opacity} />
          <Polygon points={arrowHead(a.start, a.end, 10 + a.width)} fill={a.color} opacity={opacity} />
        </G>
      );
    }
    if (a.tool === 'circle' && a.start && a.end) {
      const r = Math.sqrt((a.end.x - a.start.x) ** 2 + (a.end.y - a.start.y) ** 2);
      return <SvgCircle key={key} cx={a.start.x} cy={a.start.y} r={r} stroke={a.color} strokeWidth={a.width} fill="none" opacity={opacity} />;
    }
    if (a.tool === 'rect' && a.start && a.end) {
      const x = Math.min(a.start.x, a.end.x);
      const y = Math.min(a.start.y, a.end.y);
      const w = Math.abs(a.end.x - a.start.x);
      const h = Math.abs(a.end.y - a.start.y);
      return <Rect key={key} x={x} y={y} width={w} height={h} stroke={a.color} strokeWidth={a.width} fill="none" rx={4} opacity={opacity} />;
    }
    if (a.tool === 'text' && a.text !== undefined) {
      return (
        <SvgText key={key} x={a.x} y={a.y} fill={a.color} fontSize={16} fontWeight="bold" textAnchor="start" opacity={opacity} stroke={a.color === '#FFFFFF' ? '#1A1A1A' : '#FFFFFF'} strokeWidth={0.5}>
          {a.text}
        </SvgText>
      );
    }
    return null;
  };

  // Bounding box of the selected annotation, drawn as a dashed outline while the
  // move tool is active so the user can see what they're dragging.
  const selectedBounds = useMemo(() => {
    if (tool !== 'move' || !selectedId) return null;
    const a = annotations.find((x) => x.id === selectedId);
    return a ? annotationBounds(a) : null;
  }, [tool, selectedId, annotations]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Header: ✕ cancel · title · ✓ done ── */}
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={8} style={styles.headerBtn} {...a11y(t('common.cancel'), t('photoAnnotator.cancelA11yHint'), 'button')}>
          <X size={22} color={EDITOR.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('photoAnnotator.headerTitle')}</Text>
        <Pressable onPress={onDone} disabled={saving || busy} style={styles.doneBtn} {...a11y(t('common.done'), t('photoAnnotator.doneA11yHint'), 'button')}>
          {saving || busy ? <ActivityIndicator color={EDITOR.onAccent} size="small" /> : <Check size={22} color={EDITOR.onAccent} strokeWidth={2.4} />}
        </Pressable>
      </View>

      {/* ── Photo canvas ── */}
      <View style={styles.canvasWrap}>
        {photoLayout && (
          <View style={[styles.photoBox, { width: photoLayout.w, height: photoLayout.h }]}>
            {mode === 'markup' ? (
              <>
                <View
                  ref={photoContainerRef}
                  style={styles.photoFill}
                  onLayout={(e) => {
                    const { width: w, height: h } = e.nativeEvent.layout;
                    setContainerSize({ w, h });
                  }}
                  {...panResponder.panHandlers}
                >
                  <Image source={{ uri: workingUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
                  <Svg width={containerSize.w || photoLayout.w} height={containerSize.h || photoLayout.h} style={StyleSheet.absoluteFill}>
                    {annotations.map((a) => renderAnnotation(a))}
                    {current && renderAnnotation(current, true)}
                    {selectedBounds && (
                      <Rect
                        x={selectedBounds.minX - 8}
                        y={selectedBounds.minY - 8}
                        width={selectedBounds.maxX - selectedBounds.minX + 16}
                        height={selectedBounds.maxY - selectedBounds.minY + 16}
                        stroke={EDITOR.accent}
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                        fill="none"
                        rx={6}
                      />
                    )}
                  </Svg>
                </View>

                {/* Floating undo / clear — sibling of the captured View, so it never
                    bakes into the saved image. */}
                <View style={styles.histrip}>
                  <Pressable onPress={undo} disabled={annotations.length === 0} hitSlop={6} style={styles.histripBtn} {...a11y(t('photoAnnotator.undoA11y'), t('photoAnnotator.undoA11yHint'), 'button')}>
                    <Undo2 size={18} color={annotations.length ? EDITOR.ink : EDITOR.inkFaint} strokeWidth={1.9} />
                  </Pressable>
                  <View style={styles.histripSep} />
                  <Pressable onPress={clearAll} hitSlop={6} style={styles.histripBtn} {...a11y(t('photoAnnotator.clearAllA11y'), t('photoAnnotator.clearAllA11yHint'), 'button')}>
                    <Trash2 size={17} color={EDITOR.danger} strokeWidth={1.9} />
                  </Pressable>
                </View>
              </>
            ) : (
              <PinchZoomCrop ref={cropRef} uri={workingUri} box={photoLayout} hint={t('photoAnnotator.cropHintOverlay')} />
            )}
          </View>
        )}
      </View>

      {/* ── Bottom sheet ── */}
      <AnnotatorToolbar
        styles={styles}
        t={t}
        mode={mode}
        onMode={onMode}
        bottomInset={insets.bottom}
        busy={busy}
        onResetCrop={onResetCrop}
        tool={tool}
        onTool={handleTool}
        color={color}
        onColor={setColor}
        width={width}
        onWidth={setWidth}
      />

      {/* ── Text input modal ── */}
      <Modal visible={textModalVisible} transparent animationType="fade" onRequestClose={() => setTextModalVisible(false)}>
        <Pressable style={modalStyles.overlay} onPress={() => setTextModalVisible(false)}>
          {/* The card IS the stop-propagation Pressable — it carries the width, so
              the modal sizes correctly instead of collapsing to its content. */}
          <Pressable style={modalStyles.card} onPress={() => {}}>
            <Text style={modalStyles.title}>{t('photoAnnotator.addText')}</Text>
            <TextInput
              style={modalStyles.input}
              value={textInput}
              onChangeText={setTextInput}
              placeholder={t('photoAnnotator.textPlaceholder')}
              placeholderTextColor={EDITOR.inkFaint}
              selectionColor={EDITOR.accent}
              maxLength={60}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addTextAnnotation}
              accessibilityLabel={t('photoAnnotator.addText')}
            />
            <View style={modalStyles.actions}>
              <Pressable onPress={() => setTextModalVisible(false)} style={modalStyles.cancelBtn} {...a11y(t('common.cancel'), t('photoAnnotator.cancelTextA11yHint'), 'button')}>
                <Text style={modalStyles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={addTextAnnotation} style={modalStyles.confirmBtn} {...a11y(t('photoAnnotator.addText'), t('photoAnnotator.addTextA11yHint'), 'button')}>
                <Text style={modalStyles.confirmText}>{t('common.add')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
