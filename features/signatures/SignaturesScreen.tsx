// features/signatures/SignaturesScreen.tsx
//
// The unified signatures screen: one creator signature (captured digitally,
// held only in component state) at the top, then any number of empty
// additional signing slots that render as labeled blank blocks in the PDF
// so a printed copy can be co-signed by hand.
//
// Presented as a full-screen Modal from the inspection result screen. The
// creator's name is passed in from the user profile.
//
// HEADER CHROME - SELF-CONTAINED. The Modal sets `statusBarTranslucent` and
// the body uses `useSafeAreaInsets()` directly so the top inset always
// resolves, regardless of where the parent tree mounts this component.
// Earlier versions used `<SafeAreaView edges={['top', 'bottom']}>` which
// silently reported 0 top inset when the modal's nearest safe-area provider
// had already been consumed by an outer screen - the `უკან` + X buttons
// would then render flush under the status bar and look missing on the
// equipment-type result screens. The SafeAreaProvider wrapper + manual
// padding kills that bug class.
//
// See features/signatures/AGENTS.md.

import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Share2, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button } from '../../components/primitives/Button';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { CreatorSignatureCard } from './CreatorSignatureCard';
import { AdditionalRowCard } from './AdditionalRowCard';
import { SignatureCanvasModal } from './SignatureCanvasModal';
import { makeSignaturesScreenStyles } from './SignaturesScreen.styles';
import type { SignaturesState } from './useSignaturesState';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Inspection creator's full name, pulled from the user profile by the
   *  parent and shown on the creator card. Not editable here. */
  creatorName: string;
  state: SignaturesState;
  /** Share/generate the document PDF straight from this screen. When
   *  provided, the header's top-right slot renders a "PDF" share pill
   *  instead of the X close button (the `უკან` pill still closes). The
   *  parent closes the modal and defers its share-PDF flow until the
   *  modal has actually dismissed (see `onDismiss`) — firing it in the
   *  same commit races the host's SubscriptionNotice / share sheet
   *  against the dismissal on iOS. */
  onSharePdf?: () => void;
  /** True while the host's share-PDF flow is running — dims/disables
   *  the header pill so a second concurrent share can't start. */
  sharing?: boolean;
  /** Forwarded to the Modal's `onDismiss` (fires after the dismissal
   *  animation completes; iOS-only in React Native). */
  onDismiss?: () => void;
}

export function SignaturesScreen({ visible, onClose, creatorName, state, onSharePdf, sharing, onDismiss }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <SafeAreaProvider>
        <SignaturesScreenBody
          onClose={onClose}
          creatorName={creatorName}
          state={state}
          onSharePdf={onSharePdf}
          sharing={sharing}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

function SignaturesScreenBody({
  onClose,
  creatorName,
  state,
  onSharePdf,
  sharing,
}: Omit<Props, 'visible' | 'onDismiss'>) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeSignaturesScreenStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [canvasOpen, setCanvasOpen] = useState(false);

  const {
    creatorSignature,
    additionalRows,
    setCreatorSignature,
    addRow,
    removeRow,
  } = state;

  const handleCapture = (pngBase64: string) => {
    setCreatorSignature(pngBase64);
    setCanvasOpen(false);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={({ pressed }) => [styles.headerPill, pressed && styles.pressed]}
          {...a11y(t('common.back'), undefined, 'button')}
        >
          <ChevronLeft size={18} color={theme.colors.accent} strokeWidth={1.5} />
          <Text style={styles.headerPillText}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('signature.screenTitle')}</Text>
        {onSharePdf ? (
          <Button
            title="PDF"
            size="sm"
            leftIcon={Share2}
            loading={sharing}
            onPress={onSharePdf}
            {...a11y(t('success.actions.sharePdf'), undefined, 'button')}
          />
        ) : (
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
            {...a11y(t('common.close'), undefined, 'button')}
          >
            <X size={22} color={theme.colors.ink} strokeWidth={1.5} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <CreatorSignatureCard
            creatorName={creatorName}
            signature={creatorSignature}
            onTap={() => setCanvasOpen(true)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('signature.additionalLinesLabel')}</Text>
          {additionalRows.length === 0 ? (
            <Text style={styles.emptyCaption}>
              {t('signature.additionalLinesEmpty')}
            </Text>
          ) : (
            <View style={styles.rowsStack}>
              {additionalRows.map((row, idx) => (
                <AdditionalRowCard
                  key={row.id}
                  index={idx + 1}
                  onRemove={() => removeRow(row.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={addRow}
          style={({ pressed }) => [styles.addRowBtn, pressed && styles.pressed]}
          {...a11y(t('signature.addLine'), t('signature.addLineA11y'), 'button')}
        >
          <Plus size={18} color={theme.colors.accent} strokeWidth={1.5} />
          <Text style={styles.addRowText}>{t('signature.addLine')}</Text>
        </Pressable>
      </View>

      <SignatureCanvasModal
        visible={canvasOpen}
        personName={creatorName}
        onCancel={() => setCanvasOpen(false)}
        onConfirm={handleCapture}
      />
    </View>
  );
}
