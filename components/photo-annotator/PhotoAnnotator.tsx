// PhotoAnnotator.tsx - Full-screen photo annotation canvas
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
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { ArrowRight, Check, Circle, Pencil, Square, Trash2, Type, Undo2, X } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import { a11y } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';

import { COLORS, WIDTHS, SCREEN, uid, pointsToPathD, arrowHead } from './schema';
import type { Annotation, PhotoAnnotatorProps, Point, Tool } from './schema';
import { getstyles, getmodalStyles } from './styles';


/* ─────────────────────────── Component ─────────────────────────── */

export default function PhotoAnnotator({ sourceUri, onSave, onCancel }: PhotoAnnotatorProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const modalStyles = useMemo(() => getmodalStyles(theme), [theme]);
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
  useEffect(() => {
    toolRef.current = tool;
    currentRef.current = current;
    colorRef.current = color;
    widthRef.current = width;
  }, [tool, current, color, width]);

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
    Alert.alert('ყველა მონიშვნის წაშლა', 'დარწმუნებული ხართ?', [
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
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
      });
      onSave(uri);
    } catch (e) {
      Alert.alert('შენახვა ვერ მოხერხდა', 'სცადეთ თავიდან');
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

  const toolButtons: { key: Tool; Icon: LucideIcon }[] = [
    { key: 'pen', Icon: Pencil },
    { key: 'arrow', Icon: ArrowRight },
    { key: 'circle', Icon: Circle },
    { key: 'rect', Icon: Square },
    { key: 'text', Icon: Type },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={12} style={styles.headerBtn} {...a11y('გაუქმება', 'შეეხეთ მონიშვნის გასაუქმებლად', 'button')}>
          <X size={26} color={theme.colors.ink} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>ფოტოს მონიშვნა</Text>
        <Pressable onPress={save} disabled={saving} hitSlop={12} style={styles.headerBtn} {...a11y('შენახვა', 'შეეხეთ დახატული ფოტოს შესანახად', 'button')}>
          {saving ? (
            <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>...</Text>
          ) : (
            <Check size={26} color={theme.colors.accent} strokeWidth={1.5} />
          )}
        </Pressable>
      </View>

      {/* ── Photo Canvas ── */}
      <View style={styles.canvasWrap}>
        {photoLayout && (
          <View
            ref={photoContainerRef}
            style={styles.photoContainer}
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
                hitSlop={8}
                style={[
                  styles.colorBtn,
                  { backgroundColor: c.value },
                  color === c.value && styles.colorBtnActive,
                ]}
                {...a11y(`ფერი: ${c.label}`, 'შეეხეთ ამ ფერის ასარჩევად', 'button')}
              >
                {c.value === '#FFFFFF' && <View style={styles.whiteBtnRing} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Tool row */}
        <View style={styles.row}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
            {toolButtons.map(({ key, Icon }) => (
              <Pressable
                key={key}
                onPress={() => setTool(key)}
                style={[styles.toolBtn, tool === key && styles.toolBtnActive]}
                {...a11y(`ხელსაწყო: ${key}`, 'შეეხეთ ამ ხელსაწყოს ასარჩევად', 'button')}
              >
                <Icon
                  size={22}
                  color={tool === key ? theme.colors.white : theme.colors.ink}
                  strokeWidth={1.5}
                />
              </Pressable>
            ))}
            <View style={styles.divider} />
            <Pressable onPress={undo} disabled={annotations.length === 0} style={styles.toolBtn} {...a11y('უკან დაბრუნება', 'შეეხეთ ბოლო ნაბიჯის გასაუქმებლად', 'button')}>
              <Undo2
                size={22}
                color={annotations.length === 0 ? theme.colors.hairline : theme.colors.ink}
                strokeWidth={1.5}
              />
            </Pressable>
            <Pressable onPress={clearAll} style={styles.toolBtn} {...a11y('ყველაფრის წაშლა', 'შეეხეთ ყველა მონიშვნის წასაშლელად', 'button')}>
              <Trash2 size={22} color={theme.colors.danger} strokeWidth={1.5} />
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
                hitSlop={4}
                style={[styles.widthBtn, width === w && styles.widthBtnActive]}
                {...a11y(`სისქე: ${w}px`, 'შეეხეთ ამ სისქის ასარჩევად', 'button')}
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
        <Pressable onPress={save} disabled={saving} style={styles.saveBtn} {...a11y('შენახვა', 'შეეხეთ დახატული ფოტოს შესანახად', 'button')}>
          <Text style={styles.saveBtnText}>{saving ? 'ინახება...' : 'შენახვა'}</Text>
        </Pressable>
      </View>

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
              label="ტექსტის დამატება"
              value={textInput}
              onChangeText={setTextInput}
              maxLength={60}
              autoFocus
              style={{ marginBottom: 0 }}
            />
            <View style={modalStyles.actions}>
              <Pressable onPress={() => setTextModalVisible(false)} style={modalStyles.cancelBtn} {...a11y('გაუქმება', 'შეეხეთ ტექსტის დამატების გასაუქმებლად', 'button')}>
                <Text style={modalStyles.cancelText}>გაუქმება</Text>
              </Pressable>
              <Pressable onPress={addTextAnnotation} style={modalStyles.confirmBtn} {...a11y('ტექსტის დამატება', 'შეეხეთ ტექსტის ფოტოზე დასამატებლად', 'button')}>
                <Text style={modalStyles.confirmText}>დამატება</Text>
              </Pressable>
            </View>
          </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
