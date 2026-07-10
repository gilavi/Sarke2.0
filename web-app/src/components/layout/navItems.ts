import {
  House,
  FolderOpen,
  CalendarBlank,
  BookOpen,
  Certificate,
  Clock,
  SquaresFour,
  Cube,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

/** A Phosphor icon component (supports `weight="regular"|"fill"` for the 3D rail tile). */
export type NavIcon = PhosphorIcon;

export interface NavItemDef {
  to: string;
  label: string;
  icon: NavIcon;
  shortcut?: string;
  /**
   * Per-section accent hue (hex, or a `var(--brand-*)` reference). Drives the
   * active-row gradient, the sliding accent bar, and the neon hover tile via
   * the `--tint` CSS var. Vivid by design so the hover/active glow reads.
   * Defaults to `var(--brand-500)` when omitted.
   */
  tint?: string;
}

export const topNavItems: NavItemDef[] = [
  { to: '/home',         label: 'მთავარი',       icon: House,        shortcut: 'G H', tint: 'var(--brand-500)' },
  { to: '/projects',     label: 'პროექტები',     icon: FolderOpen,   shortcut: 'G P', tint: '#3D7EE6' },
  { to: '/history',      label: 'ისტორია',       icon: Clock,        shortcut: 'G Y', tint: '#8A93A6' },
  { to: '/calendar',     label: 'კალენდარი',     icon: CalendarBlank, shortcut: 'G C', tint: '#6B6DF0' },
];

export const moreNavItems: NavItemDef[] = [
  { to: '/regulations',  label: 'რეგულაციები',   icon: BookOpen,     shortcut: 'G L', tint: '#1FB6A6' },
  { to: '/certificates', label: 'სერტიფიკატები', icon: Certificate,  shortcut: 'G F', tint: '#F0A52E' },
  { to: '/templates',    label: 'შაბლონები',     icon: SquaresFour,  shortcut: 'G T', tint: '#E866A0' },
  { to: '/safety',       label: '3D უსაფრთხოება', icon: Cube, tint: '#2FB6CC' },
];
