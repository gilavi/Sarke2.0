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
 * - "შენახვა" disabled until the user draws (onBegin flips hasStroke).
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
  // The fixed/100% sizing is required: without it the inner <canvas>
  // keeps its initial width/height and the bottom half stops registering
  // touches as the WebView grows.
  const webStyle = `
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #fff; overflow: hidden; }
    .m-signature-pad { position: fixed; top: 0; left: 0; right: 0; bottom: 0; box-shadow: none; border: none; background: #fff; margin: 0; }
    .m-signature-pad--body { border: none; height: 100%; }
    .m-signature-pad--body canvas { width: 100% !important; height: 100% !important; background: #fff; }
    .m-signature-pad--footer { display: none; }
  `;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ხელმოწერა</Text>
            <Text style={styles.title} numberOfLines={1}>
              {personName || 'ხელმომწერი'}
            </Text>
          </View>
          {hasStroke && (
            <Pressable onPress={handleClear} hitSlop={12} style={[styles.headerBtn, { marginRight: 8 }]}>
              <Ionicons name="refresh" size={18} color={theme.colors.inkSoft} />
            </Pressable>
          )}
          <Pressable onPress={onCancel} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color={theme.colors.ink} />
          </Pressable>
        </View>

        {/* Canvas — fixed height so buttons always sit close below */}
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
            style={{ flex: 1 }}
            webviewContainerStyle={{ flex: 1 }}
          />
          {/* Dashed sign-here line */}
          <View pointerEvents="none" style={styles.baseline} />
          {/* Hint — only shown before first stroke */}
          {!hasStroke && (
            <View pointerEvents="none" style={styles.hintWrap}>
              <Text style={styles.hintText}>ამ სივრცეში ხელი მოაწერეთ</Text>
            </View>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.footer}>
          <Button
            title="გაუქმება"
            variant="secondary"
            onPress={onCancel}
            style={{ flex: 1 }}
          />
          <Button
            title="შენახვა"
            onPress={handleConfirm}
            disabled={!hasStroke}
            style={{ flex: 1.6 }}
          />
        </View>
      </SafeAreaView>
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
    paddingTop: 8,
    paddingBottom: 12,
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: theme.colors.subtleSurface,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: theme.colors.subtleSurface,
  },
  canvasWrap: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  baseline: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.hairline,
  },
  hintWrap: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: theme.colors.inkFaint,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingTop: 14,
  },
});
