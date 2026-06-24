import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Pencil } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText } from './primitives/A11yText';
import { a11y } from '../lib/accessibility';

/**
 * Initials-avatar palette. Low-contrast on purpose: a soft secondary-yellow
 * tinted background with muted olive text, so the avatar reads as a quiet
 * placeholder rather than competing with the project name. (Brand secondary is
 * electric yellow; green is retired.) Locked here so list, header, picker, and
 * PDF stay in sync.
 */
export const PROJECT_AVATAR_BG = '#ECFA44';
export const PROJECT_AVATAR_FG = '#000000';
/**
 * A slightly darker shade of the avatar yellow, used as a soft hairline ring so
 * the bright fill separates from light surfaces (e.g. the project card) without
 * a harsh outline.
 */
export const PROJECT_AVATAR_BORDER = '#DCE93A';
/** Editable-overlay action badge: black circle + white +/pencil, white ring. */
const PROJECT_AVATAR_BADGE = '#000000';

/**
 * First two characters of the project name, uppercased with the Georgian
 * locale. `Array.from` splits by code point so emoji / surrogate pairs
 * aren't cut in half. Returns `'-'` for empty / missing names.
 */
export function projectInitials(name: string | null | undefined): string {
  if (!name) return '-';
  const trimmed = name.trim();
  if (!trimmed) return '-';
  return Array.from(trimmed).slice(0, 2).join('').toLocaleUpperCase('ka-GE');
}

/**
 * The single source of truth for how a project is visually represented in
 * the app: a logo thumbnail when one exists, otherwise an electric-yellow
 * initials block. Pass `editable` + `onEdit` to overlay a `+`/pencil badge that
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
  const { t } = useTranslation();
  // Default to a full circle. Callers can still pass an explicit `radius`
  // when a rounded-square shape is needed (e.g. legacy layouts).
  const r = radius ?? Math.round(size / 2);
  const fs = fontSize ?? Math.round(size * 0.52);
  const logo = project?.logo ?? null;
  const initials = projectInitials(project?.name);

  const inner = logo ? (
    <Image source={{ uri: logo }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: PROJECT_AVATAR_BG,
        borderWidth: 1.5,
        borderColor: PROJECT_AVATAR_BORDER,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <A11yText style={{ color: PROJECT_AVATAR_FG, fontWeight: '900', fontSize: 14, lineHeight: 14, textAlign: 'center', textShadowColor: PROJECT_AVATAR_FG, textShadowOffset: { width: 0.5, height: 0 }, textShadowRadius: 0.5 }}>
        {initials}
      </A11yText>
    </View>
  );

  if (!editable) return <View style={{ width: size, height: size }}>{inner}</View>;

  const badgeSize = Math.max(20, Math.round(size * 0.34));
  const iconSize = Math.round(badgeSize * 0.6);

  return (
    <Pressable
      onPress={onEdit}
      style={{ width: size, height: size }}
      {...a11y(
        logo ? t('projects.avatarChangeLogoA11y') : t('projects.avatarAddLogoA11y'),
        t('projects.avatarEditHint'),
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
        {logo
          ? <Pencil size={iconSize} color="#fff" strokeWidth={1.5} />
          : <Plus size={iconSize} color="#fff" strokeWidth={1.5} />
        }
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
