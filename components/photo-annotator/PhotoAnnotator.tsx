// PhotoAnnotator.tsx - Full-screen photo edit canvas (crop / rotate / annotate)
//
// Inspectors edit photos before upload: crop to frame, rotate, then draw —
// circle defects, arrow to cracks, write measurements. Crop/rotate go through
// expo-image-manipulator (lib/imageEditing.ts via useImageEditSession); drawing
// uses SVG + PanResponder, flattened with react-native-view-shot.
//
// The photo box is sized to its true aspect (useImageEditSession.photoLayout) and
// the image is `contain`, so display→pixel is one uniform scale and captureRef
// preserves the real photo aspect (no silent cover-crop).

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { RotateCw, Trash2, Undo2, X } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import { a11y } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';

import { COLORS, SIZE_PRESETS, uid, pointsToPathD, arrowHead, annotationBounds, hitTestAnnotation, translateAnnotation } from './schema';
import type { Annotation, PhotoAnnotatorProps, Point, Tool } from './schema';
import { getstyles, getmodalStyles } from './styles';
import { useImageEditSession } from './useImageEditSession';
import { AnnotatorToolbar } from './AnnotatorToolbar';
import { AnnotatorColorBar } from './AnnotatorColorBar';
import { AnnotatorSizeBar } from './AnnotatorSizeBar';
import { CropOverlay } from './CropOverlay';
import { displayRectToPixels, type CropRect } from './cropGeometry';

// Tools that draw a colored stroke — these reveal both the floating color and
// size controls. Text also uses color (so it gets the color bar) but has a fixed
// width (no size bar). Move uses neither.
const STROKE_TOOLS: Tool[] = ['pen', 'arrow', 'circle', 'rect'];
const COLOR_TOOLS: Tool[] = [...STROKE_TOOLS, 'text'];

// Animate the contextual style panel + crop/draw toolbar swap (Android opt-in).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const animateLayout = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

/* ─────────────────────────── Component ─────────────────────────── */

