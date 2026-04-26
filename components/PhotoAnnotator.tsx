// PhotoAnnotator.tsx — Full-screen photo annotation canvas
//
// Inspectors draw on photos before upload: circle defects, arrow to cracks,
// write measurements. Uses SVG + PanResponder for drawing and
// react-native-view-shot to merge annotations with the original photo.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { haptic } from '../lib/haptics';
import { theme } from '../lib/theme';

export interface PhotoAnnotatorProps {
  sourceUri: string;
  onSave: (annotatedUri: string) => void;
  onCancel: () => void;
}

/* ─────────────────────────── Types ─────────────────────────── */

type Tool = 'pen' | 'arrow' | 'circle' | 'rect' | 'text';

interface Point { x: number; y: number }

interface Annotation {
  id: string;
  tool: Tool;
  color: string;
  width: number;
  // Pen: array of points
  points?: Point[];
  // Arrow / circle / rect
  start?: Point;
  end?: Point;
  // Text
  text?: string;
  x?: number;
  y?: number;
}

/* ─────────────────────────── Constants ─────────────────────────── */

const COLORS = [
  { label: 'red', value: '#EF4444' },
  { label: 'yellow', value: '#F59E0B' },
  { label: 'green', value: '#10B981' },
  { label: 'black', value: '#1A1A1A' },
  { label: 'white', value: '#FFFFFF' },
];

const WIDTHS = [2, 4, 6, 8, 10, 12];

const SCREEN = Dimensions.get('window');

/* ─────────────────────────── Helpers ─────────────────────────── */

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function pointsToPathD(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function arrowHead(start: Point, end: Point, size = 14): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const x1 = end.x - size * Math.cos(angle - Math.PI / 6);
  const y1 = end.y - size * Math.sin(angle - Math.PI / 6);
  const x2 = end.x - size * Math.cos(angle + Math.PI / 6);
  const y2 = end.y - size * Math.sin(angle + Math.PI / 6);
  return `${x1},${y1} ${end.x},${end.y} ${x2},${y2}`;
}

/* ─────────────────────────── Component ─────────────────────────── */

