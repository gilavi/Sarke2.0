import {
  Home,
  FolderOpen,
  ClipboardCheck,
  AlertTriangle,
  Megaphone,
  FileText,
  Package,
  Calendar,
  BookOpen,
  LayoutTemplate,
  Award,
  Clock,
  Box,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type LucideIcon = ComponentType<LucideProps>;

export interface NavItemDef {
  to: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}

export const topNavItems: NavItemDef[] = [
  { to: '/home',         label: 'მთავარი',       icon: Home,       shortcut: 'G H' },
  { to: '/projects',     label: 'პროექტები',     icon: FolderOpen, shortcut: 'G P' },
  { to: '/calendar',     label: 'კალენდარი',     icon: Calendar,   shortcut: 'G C' },
  { to: '/regulations',  label: 'რეგულაციები',   icon: BookOpen,   shortcut: 'G L' },
  { to: '/certificates', label: 'სერთიფიკატები', icon: Award,      shortcut: 'G F' },
  { to: '/history',      label: 'ისტორია',       icon: Clock,      shortcut: 'G Y' },
];

export const moreNavItems: NavItemDef[] = [
  { to: '/inspections', label: 'შემოწმებები',   icon: ClipboardCheck, shortcut: 'G I' },
  { to: '/incidents',   label: 'ინციდენტები',   icon: AlertTriangle,  shortcut: 'G M' },
  { to: '/briefings',   label: 'ინსტრუქტაჟები', icon: Megaphone,      shortcut: 'G B' },
  { to: '/reports',     label: 'რეპორტები',     icon: FileText,       shortcut: 'G R' },
  { to: '/orders',      label: 'ბრძანებები',    icon: Package,        shortcut: 'G O' },
  { to: '/templates',   label: 'შაბლონები',     icon: LayoutTemplate, shortcut: 'G T' },
  { to: '/safety',      label: '3D უსაფრთხოება', icon: Box },
];
