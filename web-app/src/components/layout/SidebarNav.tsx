import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { topNavItems, moreNavItems, type NavItemDef } from './navItems';
import { NavGem } from './NavGem';

/* Shared item chrome. Single permanent state — always full + labeled. The
   active row is a soft brand-tinted pill driven by theme tokens. */
const itemBase =
  'rail-link relative mx-2 flex h-10 w-[calc(100%-1rem)] items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-colors duration-200';
const itemActive = 'bg-[var(--nav-active-bg)] font-semibold text-[var(--nav-active-text)]';
const itemInactive =
  'text-[var(--text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]';

/* ── Rail Nav Item ──────────────────────────────────── */

export function RailNavItem({
  item,
  onNavigate,
}: {
  item: NavItemDef;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) => cn(itemBase, isActive ? itemActive : itemInactive)}
      aria-label={item.label}
    >
      {({ isActive }) => (
        <>
          <NavGem icon={item.icon} active={isActive} />
          <span className="whitespace-nowrap">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/* ── More Group (collapsible) ───────────────────────── */

function MoreGroup({
  items,
  onNavigate,
}: {
  items: NavItemDef[];
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const hasActive = items.some(
    (i) => location.pathname === i.to || location.pathname.startsWith(`${i.to}/`),
  );
  const [open, setOpen] = useState(true);
  const showActive = hasActive && !open;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(itemBase, showActive ? itemActive : itemInactive)}
      >
        <span className="nav-gem" data-active={showActive ? '' : undefined}>
          <MoreHorizontal size={20} className="nav-gem__icon" />
        </span>
        <span className="flex flex-1 items-center gap-1 overflow-hidden">
          <span className="whitespace-nowrap">მეტი</span>
          <ChevronDown
            size={14}
            className={cn('ml-auto transition-transform duration-200', open && 'rotate-180')}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-0.5 overflow-hidden"
          >
            {items.map((item) => (
              <li key={item.to} className="pl-3">
                <RailNavItem item={item} onNavigate={onNavigate} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Shared nav list (sidebar + drawer) ─────────────── */

export function SidebarNavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
      <ul className="space-y-0.5">
        {topNavItems.map((item) => (
          <li key={item.to}>
            <RailNavItem item={item} onNavigate={onNavigate} />
          </li>
        ))}
        <li>
          <MoreGroup items={moreNavItems} onNavigate={onNavigate} />
        </li>
      </ul>
    </nav>
  );
}
