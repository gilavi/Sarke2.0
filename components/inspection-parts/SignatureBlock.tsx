import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { Button } from '../ui';
import { SignatureCanvas } from '../SignatureCanvas';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

export interface SignatoryData {
  role: string;
  name: string;
  position: string;
  organization?: string;
  /** Arbitrary extra string fields rendered after position/organization */
  extra?: Record<string, string>;
  signature: string | null;
  date?: string | null;
}

export interface SignatureBlockProps {
  signatories: SignatoryData[];
  onChange: (index: number, field: string, value: string) => void;
  onSign: (index: number, base64Png: string) => void;
  onAddSignatory?: () => void;
  onRemoveSignatory?: (index: number) => void;
  /** Additional labeled text fields rendered in every signatory card after the standard fields.
   *  onChange is called with field = `extra.<key>` so the parent can handle it. */
  extraFields?: { key: string; label: string }[];
}

export function SignatureBlock({
  signatories,
  onChange,
  onSign,
  onAddSignatory,
  onRemoveSignatory,
  extraFields,
}: SignatureBlockProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  // Which signatory's canvas is open
  const [signingIndex, setSigningIndex] = useState<number | null>(null);

  const currentSignatory = signingIndex !== null ? signatories[signingIndex] : null;

  const handleConfirm = (base64Png: string) => {
    if (signingIndex === null) return;
    onSign(signingIndex, base64Png);
    setSigningIndex(null);
  };

  return (
    <View style={styles.container}>
      {/* Signatory cards */}
      {signatories.map((sig, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.roleLabel}>{sig.role}</Text>
            {onRemoveSignatory && signatories.length > 1 && (
              <Pressable
                onPress={() => onRemoveSignatory(idx)}
                hitSlop={8}
                {...a11y('წაშლა', 'ხელმომწერის წაშლა', 'button')}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.semantic.danger} />
              </Pressable>
            )}
          </View>

          <FloatingLabelInput
            label="სახელი, გვარი"
            value={sig.name}
            onChangeText={v => onChange(idx, 'name', v)}
          />
          <FloatingLabelInput
            label="თანამდებობა"
            value={sig.position}
            onChangeText={v => onChange(idx, 'position', v)}
          />
          {sig.organization !== undefined && (
            <FloatingLabelInput
              label="ორგანიზაცია"
              value={sig.organization}
              onChangeText={v => onChange(idx, 'organization', v)}
            />
          )}
          {extraFields?.map(ef => (
            <FloatingLabelInput
              key={ef.key}
              label={ef.label}
              value={sig.extra?.[ef.key] ?? ''}
              onChangeText={v => onChange(idx, `extra.${ef.key}`, v)}
            />
          ))}

          {/* Signature area */}
          {sig.signature ? (
            <View style={styles.signedCard}>
              <View style={styles.signedHeader}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.semantic.success} />
                <Text style={styles.signedLabel}>ხელმოწერილია</Text>
                <Pressable
                  onPress={() => onChange(idx, 'signature', '')}
                  hitSlop={8}
                  {...a11y('ხელახლა', 'ხელმოწერის გასუფთავება', 'button')}
                >
                  <Text style={styles.clearText}>ხელახლა</Text>
                </Pressable>
              </View>
              <View style={styles.signedImgBox}>
                <Image
                  source={{ uri: `data:image/png;base64,${sig.signature}` }}
                  style={styles.signedImg}
                  contentFit="contain"
                />
              </View>
            </View>
          ) : (
            <Button
              title={`ხელმოწერა — ${sig.role}`}
              variant="secondary"
              onPress={() => setSigningIndex(idx)}
              {...a11y(`ხელმოწერა: ${sig.role}`, undefined, 'button')}
            />
          )}
        </View>
      ))}

      {onAddSignatory && (
        <Button
          title="+ ხელმომწერის დამატება"
          variant="ghost"
          onPress={onAddSignatory}
          {...a11y('ხელმომწერის დამატება', undefined, 'button')}
        />
      )}

      {/* Signature canvas modal */}
      <SignatureCanvas
        visible={signingIndex !== null}
        personName={currentSignatory?.name ?? ''}
        onCancel={() => setSigningIndex(null)}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    container: { gap: 16 },
    // Signatory card
    card: {
      gap: 10,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    roleLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    // Signed state
    signedCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.semantic.success,
      overflow: 'hidden',
      backgroundColor: theme.colors.semantic.successSoft,
    },
    signedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.semantic.success,
    },
    signedLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.semantic.success,
    },
    clearText: { fontSize: 12, color: theme.colors.inkSoft },
    signedImgBox: { height: 100, alignItems: 'center', justifyContent: 'center', padding: 8 },
    signedImg: { width: '100%', height: '100%' },
  });
}
