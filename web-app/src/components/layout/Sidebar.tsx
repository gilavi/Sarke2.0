import { NavLink } from 'react-router-dom';
import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ShieldCheck, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarNavList } from './SidebarNav';
import { SidebarFooter } from './SidebarFooter';

/* ── Main Sidebar Component ─────────────────────────── */

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export const Sidebar = memo(function Sidebar({ open = false, onClose }: SidebarProps) {
  // Always land expanded ("long") on every page load, regardless of the last
  // session's pin state. The pin toggle still collapses it within the session.
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

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

  /* ── Desktop rail ───────────────────────────────── */

  const rail = (
    <motion.aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ width: isOpen ? 220 : 64 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26, mass: 0.8 }}
      className={cn(
        'relative flex h-full shrink-0 flex-col overflow-hidden border-r border-neutral-200/70 bg-white/75 backdrop-blur-xl',
        'dark:border-white/10 dark:bg-neutral-900/65',
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
              {isPinned ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Namespaced so the rail's active-bar layoutId can't collide with the
          mobile drawer's (both SidebarNavLists live in the DOM at once). */}
      <LayoutGroup id="rail-nav">
        <SidebarNavList isExpanded={isOpen} onNavigate={handleNavigate} />
      </LayoutGroup>
      <SidebarFooter isExpanded={isOpen} onNavigate={handleNavigate} />
    </motion.aside>
  );

  return (
    <>
      {/* Desktop: icon rail — always visible. Overlay model: the gutter
          reserves a resting footprint (220px pinned, ~138px collapsed — about
          half the expanded width), giving the page a safe left margin. The rail
          is absolutely positioned, so expanding it on hover floats over that
          margin instead of reflowing the layout or covering real content. */}
      <motion.div
        className="relative hidden lg:block lg:h-full lg:shrink-0"
        animate={{ width: isPinned ? 220 : 138 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, mass: 0.8 }}
      >
        <div className="absolute inset-y-0 left-0 z-40">{rail}</div>
      </motion.div>

      {/* Mobile: drawer overlay (always-expanded version for usability) */}
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

              <LayoutGroup id="drawer-nav">
                <SidebarNavList isExpanded onNavigate={onClose} />
              </LayoutGroup>
              <SidebarFooter isExpanded onNavigate={onClose} />
            </motion.aside>
          </div>
        </div>
      )}
    </>
  );
});
