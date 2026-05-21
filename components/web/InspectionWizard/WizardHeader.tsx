import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WIZARD_COLORS as C, webStyle } from './types';

interface WizardHeaderProps {
  projectName: string;
  projectLogo?: string;
  actName: string;
  /** 1-based index of the current item. */
  current: number;
  /** Total number of items. */
  total: number;
  onClose: () => void;
}

/**
 * Fixed 64px top bar: project identity on the left, a thin progress bar in the
 * centre, and a circular close button on the right. Web only. The bottom border
 * spans the full viewport because the header is the top row of the modal column.
 */
export function WizardHeader({
  projectName,
  projectLogo,
  actName,
  current,
  total,
  onClose,
}: WizardHeaderProps) {
  if (Platform.OS !== 'web') return null;

  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {projectLogo ? (
          <Image source={{ uri: projectLogo }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoFallbackText}>
              {projectName.trim().slice(0, 1).toUpperCase() || '—'}
            </Text>
          </View>
        )}
        <Text style={styles.projectName} numberOfLines={1}>
          {projectName}
        </Text>
        <Text style={styles.separator}>›</Text>
        <Text style={styles.actName} numberOfLines={1}>
          {actName}
        </Text>
      </View>

      <View style={styles.center}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {current} / {total}
        </Text>
      </View>

      <View style={styles.right}>
        <CloseButton onPress={onClose} />
      </View>
    </View>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel="დახურვა"
      style={[styles.closeButton, hovered && styles.closeButtonHover]}
    >
      <Text style={styles.closeIcon}>✕</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoFallback: {
    backgroundColor: C.greenSoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    color: C.green,
    fontSize: 14,
    fontWeight: '600',
  },
  projectName: {
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
  },
  separator: {
    fontSize: 14,
    color: C.textGray,
  },
  actName: {
    fontSize: 14,
    color: C.textGray,
    flexShrink: 1,
  },
  center: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
  },
  progressTrack: {
    width: 320,
    maxWidth: 320,
    height: 3,
    borderRadius: 999,
    backgroundColor: C.border,
    overflow: 'hidden',
  },
  progressFill: webStyle({
    height: 3,
    borderRadius: 999,
    backgroundColor: C.green,
    transitionProperty: 'width',
    transitionDuration: '200ms',
  }),
  progressLabel: {
    fontSize: 11,
    color: C.textGray,
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
  },
  closeButton: webStyle({
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  }),
  closeButtonHover: {
    backgroundColor: C.segmentHover,
  },
  closeIcon: {
    fontSize: 16,
    color: C.textGray,
  },
});
