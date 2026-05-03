import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { A11yText } from './primitives/A11yText';
import { a11y } from '../lib/accessibility';

/**
 * Initials-avatar palette. Low-contrast on purpose: a soft green-tinted
 * background with muted brand-green text, so the avatar reads as a quiet
 * placeholder rather than competing with the project name. Locked here so
 * list, header, picker, and PDF stay in sync.
 */
export const PROJECT_AVATAR_BG = '#E8F5F0';
export const PROJECT_AVATAR_FG = '#1D9E75';
/** Saturated brand green — used only for the editable-overlay badge. */
const PROJECT_AVATAR_BADGE = '#1D9E75';

/**
 * First two characters of the project name, uppercased with the Georgian
 * locale. `Array.from` splits by code point so emoji / surrogate pairs
 * aren't cut in half. Returns `'—'` for empty / missing names.
 */
export function projectInitials(name: string | null | undefined): string {
  if (!name) return '—';
  const trimmed = name.trim();
  if (!trimmed) return '—';
  return Array.from(trimmed).slice(0, 2).join('').toLocaleUpperCase('ka-GE');
}

/**
 * The single source of truth for how a project is visually represented in
 * the app: a logo thumbnail when one exists, otherwise a green initials
 * block. Pass `editable` + `onEdit` to overlay a `+`/pencil badge that
 * opens an image picker.
 */
export const ProjectAvatar = memo(function ProjectAvatar({
  project,
  size = 44,
  radius,
  fontSize,
  editable = false,
  onEdit,
}: {
  project: { name: string; logo?: string | null } | null | undefined;
  size?: number;
  radius?: number;
  fontSize?: number;
  editable?: boolean;
  onEdit?: () => void;
}) {
  // Default to a full circle. Callers can still pass an explicit `radius`
  // when a rounded-square shape is needed (e.g. legacy layouts).
  const r = radius ?? Math.round(size / 2);
  const fs = fontSize ?? Math.round(size * 0.4);
  const logo = project?.logo ?? null;
  const initials = projectInitials(project?.name);

  const inner = logo ? (
    <Image source={{ uri: logo }} style={{ width: size, height: size, borderRadius: r }} />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: PROJECT_AVATAR_BG,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <A11yText style={{ color: PROJECT_AVATAR_FG, fontWeight: '600', fontSize: fs }}>
        {initials}
      </A11yText>
    </View>
  );

  if (!editable) return <View style={{ width: size, height: size }}>{inner}</View>;

  const badgeSize = Math.max(20, Math.round(size * 0.34));
  const iconName = logo ? 'pencil' : 'add';

  return (
    <Pressable
      onPress={onEdit}
      style={{ width: size, height: size }}
      {...a11y(
        logo ? 'ლოგოს შეცვლა' : 'ლოგოს დამატება',
        'შეეხეთ პროექტის ლოგოს ასარჩევად',
        'button',
      )}
    >
      {inner}
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
          },
        ]}
      >
        <Ionicons name={iconName as any} size={Math.round(badgeSize * 0.6)} color="#fff" />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: PROJECT_AVATAR_BADGE,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
