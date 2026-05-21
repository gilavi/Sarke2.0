import { NavLink, useLocation } from 'react-router-dom';
import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  User,
  LogOut,
  ShieldCheck,
  Clock,
  Box,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MoreHorizontal,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
type LucideIcon = ComponentType<LucideProps>;
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

/* ── Nav Item Definition ────────────────────────────── */

interface NavItemDef {
  to: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}

const topNavItems: NavItemDef[] = [
  { to: '/home',         label: 'მთავარი',       icon: Home,       shortcut: 'G H' },
  { to: '/projects',     label: 'პროექტები',     icon: FolderOpen, shortcut: 'G P' },
  { to: '/calendar',     label: 'კალენდარი',     icon: Calendar,   shortcut: 'G C' },
  { to: '/regulations',  label: 'რეგულაციები',   icon: BookOpen,   shortcut: 'G L' },
  { to: '/certificates', label: 'სერთიფიკატები', icon: Award,      shortcut: 'G F' },
  { to: '/history',      label: 'ისტორია',       icon: Clock,      shortcut: 'G Y' },
];

const moreNavItems: NavItemDef[] = [
  { to: '/inspections', label: 'შემოწმებები',   icon: ClipboardCheck, shortcut: 'G I' },
  { to: '/incidents',   label: 'ინციდენტები',   icon: AlertTriangle,  shortcut: 'G M' },
  { to: '/briefings',   label: 'ინსტრუქტაჟები', icon: Megaphone,      shortcut: 'G B' },
  { to: '/reports',     label: 'რეპორტები',     icon: FileText,       shortcut: 'G R' },
  { to: '/orders',      label: 'ბრძანებები',    icon: Package,        shortcut: 'G O' },
  { to: '/templates',   label: 'შაბლონები',     icon: LayoutTemplate, shortcut: 'G T' },
  { to: '/safety',      label: '3D უსაფრთხოება', icon: Box },
];



/* ── Tooltip Component ──────────────────────────────── */

