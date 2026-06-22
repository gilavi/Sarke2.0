/**
 * Type shim for 'lucide-react-native' in the web-app TypeScript context.
 *
 * Vite aliases lucide-react-native → lucide-react at runtime. This shim
 * provides a widened LucideIcon whose `style` prop accepts both CSS and
 * react-native transform arrays, so the shared ../components/primitives code
 * satisfies tsc without modifying the shared files.
 */
declare module 'lucide-react-native' {
  import type React from 'react';
  import type { LucideProps as LRProps } from 'lucide-react';

  // Omit `style` from lucide-react's props and replace with `any` so that
  // RN-format transform arrays (e.g. [{ rotate: '45deg' }]) are accepted.
  // react-native-web converts them to CSS strings at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export interface LucideProps extends Omit<LRProps, 'style'> {
    style?: any;
  }

  export type LucideIcon = React.ComponentType<LucideProps>;

  // Icons actually imported by the shared codebase:
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Building2: LucideIcon;
  export const Calendar: LucideIcon;
  export const CalendarDays: LucideIcon;
  export const Camera: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Circle: LucideIcon;
  export const CircleAlert: LucideIcon;
  export const CircleArrowUp: LucideIcon;
  export const CircleCheck: LucideIcon;
  export const CircleMinus: LucideIcon;
  export const CirclePlus: LucideIcon;
  export const CircleQuestionMark: LucideIcon;
  export const CircleX: LucideIcon;
  export const Clock: LucideIcon;
  export const CloudOff: LucideIcon;
  export const CloudUpload: LucideIcon;
  export const DoorOpen: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Eye: LucideIcon;
  export const File: LucideIcon;
  export const FileText: LucideIcon;
  export const Flame: LucideIcon;
  export const Folder: LucideIcon;
  export const FolderOpen: LucideIcon;
  export const Hand: LucideIcon;
  export const Home: LucideIcon;
  export const Image: LucideIcon;
  export const Info: LucideIcon;
  export const Lightbulb: LucideIcon;
  export const List: LucideIcon;
  export const Lock: LucideIcon;
  export const Map: LucideIcon;
  export const MapPin: LucideIcon;
  export const Megaphone: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const Move: LucideIcon;
  export const Paperclip: LucideIcon;
  export const Pencil: LucideIcon;
  export const Plus: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Share2: LucideIcon;
  export const Shield: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Square: LucideIcon;
  export const Trash2: LucideIcon;
  export const TriangleAlert: LucideIcon;
  export const Type: LucideIcon;
  export const Undo2: LucideIcon;
  export const Upload: LucideIcon;
  export const User: LucideIcon;
  export const UserPlus: LucideIcon;
  export const Wrench: LucideIcon;
  export const X: LucideIcon;
}
