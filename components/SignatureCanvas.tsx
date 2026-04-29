import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { useTheme } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { a11y } from '../lib/accessibility';

interface Props {
  personName: string;
  onCancel: () => void;
  /** Called with a base64-encoded PNG (no data: prefix). */
  onConfirm: (base64Png: string) => void;
}

/**
 * Inline signature capture — embedded inside a BottomSheet, NOT a modal.
 * Uses explicit bottom inset padding instead of SafeAreaView because
 * SafeAreaView fails to compute insets when deeply nested under
 * position:absolute + justifyContent:flex-end parents.
 */
export function SignatureCanvas({ personName, onCancel, onConfirm }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<SignatureViewRef>(null);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    setHasStroke(false);
    const id = setTimeout(() => ref.current?.clearSignature(), 120);
    return () => clearTimeout(id);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!hasStroke) return;
    ref.current?.readSignature();
  }, [hasStroke]);

  const handleClear = useCallback(() => {
    ref.current?.clearSignature();
    setHasStroke(false);
    haptic.light();
  }, []);

  const handleOK = useCallback(
    (sig: string) => {
      const cleaned = sig.replace(/^data:image\/png;base64,/, '');
      onConfirm(cleaned);
    },
    [onConfirm],
  );

  const webStyle = `
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #fff; overflow: hidden; }
    .m-signature-pad { position: fixed; top: 0; left: 0; right: 0; bottom: 0; box-shadow: none; border: none; background: #fff; margin: 0; }
    .m-signature-pad--body { border: none; height: 100%; }
    .m-signature-pad--body canvas { width: 100% !important; height: 100% !important; background: #fff; }
    .m-signature-pad--footer { display: none; }
  `;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 12 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>ხელმოწერა</Text>
          <Text style={styles.title} numberOfLines={1}>
            {personName || 'ხელმომწერი'}
          </Text>
        </View>
        <Pressable onPress={onCancel} hitSlop={12} style={styles.headerBtn} {...a11y('დახურვა', undefined, 'button')}>
          <Ionicons name="close" size={22} color={theme.colors.ink} />
        </Pressable>
      </View>

      {/* Canvas */}
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
        <Pressable onPress={onCancel} style={styles.cancelTextBtn}>
          <Text style={styles.cancelText}>გაუქმება</Text>
        </Pressable>
        <Pressable
          onPress={handleClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.btnPressed]}
          {...a11y('გასუფთავება', 'ხელმოწერის გასუფთავება', 'button')}
        >
          <Text style={styles.clearBtnText}>გასუფთავება</Text>
        </Pressable>
        <Pressable
          onPress={handleConfirm}
          disabled={!hasStroke}
          style={({ pressed }) => [
            styles.confirmBtn,
            !hasStroke && styles.confirmBtnDisabled,
            pressed && hasStroke && styles.btnPressed,
          ]}
          {...a11y('დადასტურება', 'ხელმოწერის დადასტურება', 'button')}
        >
          <Text style={styles.confirmBtnText}>დადასტურება</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 2,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  canvasWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    minHeight: 160,
  },
  baseline: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
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
    color: '#9CA3AF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  cancelTextBtn: {
    paddingHorizontal: 8,
    height: 52,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  clearBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmBtn: {
    flex: 1.5,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.75,
  },
});