export default function PhotoAnnotator({ sourceUri, onSave, onCancel }: PhotoAnnotatorProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const modalStyles = useMemo(() => getmodalStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  // Working image + dims + crop/rotate transforms.
  const { workingUri, imgW, imgH, photoLayout, busy, applyCrop, applyRotate } = useImageEditSession(sourceUri, insets);

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

  // Crop mode; the live crop rect lives in a ref (CropOverlay owns it). Crop is
  // always free-form (aspect presets removed) and rotate lives in the header.
  const [cropMode, setCropMode] = useState(false);
  const cropRectRef = useRef<CropRect | null>(null);

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

  /* Actions */
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
          // Clearing every annotation is a destructive reset → Heavy.
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
      {
        id: uid(),
        tool: 'text',
        color,
        width: 0,
        text: textInput.trim(),
        x: textPos.x,
        y: textPos.y,
      },
    ]);
    setTextModalVisible(false);
    setTextInput('');
    haptic.light();
  }, [textInput, textPos, color]);

  // Crop/rotate change the coordinate space, so existing annotations no longer
  // map — confirm before discarding them, then run the transform.
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
    animateLayout();
    setTool(next);
  }, []);

  const enterCrop = useCallback(() => {
    setSelectedId(null);
    animateLayout();
    setCropMode(true);
    haptic.light();
  }, []);

  const cancelCrop = useCallback(() => {
    animateLayout();
    setCropMode(false);
  }, []);

  const onRotate = useCallback(() => {
    runWithAnnotationReset(() => {
      applyRotate(90);
      haptic.light();
    });
  }, [runWithAnnotationReset, applyRotate]);

  const onCropApply = useCallback(() => {
    const rect = cropRectRef.current;
    if (!rect || !photoLayout || !imgW) {
      setCropMode(false);
      return;
    }
    const scale = imgW / photoLayout.w;
    const px = displayRectToPixels(rect, scale, imgW, imgH);
    runWithAnnotationReset(async () => {
      await applyCrop(px);
      animateLayout();
      setCropMode(false);
      haptic.light();
    });
  }, [photoLayout, imgW, imgH, applyCrop, runWithAnnotationReset]);

  const save = useCallback(async () => {
    if (!photoContainerRef.current) return;
    setSaving(true);
    // Drop the move-tool selection outline and let the frame repaint so it
    // isn't baked into the flattened image.
    setSelectedId(null);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    try {
      const uri = await captureRef(photoContainerRef, {
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
      });
      onSave(uri);
    } catch (e) {
      haptic.error();
      Alert.alert(t('photoAnnotator.saveFailed'), t('photoAnnotator.saveTryAgain'));
    } finally {
      setSaving(false);
    }
  }, [onSave, t]);

  /* Render helpers */
  const renderAnnotation = (a: Annotation, isCurrent = false) => {
    const opacity = isCurrent ? 0.7 : 0.95;
    const key = isCurrent ? 'current' : a.id;

    if (a.tool === 'pen' && a.points && a.points.length > 1) {
      return (
        <Path
          key={key}
          d={pointsToPathD(a.points)}
          stroke={a.color}
          strokeWidth={a.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={opacity}
        />
      );
    }

    if (a.tool === 'arrow' && a.start && a.end) {
      return (
        <G key={key}>
          <Line
            x1={a.start.x}
            y1={a.start.y}
            x2={a.end.x}
            y2={a.end.y}
            stroke={a.color}
            strokeWidth={a.width}
            strokeLinecap="round"
            opacity={opacity}
          />
          <Polygon
            points={arrowHead(a.start, a.end, 10 + a.width)}
            fill={a.color}
            opacity={opacity}
          />
        </G>
      );
    }

    if (a.tool === 'circle' && a.start && a.end) {
      const r = Math.sqrt((a.end.x - a.start.x) ** 2 + (a.end.y - a.start.y) ** 2);
      return (
        <SvgCircle
          key={key}
          cx={a.start.x}
          cy={a.start.y}
          r={r}
          stroke={a.color}
          strokeWidth={a.width}
          fill="none"
          opacity={opacity}
        />
      );
    }

    if (a.tool === 'rect' && a.start && a.end) {
      const x = Math.min(a.start.x, a.end.x);
      const y = Math.min(a.start.y, a.end.y);
      const w = Math.abs(a.end.x - a.start.x);
      const h = Math.abs(a.end.y - a.start.y);
      return (
        <Rect
          key={key}
          x={x}
          y={y}
          width={w}
          height={h}
          stroke={a.color}
          strokeWidth={a.width}
          fill="none"
          rx={4}
          opacity={opacity}
        />
      );
    }

    if (a.tool === 'text' && a.text !== undefined) {
      return (
        <SvgText
          key={key}
          x={a.x}
          y={a.y}
          fill={a.color}
          fontSize={16}
          fontWeight="bold"
          textAnchor="start"
          opacity={opacity}
          stroke={a.color === '#FFFFFF' ? '#1A1A1A' : '#FFFFFF'}
          strokeWidth={0.5}
        >
          {a.text}
        </SvgText>
      );
    }

    return null;
  };

  // Bounding box of the selected annotation, drawn as a dashed outline while
  // the move tool is active so the user can see what they're dragging.
  const selectedBounds = useMemo(() => {
    if (tool !== 'move' || !selectedId) return null;
    const a = annotations.find((x) => x.id === selectedId);
    return a ? annotationBounds(a) : null;
  }, [tool, selectedId, annotations]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={cropMode ? cancelCrop : onCancel} hitSlop={12} style={styles.headerBtn} {...a11y(t('common.cancel'), t('photoAnnotator.cancelA11yHint'), 'button')}>
          <X size={26} color={theme.colors.ink} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{cropMode ? t('photoAnnotator.cropTitle') : t('photoAnnotator.headerTitle')}</Text>
        {cropMode ? (
          <Pressable onPress={onRotate} hitSlop={12} style={styles.headerBtn} {...a11y(t('photoAnnotator.rotateA11y'), t('photoAnnotator.rotateA11yHint'), 'button')}>
            <RotateCw size={24} color={theme.colors.ink} strokeWidth={1.6} />
          </Pressable>
        ) : (
          <View style={styles.headerRight}>
            <Pressable onPress={undo} disabled={annotations.length === 0} hitSlop={8} style={styles.headerBtn} {...a11y(t('photoAnnotator.undoA11y'), t('photoAnnotator.undoA11yHint'), 'button')}>
              <Undo2 size={24} color={annotations.length ? theme.colors.ink : theme.colors.inkFaint} strokeWidth={1.6} />
            </Pressable>
            <Pressable onPress={clearAll} hitSlop={8} style={styles.headerBtn} {...a11y(t('photoAnnotator.clearAllA11y'), t('photoAnnotator.clearAllA11yHint'), 'button')}>
              <Trash2 size={22} color={theme.colors.danger} strokeWidth={1.6} />
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Photo Canvas ── */}
      <View style={styles.canvasWrap}>
        {photoLayout && (
          // photoBox is sized to the photo and centered by canvasWrap. Both the
          // captured photo View and the floating-controls overlay fill it, so the
          // pills hug the *image* edges (not the letterbox) at every aspect ratio.
          <View style={[styles.photoBox, { width: photoLayout.w, height: photoLayout.h }]}>
            <View
              ref={photoContainerRef}
              style={styles.photoFill}
              onLayout={(e) => {
                const { width: w, height: h } = e.nativeEvent.layout;
                setContainerSize({ w, h });
              }}
              {...(cropMode ? {} : panResponder.panHandlers)}
            >
              <Image
                source={{ uri: workingUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
              <Svg
                width={containerSize.w || photoLayout.w}
                height={containerSize.h || photoLayout.h}
                style={StyleSheet.absoluteFill}
              >
                {annotations.map((a) => renderAnnotation(a))}
                {current && renderAnnotation(current, true)}
                {selectedBounds && (
                  <Rect
                    x={selectedBounds.minX - 8}
                    y={selectedBounds.minY - 8}
                    width={selectedBounds.maxX - selectedBounds.minX + 16}
                    height={selectedBounds.maxY - selectedBounds.minY + 16}
                    stroke={theme.colors.accent}
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    fill="none"
                    rx={6}
                  />
                )}
              </Svg>
              {cropMode && (
                <CropOverlay
                  layout={photoLayout}
                  ratio={null}
                  accent={theme.colors.accent}
                  onRectChange={(r) => {
                    cropRectRef.current = r;
                  }}
                />
              )}
            </View>

            {/* Floating brush controls — a sibling of the captured photo View (so
                they never bake into the saved image), filling the same photo box.
                `box-none` lets draw touches fall through to the canvas everywhere
                except the pills themselves. Color shows for stroke + text tools;
                the size picker only for stroke tools (text width is fixed). */}
            {!cropMode && COLOR_TOOLS.includes(tool) && (
              <View pointerEvents="box-none" style={styles.floatingLayer}>
                <View pointerEvents="box-none" style={styles.colorBarSlot}>
                  <AnnotatorColorBar color={color} onColor={setColor} theme={theme} t={t} />
                </View>
                {STROKE_TOOLS.includes(tool) && (
                  <View pointerEvents="box-none" style={styles.sizeBarSlot}>
                    <AnnotatorSizeBar value={width} onChange={setWidth} color={color} theme={theme} t={t} />
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Bottom Toolbar ── */}
      <AnnotatorToolbar
        styles={styles}
        theme={theme}
        t={t}
        cropMode={cropMode}
        bottomInset={insets.bottom}
        tool={tool}
        onTool={handleTool}
        onSave={save}
        saving={saving}
        onCrop={enterCrop}
        onCropApply={onCropApply}
        onCropCancel={cancelCrop}
        busy={busy}
      />

      {/* ── Text Input Modal ── */}
      <Modal
        visible={textModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTextModalVisible(false)}
      >
        <Pressable style={modalStyles.overlay} onPress={() => setTextModalVisible(false)}>
          <Pressable onPress={() => {}}>
            <View style={modalStyles.card}>
            <FloatingLabelInput
              label={t('photoAnnotator.addText')}
              value={textInput}
              onChangeText={setTextInput}
              maxLength={60}
              autoFocus
              style={{ marginBottom: 0 }}
            />
            <View style={modalStyles.actions}>
              <Pressable onPress={() => setTextModalVisible(false)} style={modalStyles.cancelBtn} {...a11y(t('common.cancel'), t('photoAnnotator.cancelTextA11yHint'), 'button')}>
                <Text style={modalStyles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={addTextAnnotation} style={modalStyles.confirmBtn} {...a11y(t('photoAnnotator.addText'), t('photoAnnotator.addTextA11yHint'), 'button')}>
                <Text style={modalStyles.confirmText}>{t('common.add')}</Text>
              </Pressable>
            </View>
          </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