/** Simple CSS-only tooltip positioned to the right of the rail */
function Tooltip({
  children,
  label,
  shortcut,
  visible,
}: {
  children: React.ReactNode;
  label: string;
  shortcut?: string;
  visible: boolean;
}) {
  return (
    <div className="group/tooltip relative flex items-center justify-center">
      {children}
      {/* Tooltip — only visible when rail is collapsed AND hovered */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: -4, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          >
            <div className="flex items-center gap-2">
              <span>{label}</span>
              {shortcut && (
                <kbd className="rounded border border-neutral-200 bg-neutral-100 px-1 py-0.5 text-[10px] text-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
                  {shortcut}
                </kbd>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Rail Nav Item ──────────────────────────────────── */

function RailNavItem({
  item,
  isExpanded,
  showTooltip,
  onNavigate,
}: {
  item: NavItemDef;
  isExpanded: boolean;
  showTooltip: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

  return (
    <Tooltip label={item.label} shortcut={item.shortcut} visible={showTooltip && !isActive}>
      <NavLink
        to={item.to}
        onClick={onNavigate}
        className={({ isActive: navActive }) =>
          cn(
            'relative flex items-center rounded-lg transition-colors duration-200',
            'mx-1.5 h-10 w-full px-3 gap-3',
            navActive
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
          )
        }
        aria-label={item.label}
      >
        {(() => { const ItemIcon = item.icon; return <ItemIcon size={20} className="shrink-0" strokeWidth={isActive ? 2.5 : 1.75} />; })()}

        {/* Label — only visible when expanded */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="whitespace-nowrap text-[13px] font-medium"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </NavLink>
    </Tooltip>
  );
}

/* ── More Group (collapsible) ───────────────────────── */

function MoreGroup({
  items,
  isExpanded,
  onNavigate,
}: {
  items: NavItemDef[];
  isExpanded: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const hasActive = items.some(
    (i) => location.pathname === i.to || location.pathname.startsWith(`${i.to}/`),
  );
  const [open, setOpen] = useState(true);

  return (
    <div>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex items-center rounded-lg transition-colors duration-200',
          'mx-1.5 h-10 w-full px-3 gap-3',
          hasActive && !open
            ? 'text-brand-500 dark:text-brand-400'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
        )}
      >
        <MoreHorizontal size={20} className="shrink-0" />
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-1 items-center gap-1 overflow-hidden"
            >
              <span className="whitespace-nowrap text-[13px] font-medium">მეტი</span>
              <ChevronDown
                size={14}
                className={cn('ml-auto transition-transform duration-200', open && 'rotate-180')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Sub-items */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden space-y-0.5"
          >
            {items.map((item) => (
              <li key={item.to} className={cn(isExpanded && 'pl-3')}>
                <RailNavItem
                  item={item}
                  isExpanded={isExpanded}
                  showTooltip={false}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Sidebar Component ─────────────────────────── */

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export const Sidebar = memo(function Sidebar({ open = false, onClose }: SidebarProps) {
  const [isPinned, setIsPinned] = useState(() => localStorage.getItem('sidebar-pinned') !== 'false');
  const [isHovered, setIsHovered] = useState(false);
  const { user, signOut } = useAuth();

  /* Visually expanded when pinned OR when hovering the collapsed rail */
  const isOpen = isPinned || isHovered;

  const togglePin = useCallback(() => {
    setIsPinned(v => {
      const next = !v;
      localStorage.setItem('sidebar-pinned', String(next));
      return next;
    });
  }, []);

  const handleNavigate = useCallback(() => {
    onClose?.();
  }, [onClose]);

  /* ── Rail Content ───────────────────────────────── */

  const rail = (
    <motion.aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ width: isOpen ? 220 : 56 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26, mass: 0.8 }}
      className={cn(
        'relative flex h-full shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white/95 backdrop-blur-md',
        'dark:border-neutral-800 dark:bg-neutral-900/90',
        'z-40',
      )}
    >
      {/* ── Logo + Pin Toggle ── */}
      <div className="flex items-center h-14 overflow-hidden border-b border-neutral-200 dark:border-neutral-800 px-3 gap-2">
        <NavLink to="/home" className="flex flex-1 min-w-0 items-center gap-2 overflow-hidden" aria-label="მთავარი">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
            <ShieldCheck size={16} />
          </div>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap"
              >
                Hubble
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>

        {/* Pin button — only visible when open */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              type="button"
              onClick={togglePin}
              className={cn(
                'ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                isPinned
                  ? 'text-brand-500 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30'
                  : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300',
              )}
              aria-label={isPinned ? 'საიდბარის დახურვა' : 'საიდბარის დამაგრება'}
            >
              {isPinned ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Primary Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        <ul className="space-y-0.5">
          {topNavItems.map((item) => (
            <li key={item.to}>
              <RailNavItem
                item={item}
                isExpanded={isOpen}
                showTooltip={false}
                onNavigate={handleNavigate}
              />
            </li>
          ))}
          <li>
            <MoreGroup
              items={moreNavItems}
              isExpanded={isOpen}
              onNavigate={handleNavigate}
            />
          </li>
        </ul>
      </nav>

      {/* ── Divider ── */}
      <div className="mx-3 border-t border-neutral-200 dark:border-neutral-800" />

      {/* ── Bottom Section: Account + Sign Out ── */}
      <div className="py-2 space-y-0.5">
        {/* Account */}
        <NavLink
          to="/account"
          onClick={handleNavigate}
          className={({ isActive }) =>
            cn(
              'relative flex items-center rounded-lg transition-colors duration-200 mx-1.5',
              'h-10 w-full px-3 gap-3',
              isActive
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
            )
          }
          aria-label="პროფილი"
        >
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
          ) : (
            <User size={20} className="shrink-0" />
          )}
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 overflow-hidden"
              >
                <div className="truncate text-[13px] font-medium">პროფილი</div>
              </motion.div>
            )}
          </AnimatePresence>
        </NavLink>

        {/* Sign Out */}
        <button
          type="button"
          onClick={() => void signOut()}
          className={cn(
            'relative flex items-center rounded-lg transition-colors duration-200 mx-1.5',
            'h-10 w-full px-3 gap-3',
            'text-neutral-500 hover:bg-red-50 hover:text-red-600',
            'dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-400',
          )}
          aria-label="გასვლა"
        >
          <LogOut size={20} className="shrink-0" />
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap text-[13px] font-medium"
              >
                გასვლა
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );

  return (
    <>
      {/* Desktop: icon rail — always visible */}
      <div className="hidden lg:flex lg:h-full lg:shrink-0">{rail}</div>

      {/* Mobile: drawer overlay (expanded version for usability) */}
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Mobile drawer — always expanded */}
          <div className="relative z-10 flex h-full">
            <motion.aside
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative flex h-full w-[220px] shrink-0 flex-col border-r border-neutral-200 bg-white/95 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/90"
            >
              {/* Logo */}
              <div className="flex h-14 items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800">
                <NavLink to="/home" className="flex items-center gap-2" onClick={onClose}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Hubble
                  </span>
                </NavLink>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-auto rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                  aria-label="დახურვა"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Nav — always expanded in mobile */}
              <nav className="flex-1 overflow-y-auto py-2">
                <ul className="space-y-0.5">
                  {topNavItems.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'mx-1.5 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all duration-200',
                            isActive
                              ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
                              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
                          )
                        }
                      >
                        {({ isActive }) => {
                          const ItemIcon = item.icon;
                          return (
                            <>
                              <ItemIcon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                              <span>{item.label}</span>
                            </>
                          );
                        }}
                      </NavLink>
                    </li>
                  ))}
                  <li>
                    <MoreGroup items={moreNavItems} isExpanded={true} onNavigate={onClose} />
                  </li>
                </ul>
              </nav>

              {/* Divider + Bottom */}
              <div className="mx-3 border-t border-neutral-200 dark:border-neutral-800" />
              <div className="py-2 space-y-0.5">
                <NavLink
                  to="/account"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'mx-1.5 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <User size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                      <span>პროფილი</span>
                    </>
                  )}
                </NavLink>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mx-1.5 flex h-10 w-[208px] items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                >
                  <LogOut size={20} />
                  <span>გასვლა</span>
                </button>
              </div>
            </motion.aside>
          </div>
        </div>
      )}
    </>
  );
});
