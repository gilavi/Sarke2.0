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
import { ChevronLeft, Plus, X } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
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
}

export function SignaturesScreen({ visible, onClose, creatorName, state }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <SignaturesScreenBody
          onClose={onClose}
          creatorName={creatorName}
          state={state}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

function SignaturesScreenBody({
  onClose,
  creatorName,
  state,
}: Omit<Props, 'visible'>) {
  const { theme } = useTheme();
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
          {...a11y('უკან', undefined, 'button')}
        >
          <ChevronLeft size={18} color={theme.colors.accent} strokeWidth={1.5} />
          <Text style={styles.headerPillText}>უკან</Text>
        </Pressable>
        <Text style={styles.headerTitle}>ხელმოწერები</Text>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          {...a11y('დახურვა', undefined, 'button')}
        >
          <X size={22} color={theme.colors.ink} strokeWidth={1.5} />
        </Pressable>
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
          <Text style={styles.sectionLabel}>დამატებითი ხაზები PDF-ისთვის</Text>
          {additionalRows.length === 0 ? (
            <Text style={styles.emptyCaption}>
              დაამატეთ ხაზი თუ აქტს რამდენიმე ხელმოწერა სჭირდება
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
          {...a11y('ხაზის დამატება', 'PDF-ში ცარიელი ხელმოწერის ხაზის დამატება', 'button')}
        >
          <Plus size={18} color={theme.colors.accent} strokeWidth={1.5} />
          <Text style={styles.addRowText}>ხაზის დამატება</Text>
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
