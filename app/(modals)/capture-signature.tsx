import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import Draw from 'expo-draw';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../../lib/haptics';
import { useToast } from '../../lib/toast';

export default function CaptureSignatureModal() {
  const router = useRouter();
  const toast = useToast();
  const [strokes, setStrokes] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const rewindRef = useRef<(() => void) | null>(null);
  const clearRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  const handleUndo = useCallback(() => {
    haptic.light();
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setRedoStack(prev => [...prev, last]);
    setStrokes(prev => prev.slice(0, -1));
    rewindRef.current?.();
  }, [strokes]);

  const handleRedo = useCallback(() => {
    haptic.light();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setStrokes(prev => [...prev, next]);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack]);

  const handleClear = useCallback(() => {
    haptic.medium();
    setRedoStack([]);
    setStrokes([]);
    clearRef.current?.();
  }, []);

  const handleConfirm = useCallback(() => {
    haptic.success();
    if (strokes.length === 0) {
      toast.error('ხელმოწერა ცარიელია');
      return;
    }
    const svg = buildSvg(strokes);
    // TODO: pass svg back to caller via router params or global state
    toast.success('ხელმოწერა შენახულია');
    router.back();
  }, [strokes, toast, router]);

  const onChangeStrokes = useCallback((newStrokes: any[]) => {
    setStrokes(prev => {
      if (newStrokes.length > prev.length) {
        setRedoStack([]);
      }
      return newStrokes;
    });
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.toolbar}>
        <Pressable onPress={handleUndo} style={styles.toolBtn} disabled={strokes.length === 0}>
          <Ionicons name="arrow-undo" size={22} color={strokes.length === 0 ? '#ccc' : '#333'} />
          <Text style={[styles.toolLabel, { color: strokes.length === 0 ? '#ccc' : '#333' }]}>უკან</Text>
        </Pressable>
        <Pressable onPress={handleRedo} style={styles.toolBtn} disabled={redoStack.length === 0}>
          <Ionicons name="arrow-redo" size={22} color={redoStack.length === 0 ? '#ccc' : '#333'} />
          <Text style={[styles.toolLabel, { color: redoStack.length === 0 ? '#ccc' : '#333' }]}>წინ</Text>
        </Pressable>
        <Pressable onPress={handleClear} style={styles.toolBtn}>
          <Ionicons name="trash-outline" size={22} color="#C0433C" />
          <Text style={[styles.toolLabel, { color: '#C0433C' }]}>წაშლა</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.back()} style={styles.toolBtn}>
          <Ionicons name="close" size={24} color="#333" />
        </Pressable>
      </View>

      <View style={styles.canvasWrap}>
        <Draw
          strokes={strokes}
          enabled={true}
          containerStyle={styles.canvas}
          color="#000000"
          strokeWidth={3}
          onChangeStrokes={onChangeStrokes}
          rewind={(fn: () => void) => { rewindRef.current = fn; }}
          clear={(fn: () => void) => { clearRef.current = fn; }}
        />
      </View>

      <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
        <Text style={styles.confirmText}>დადასტურება</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function buildSvg(strokes: any[]): string {
  const { width, height } = Dimensions.get('window');
  let paths = '';
  for (const stroke of strokes) {
    if (!stroke || stroke.length === 0) continue;
    let d = `M ${stroke[0].x},${stroke[0].y}`;
    for (let i = 1; i < stroke.length; i++) {
      d += ` L ${stroke[i].x},${stroke[i].y}`;
    }
    paths += `<path d="${d}" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths}</svg>`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F2EA' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  toolBtn: { alignItems: 'center', gap: 4 },
  toolLabel: { fontSize: 11, fontWeight: '600', color: '#333' },
  canvasWrap: {
    flex: 1,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E1D4',
    overflow: 'hidden',
  },
  canvas: { flex: 1 },
  confirmBtn: {
    margin: 16,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#147A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
