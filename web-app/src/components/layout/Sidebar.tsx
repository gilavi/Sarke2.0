import { NavLink } from 'react-router-dom';
import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { SidebarNavList } from './SidebarNav';
import { SidebarFooter } from './SidebarFooter';
import { IconButton } from '@/components/ui/icon-button';
import { HubbleLogo } from '@/components/HubbleLogo';

/* ── Main Sidebar Component ─────────────────────────────
   Single permanent state - always full + labeled (no icon-only collapse). The
   sidebar sits directly on the app canvas (no panel background of its own). */

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

/** Logo + nav + footer - shared by the desktop sidebar and the mobile drawer. */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 items-center px-4">
        <NavLink to="/home" onClick={onNavigate} aria-label="მთავარი" className="flex items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[#1A1A1A]">
            <HubbleLogo className="h-[18px] w-[18px] text-[var(--brand-500)]" />
          </span>
          <span className="font-display text-lg font-bold text-[var(--text-primary)]">Hubble</span>
        </NavLink>
      </div>
      <SidebarNavList onNavigate={onNavigate} />
      <SidebarFooter onNavigate={onNavigate} />
    </>
  );
}

export const Sidebar = memo(function Sidebar({ open = false, onClose }: SidebarProps) {
  const handleNavigate = useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <>
      {/* Desktop: fixed sidebar, always expanded, directly on the canvas */}
      <aside className="hidden lg:flex lg:h-full lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--border-default)]">
        <SidebarBody onNavigate={handleNavigate} />
      </aside>

      {/* Mobile: slide-over drawer */}
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.aside
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            exit={{ x: -288 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative z-10 flex h-full w-72 shrink-0 flex-col bg-[var(--bg-body)]"
          >
            <IconButton
              icon={X}
              label="დახურვა"
              variant="plain"
              size="sm"
              onClick={onClose}
              className="absolute right-3 top-4 z-10"
            />
            <SidebarBody onNavigate={onClose} />
          </motion.aside>
        </div>
      )}
    </>
  );
});
