import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import { useTheme } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { a11y } from '../lib/accessibility';

interface Props {
  visible: boolean;
  personName: string;
  onCancel: () => void;
  /** Called with a base64-encoded PNG (no data: prefix). */
  onConfirm: (base64Png: string) => void;
}

/**
 * Full-screen signature capture modal.
 * Uses statusBarTranslucent + SafeAreaProvider so safe-area insets always
 * resolve correctly even when nested inside another modal (e.g. SignaturesScreen).
 * Header pill style matches SignaturesScreen for consistency.
 */
export function SignatureCanvas({ visible, personName, onCancel, onConfirm }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <SafeAreaProvider>
        <SignatureCanvasBody
          visible={visible}
          personName={personName}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

function SignatureCanvasBody({ visible, personName, onCancel, onConfirm }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const ref = useRef<SignatureViewRef>(null);
  const [hasStroke, setHasStroke] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (visible) {
      setHasStroke(false);
      setAttempted(false);
      const id = setTimeout(() => ref.current?.clearSignature(), 120);
      return () => clearTimeout(id);
    }
  }, [visible]);

  const handleConfirm = useCallback(() => {
    if (!hasStroke) {
      setAttempted(true);
      haptic.validationError();
      return;
    }
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

  const webStyle = `
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #fff; overflow: hidden; }
    .m-signature-pad { position: fixed; top: 0; left: 0; right: 0; bottom: 0; box-shadow: none; border: none; background: #fff; margin: 0; }
    .m-signature-pad--body { border: none; height: 100%; }
    .m-signature-pad--body canvas { width: 100% !important; height: 100% !important; background: #fff; }
    .m-signature-pad--footer { display: none; }
  `;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onCancel}
          hitSlop={12}
          style={({ pressed }) => [styles.headerPill, pressed && styles.pressed]}
          {...a11y(t('common.back'), undefined, 'button')}
        >
          <ChevronLeft size={18} color={theme.colors.accent} strokeWidth={1.5} />
          <Text style={styles.headerPillText}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {personName || t('common.signer')}
        </Text>
        {hasStroke ? (
          <Pressable
            onPress={handleClear}
            hitSlop={12}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
            {...a11y(t('a11y.clearSignature'), t('a11y.clearSignatureHint'), 'button')}
          >
            <RefreshCw size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <View style={styles.canvasWrap}>
        <SignatureScreen
          ref={ref}
          onOK={handleOK}
          onBegin={() => { setHasStroke(true); setAttempted(false); }}
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
        <View pointerEvents="none" style={styles.baseline} />
        {!hasStroke && (
          <View pointerEvents="none" style={styles.hintWrap}>
            <Text style={styles.hintText}>{t('components.signatureCanvasSignHereHint')}</Text>
          </View>
        )}
      </View>

      {attempted && !hasStroke ? (
        <Text style={styles.errorText}>{t('components.signatureCanvasDrawPrompt')}</Text>
      ) : null}
      <View style={styles.footer}>
        <Button
          title={t('common.cancel')}
          variant="secondary"
          size="lg"
          onPress={onCancel}
          style={{ flex: 1 }}
          {...a11y(t('common.cancel'), undefined, 'button')}
        />
        <Button
          title={t('common.save')}
          size="lg"
          onPress={handleConfirm}
          style={{ flex: 1.6 }}
          {...a11y(t('a11y.saveSignature'), t('a11y.saveSignatureHint'), 'button')}
        />
      </View>
    </View>
  );
}

function getStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    headerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    headerPillText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    headerBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: theme.colors.subtleSurface,
    },
    pressed: { opacity: 0.7 },
    canvasWrap: {
      flex: 1,
      marginHorizontal: 12,
      marginTop: 12,
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
    hintText: { fontSize: 12, color: theme.colors.inkFaint },
    footer: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      paddingTop: 14,
    },
    errorText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.danger,
      textAlign: 'center',
      marginBottom: -4,
    },
  });
}
