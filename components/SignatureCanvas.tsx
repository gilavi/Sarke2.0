import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { Button } from './ui';
import { theme } from '../lib/theme';

interface Props {
  visible: boolean;
  personName: string;
  onCancel: () => void;
  /** Called with a base64-encoded PNG (no data: prefix). */
  onConfirm: (base64Png: string) => void;
}

/**
 * Full-screen signature capture.
 * - Black ink on white canvas, portrait.
 * - "დადასტურება" disabled until the user draws (onBegin flips hasStroke).
 * - "გასუფთავება" resets canvas + confirm state.
 */
export function SignatureCanvas({ visible, personName, onCancel, onConfirm }: Props) {
  const ref = useRef<SignatureViewRef>(null);
  const [hasStroke, setHasStroke] = useState(false);

  // Reset state when modal opens for a new signer
  useEffect(() => {
    if (visible) {
      setHasStroke(false);
      // Small timeout so the canvas is mounted before we clear
      const id = setTimeout(() => ref.current?.clearSignature(), 120);
      return () => clearTimeout(id);
    }
  }, [visible]);

  const handleConfirm = useCallback(() => {
    if (!hasStroke) return;
    ref.current?.readSignature();
  }, [hasStroke]);

  const handleClear = useCallback(() => {
    ref.current?.clearSignature();
    setHasStroke(false);
  }, []);

  const handleOK = useCallback(
    (sig: string) => {
      const cleaned = sig.replace(/^data:image\/png;base64,/, '');
      onConfirm(cleaned);
    },
    [onConfirm],
  );

  // The WebView's onBegin fires on the first touch — we use it as our
  // "user has drawn" signal so Confirm can enable/disable correctly.
  const webStyle = `
    .m-signature-pad { box-shadow: none; border: none; background: #fff; margin: 0; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--body canvas { background: #fff; }
    .m-signature-pad--footer { display: none; }
    body, html { background: #fff; margin: 0; }
  `;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>ხელმოწერა</Text>
              <Text style={styles.title} numberOfLines={1}>
                {personName || 'ხელმომწერი'}
              </Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.ink} />
            </Pressable>
          </View>

          <View style={styles.canvasWrap}>
            <SignatureScreen
              ref={ref}
              onOK={handleOK}
              onBegin={() => setHasStroke(true)}
              onEnd={() => setHasStroke(true)}
              webStyle={webStyle}
              descriptionText=""
              autoClear={false}
              imageType="image/png"
              backgroundColor="rgba(255,255,255,1)"
              penColor="#000000"
              minWidth={1.2}
              maxWidth={3}
            />
            <View pointerEvents="none" style={styles.baseline} />
          </View>

          <View style={styles.footer}>
            <Button
              title="გასუფთავება"
              variant="secondary"
              onPress={handleClear}
              style={{ flex: 1 }}
              disabled={!hasStroke}
            />
            <Button
              title="გაუქმება"
              variant="secondary"
              onPress={onCancel}
              style={{ flex: 1 }}
            />
            <Button
              title="დადასტურება"
              onPress={handleConfirm}
              disabled={!hasStroke}
              style={{ flex: 1.4 }}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.ink, marginTop: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: theme.colors.subtleSurface,
  },
  canvasWrap: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  baseline: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    right: 24,
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.hairline,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
});