export default function PhotoAnnotator({ sourceUri, onSave, onCancel }: PhotoAnnotatorProps) {
  const insets = useSafeAreaInsets();

  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0].value);
  const [width, setWidth] = useState(4);
  const [current, setCurrent] = useState<Annotation | null>(null);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<Point>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const photoContainerRef = useRef<View>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Refs to avoid stale closures in PanResponder
  const toolRef = useRef(tool);
  const currentRef = useRef(current);
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { widthRef.current = width; }, [width]);

  /* Load photo dimensions */
  useEffect(() => {
    Image.getSize(
      sourceUri,
      (w, h) => {
        setImgW(w);
        setImgH(h);
      },
      () => {
        // fallback: assume 4:3
        setImgW(4);
        setImgH(3);
      },
    );
  }, [sourceUri]);

  /* Compute photo container layout to preserve aspect ratio */
  const photoLayout = useMemo(() => {
    if (!imgW || !imgH) return null;
    const headerH = 56 + insets.top;
    const toolbarH = 200; // approximate bottom area
    const maxW = SCREEN.width;
    const maxH = SCREEN.height - headerH - toolbarH;
    const aspect = imgW / imgH;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return { w, h };
  }, [imgW, imgH, insets.top]);

  /* PanResponder for drawing */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const t = toolRef.current;
        const { locationX, locationY } = evt.nativeEvent;
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
        const cur = currentRef.current;
        const t = toolRef.current;
        if (!cur) return;
        const { locationX, locationY } = evt.nativeEvent;
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
        const cur = currentRef.current;
        const t = toolRef.current;
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
    Alert.alert('ყველა მონიშვნის წაშლა', 'დარწმუნებული ხარ?', [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: () => {
          setAnnotations([]);
          haptic.medium();
        },
      },
    ]);
  }, []);

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

  const save = useCallback(async () => {
    if (!photoContainerRef.current) return;
    setSaving(true);
    try {
      const uri = await captureRef(photoContainerRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      onSave(uri);
    } catch (e) {
      Alert.alert('შენახვა ვერ მოხერხდა', 'სცადე თავიდან');
    } finally {
      setSaving(false);
    }
  }, [onSave]);

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
        <Circle
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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="close" size={26} color={theme.colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>ფოტოს მონიშვნა</Text>
        <Pressable onPress={save} disabled={saving} hitSlop={12} style={styles.headerBtn}>
          {saving ? (
            <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>...</Text>
          ) : (
            <Ionicons name="checkmark" size={26} color={theme.colors.accent} />
          )}
        </Pressable>
      </View>

      {/* ── Photo Canvas ── */}
      <View style={styles.canvasWrap}>
        {photoLayout && (
          <View
            ref={photoContainerRef}
            style={[
              styles.photoContainer,
              { width: photoLayout.w, height: photoLayout.h },
            ]}
            onLayout={(e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              setContainerSize({ w, h });
            }}
            {...panResponder.panHandlers}
          >
            <Image
              source={{ uri: sourceUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <Svg
              width={containerSize.w || photoLayout.w}
              height={containerSize.h || photoLayout.h}
              style={StyleSheet.absoluteFill}
            >
              {annotations.map((a) => renderAnnotation(a))}
              {current && renderAnnotation(current, true)}
            </Svg>
          </View>
        )}
      </View>

      {/* ── Bottom Toolbar ── */}
      <View style={styles.toolbar}>
        {/* Color row */}
        <View style={styles.row}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
            {COLORS.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setColor(c.value)}
                style={[
                  styles.colorBtn,
                  { backgroundColor: c.value },
                  color === c.value && styles.colorBtnActive,
                ]}
              >
                {c.value === '#FFFFFF' && <View style={styles.whiteBtnRing} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Tool row */}
        <View style={styles.row}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
            {([
              { key: 'pen', icon: 'pencil-outline' },
              { key: 'arrow', icon: 'arrow-forward-outline' },
              { key: 'circle', icon: 'ellipse-outline' },
              { key: 'rect', icon: 'square-outline' },
              { key: 'text', icon: 'text-outline' },
            ] as { key: Tool; icon: any }[]).map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTool(t.key)}
                style={[styles.toolBtn, tool === t.key && styles.toolBtnActive]}
              >
                <Ionicons
                  name={t.icon}
                  size={22}
                  color={tool === t.key ? theme.colors.white : theme.colors.ink}
                />
              </Pressable>
            ))}
            <View style={styles.divider} />
            <Pressable onPress={undo} disabled={annotations.length === 0} style={styles.toolBtn}>
              <Ionicons
                name="arrow-undo-outline"
                size={22}
                color={annotations.length === 0 ? theme.colors.hairline : theme.colors.ink}
              />
            </Pressable>
            <Pressable onPress={clearAll} style={styles.toolBtn}>
              <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
            </Pressable>
          </ScrollView>
        </View>

        {/* Width row */}
        <View style={styles.row}>
          <View style={styles.rowContent}>
            {WIDTHS.map((w) => (
              <Pressable
                key={w}
                onPress={() => setWidth(w)}
                style={[styles.widthBtn, width === w && styles.widthBtnActive]}
              >
                <View
                  style={{
                    width: w,
                    height: w,
                    borderRadius: w / 2,
                    backgroundColor: color,
                    borderWidth: color === '#FFFFFF' ? 1 : 0,
                    borderColor: theme.colors.hairline,
                  }}
                />
              </Pressable>
            ))}
            <Text style={styles.widthLabel}>{width}px</Text>
          </View>
        </View>

        {/* Save button */}
        <Pressable onPress={save} disabled={saving} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>{saving ? 'ინახება…' : 'შენახვა'}</Text>
        </Pressable>
      </View>

      {/* ── Text Input Modal ── */}
      <Modal
        visible={textModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTextModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.label}>ტექსტის დამატება</Text>
            <TextInput
              value={textInput}
              onChangeText={setTextInput}
              placeholder="მაგ: 15 სმ"
              placeholderTextColor={theme.colors.inkFaint}
              style={modalStyles.input}
              autoFocus
              maxLength={60}
            />
            <View style={modalStyles.actions}>
              <Pressable onPress={() => setTextModalVisible(false)} style={modalStyles.cancelBtn}>
                <Text style={modalStyles.cancelText}>გაუქმება</Text>
              </Pressable>
              <Pressable onPress={addTextAnnotation} style={modalStyles.confirmBtn}>
                <Text style={modalStyles.confirmText}>დამატება</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}



/* ─────────────────────────── Styles ─────────────────────────── */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.hairline,
    backgroundColor: theme.colors.card,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  canvasWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  photoContainer: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  toolbar: {
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
  },
  row: {
    paddingHorizontal: 12,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorBtnActive: {
    borderColor: theme.colors.ink,
    transform: [{ scale: 1.15 }],
  },
  whiteBtnRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.subtleSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.hairline,
    marginHorizontal: 4,
  },
  widthBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  widthBtnActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  widthLabel: {
    marginLeft: 8,
    fontSize: 13,
    color: theme.colors.inkSoft,
    fontWeight: '600',
    minWidth: 30,
  },
  saveBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    height: 50,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.button,
  },
  saveBtnText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    gap: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.ink,
    backgroundColor: theme.colors.subtleSurface,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  cancelText: {
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
  },
  confirmText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
});
