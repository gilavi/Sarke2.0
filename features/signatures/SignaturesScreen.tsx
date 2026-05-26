// features/signatures/SignaturesScreen.tsx
//
// The unified signatures screen: one creator signature (captured digitally,
// held only in wizard state) at the top, then any number of empty
// additional signing slots that render as labeled blank blocks in the PDF
// so a printed copy can be co-signed by hand.
//
// Presented as a full-screen Modal from the wizard. The creator's name is
// passed in from the user profile. See features/signatures/AGENTS.md.

import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { CreatorSignatureCard } from './CreatorSignatureCard';
import { AdditionalRowCard } from './AdditionalRowCard';
import { SignatureCanvasModal } from './SignatureCanvasModal';
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
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.headerPill, pressed && styles.pressed]}
            {...a11y('უკან', undefined, 'button')}
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.accent} />
            <Text style={styles.headerPillText}>უკან</Text>
          </Pressable>
          <Text style={styles.headerTitle}>ხელმოწერები</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
            {...a11y('დახურვა', undefined, 'button')}
          >
            <Ionicons name="close" size={22} color={theme.colors.ink} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Creator section */}
          <View style={styles.section}>
            <CreatorSignatureCard
              creatorName={creatorName}
              signature={creatorSignature}
              onTap={() => setCanvasOpen(true)}
            />
          </View>

          {/* Additional-rows section */}
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

        {/* Bottom action */}
        <View style={styles.footer}>
          <Pressable
            onPress={addRow}
            style={({ pressed }) => [styles.addRowBtn, pressed && styles.pressed]}
            {...a11y('ხაზის დამატება', 'PDF-ში ცარიელი ხელმოწერის ხაზის დამატება', 'button')}
          >
            <Ionicons name="add" size={18} color={theme.colors.accent} />
            <Text style={styles.addRowText}>ხაზის დამატება</Text>
          </Pressable>
        </View>

        {/* Capture canvas */}
        <SignatureCanvasModal
          visible={canvasOpen}
          personName={creatorName}
          onCancel={() => setCanvasOpen(false)}
          onConfirm={handleCapture}
        />
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
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
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.subtleSurface,
    },
    pressed: { opacity: 0.7 },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
      gap: 24,
    },
    section: { gap: 12 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    emptyCaption: {
      fontSize: 13,
      color: theme.colors.inkFaint,
      fontStyle: 'italic',
    },
    rowsStack: { gap: 12 },
    footer: {
      padding: 16,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.surface,
    },
    addRowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.surface,
    },
    addRowText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.accent,
    },
  });
}
