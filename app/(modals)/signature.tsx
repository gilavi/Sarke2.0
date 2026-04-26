import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import Draw from 'expo-draw';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../../lib/haptics';
import { useToast } from '../../lib/toast';

export default function SignatureModal() {
  const router = useRouter();
  const toast = useToast();
  const drawRef = useRef<any>(null);
  const [strokes, setStrokes] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  const handleUndo = () => {
    haptic.light();
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setRedoStack(prev => [...prev, last]);
    setStrokes(prev => prev.slice(0, -1));
    drawRef.current?.rewind?.();
  };

  const handleRedo = () => {
    haptic.light();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setStrokes(prev => [...prev, next]);
    setRedoStack(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    haptic.medium();
    setRedoStack([]);
    setStrokes([]);
    drawRef.current?.clear?.();
  };

  const handleConfirm = () => {
    haptic.success();
    if (strokes.length === 0) {
      toast.error('ხელმოწერა ცარიელია');
      return;
    }
    const svg = buildSvg(strokes);
    toast.success('ხელმოწერა შენახულია');
    router.back();
  };

  const onStrokesChange = (newStrokes: any[]) => {
    setStrokes(newStrokes);
    if (newStrokes.length > strokes.length) {
      setRedoStack([]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.toolbar}>
        <Pressable onPress={handleUndo} style={styles.toolBtn}>
          <Ionicons name="arrow-undo" size={22} color="#333" />
          <Text style={styles.toolLabel}>უკან</Text>
        </Pressable>
        <Pressable onPress={handleRedo} style={styles.toolBtn}>
          <Ionicons name="arrow-redo" size={22} color="#333" />
          <Text style={styles.toolLabel}>წინ</Text>
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
          ref={drawRef}
          strokes={strokes}
          enabled={true}
          style={styles.canvas}
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
    if (stroke.length === 0) continue;
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
