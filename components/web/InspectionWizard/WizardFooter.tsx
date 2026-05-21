import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { WIZARD_COLORS as C, webStyle } from './types';

interface WizardFooterProps {
  /** Whether a "back" affordance should show (hidden on the first step). */
  showBack: boolean;
  /** Whether the active item is the last one. */
  isLast: boolean;
  /** Saving spinner state for the primary button. */
  saving: boolean;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
}

/**
 * Fixed 72px bottom bar. The top border spans the full viewport because the
 * footer is the bottom row of the modal column. On narrow web (<768px) the
 * buttons stack full-width. Web only.
 */
export function WizardFooter({
  showBack,
  isLast,
  saving,
  onBack,
  onNext,
  onComplete,
}: WizardFooterProps) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return null;

  const narrow = width < 768;
  const primaryLabel = saving
    ? 'შენახვა...'
    : isLast
      ? 'დასრულება ✓'
      : 'შენახვა და შემდეგი →';

  return (
    <View style={[styles.footer, narrow && styles.footerNarrow]}>
      {showBack ? (
        <BackButton onPress={onBack} narrow={narrow} />
      ) : (
        !narrow && <View style={styles.spacer} />
      )}

      <PrimaryButton
        label={primaryLabel}
        saving={saving}
        narrow={narrow}
        onPress={isLast ? onComplete : onNext}
      />
    </View>
  );
}

function BackButton({ onPress, narrow }: { onPress: () => void; narrow: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      style={[styles.backButton, narrow && styles.fullWidth, hovered && styles.backHover]}
    >
      <Text style={styles.backText}>← უკან</Text>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  saving,
  narrow,
  onPress,
}: {
  label: string;
  saving: boolean;
  narrow: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={saving}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      style={[
        styles.primaryButton,
        narrow && styles.fullWidth,
        hovered && !saving && styles.primaryHover,
      ]}
    >
      {saving && <ActivityIndicator size="small" color="#FFFFFF" />}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 24,
  },
  footerNarrow: {
    flexDirection: 'column',
    height: 'auto',
    paddingVertical: 12,
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
  backButton: webStyle({
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  }),
  backHover: {
    backgroundColor: C.segmentHover,
  },
  backText: {
    fontSize: 14,
    color: C.textGray,
  },
  primaryButton: webStyle({
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: C.green,
    cursor: 'pointer',
    transitionProperty: 'opacity',
    transitionDuration: '120ms',
  }),
  primaryHover: {
    opacity: 0.9,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fullWidth: {
    width: '100%',
  },
});
