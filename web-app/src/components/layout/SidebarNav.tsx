import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MoreHorizontal, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { topNavItems, moreNavItems, type NavItemDef } from './navItems';

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

export function RailNavItem({
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

/* ── Shared nav list (rail + drawer) ────────────────── */

/**
 * The primary navigation list — top items + the collapsible "More" group.
 * Shared by the desktop rail (isExpanded = pinned/hovered) and the mobile
 * drawer (always isExpanded). Previously the drawer re-declared this markup.
 */
export function SidebarNavList({
  isExpanded,
  onNavigate,
}: {
  isExpanded: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
      <ul className="space-y-0.5">
        {topNavItems.map((item) => (
          <li key={item.to}>
            <RailNavItem item={item} isExpanded={isExpanded} showTooltip={false} onNavigate={onNavigate} />
          </li>
        ))}
        <li>
          <MoreGroup items={moreNavItems} isExpanded={isExpanded} onNavigate={onNavigate} />
        </li>
      </ul>
    </nav>
  );
}

/* ── Shared footer (account + sign out) ─────────────── */

export function SidebarFooter({
  isExpanded,
  onNavigate,
}: {
  isExpanded: boolean;
  onNavigate?: () => void;
}) {
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Divider */}
      <div className="mx-3 border-t border-neutral-200 dark:border-neutral-800" />

      <div className="py-2 space-y-0.5">
        {/* Account */}
        <NavLink
          to="/account"
          onClick={onNavigate}
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
            {isExpanded && (
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
            {isExpanded && (
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
    </>
  );
}
