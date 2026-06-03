import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { routes } from '@/app/routes';
import { HubbleLogo } from './shared';

const NAV_LINKS = [
  { label: 'მთავარი', to: routes.landing },
  { label: 'ჩვენ შესახებ', to: routes.about },
  { label: 'ფასი', to: routes.pricing },
  { label: 'კანონმდებლობა', to: routes.legislation },
  { label: 'კონტაქტი', to: routes.contact },
];

// ─── Navbar ───────────────────────────────────────────────────────────────────
/**
 * Multi-page marketing navbar. Uses route <NavLink>s (not anchor-scroll) so it
 * works across the separate /, /about, /pricing, /legislation, /contact pages.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-sm font-medium transition-colors',
      isActive ? 'text-safety-600' : 'text-neutral-600 hover:text-safety-600',
    );

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/90 backdrop-blur-md border-b border-neutral-200/60' : 'bg-transparent',
    )}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to={routes.landing} className="flex items-center gap-2.5">
          <HubbleLogo className="h-8 w-auto text-graphite-900" />
          <span className="text-xl font-bold tracking-tight text-neutral-900">HUBBLE</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === routes.landing} className={navClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to={routes.login} className="hidden md:inline-block text-sm font-medium text-neutral-600 hover:text-safety-600 transition-colors">
            შესვლა
          </Link>
          <Link
            to={routes.register}
            className="hidden md:inline-flex items-center rounded-xl bg-safety-500 px-4 py-2 text-sm font-semibold text-white hover:bg-safety-600 transition-colors"
          >
            უფასოდ სცადე
          </Link>
          <button
            onClick={() => setOpen(v => !v)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600"
            aria-label="მენიუ"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden border-t border-neutral-200 bg-white px-5 py-4 flex flex-col gap-3"
          >
            {NAV_LINKS.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === routes.landing}
                onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  'text-left text-base font-medium py-1 transition-colors',
                  isActive ? 'text-safety-600' : 'text-neutral-700 hover:text-safety-600',
                )}
              >
                {l.label}
              </NavLink>
            ))}
            <Link to={routes.login} onClick={() => setOpen(false)} className="text-base font-medium text-neutral-600 py-1">შესვლა</Link>
            <Link
              to={routes.register}
              onClick={() => setOpen(false)}
              className="mt-1 w-full rounded-xl bg-safety-500 px-4 py-2.5 text-sm font-semibold text-white text-center"
            >
              უფასოდ სცადე
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 py-12 px-5">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <HubbleLogo className="h-7 w-auto text-graphite-900" />
              <span className="text-lg font-bold text-neutral-900">HUBBLE</span>
            </div>
            <p className="text-sm text-neutral-500">შრომის უსაფრთხოების ციფრული პლათფორმა</p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">პროდუქტი</span>
              <Link to={routes.landing} className="text-neutral-600 hover:text-safety-600 transition-colors">მთავარი</Link>
              <Link to={routes.pricing} className="text-neutral-600 hover:text-safety-600 transition-colors">ფასი</Link>
              <Link to={routes.legislation} className="text-neutral-600 hover:text-safety-600 transition-colors">კანონმდებლობა</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">კომპანია</span>
              <Link to={routes.about} className="text-neutral-600 hover:text-safety-600 transition-colors">ჩვენ შესახებ</Link>
              <Link to={routes.contact} className="text-neutral-600 hover:text-safety-600 transition-colors">კონტაქტი</Link>
              <Link to={routes.terms} className="text-neutral-600 hover:text-safety-600 transition-colors">პირობები</Link>
            </div>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-100 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-neutral-400">
          <span>© 2026 HUBBLE · გაკეთებულია საქართველოში 🇬🇪</span>
          <a href="mailto:hello@hubble.ge" className="hover:text-safety-600 transition-colors">hello@hubble.ge</a>
        </div>
      </div>
    </footer>
  );
}
