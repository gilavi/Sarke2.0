import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { User, UserRound, LogOut, Globe, Sun, Moon, CreditCard, Rocket, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { usePdfUsage } from '@/lib/usePdfUsage';
import { routes } from '@/app/routes';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

/* ── Avatar ─────────────────────────────────────────── */

/** Avatar image when available, else a neutral person glyph (no initials). */
function AccountAvatar({ url, size = 32 }: { url?: string | null; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{ height: size, width: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ height: size, width: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300"
    >
      <UserRound size={Math.round(size * 0.56)} strokeWidth={2} />
    </div>
  );
}

/* ── Shared footer (account block + menu) ───────────── */

/**
 * Single clickable account block (avatar · name · plan badge) that opens an
 * upward Mantine menu (profile / theme / language / upgrade-or-manage / sign out).
 * Collapsed rail renders avatar-only. Shared by the desktop rail and the mobile
 * drawer (both render via Sidebar.tsx).
 *
 * @param isExpanded  rail is pinned/hovered (or drawer) — show name + badge.
 * @param onNavigate  called after a navigating menu item (closes mobile drawer).
 */
export function SidebarFooter({
  isExpanded,
  onNavigate,
}: {
  isExpanded: boolean;
  onNavigate?: () => void;
}) {
  const { user, profile, signOut } = useAuth();
  const { isDark, toggleMode } = useTheme();
  const { data: usage } = usePdfUsage();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const isPro = usage?.status === 'active';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
  const displayName = fullName || profile?.email || 'მომხმარებელი';
  const email = profile?.email ?? '';

  const go = (to: string) => {
    navigate(to);
    onNavigate?.();
  };

  return (
    <>
      {/* Divider */}
      <div className="mx-3 border-t border-neutral-200 dark:border-neutral-800" />

      <div className="py-2 space-y-2">
        {/* Go Pro — full card when expanded, a mini gradient launcher when icon-only */}
        {!isPro && (isExpanded ? (
          <>
            <button
              type="button"
              onClick={() => go(routes.subscribe.index)}
              aria-label="Hubble Pro"
              className="mx-2 block w-[calc(100%-1rem)] rounded-2xl p-3.5 text-left text-white transition-transform hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #1FA968 0%, #0C5236 100%)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/20">
                  <Rocket className="h-4 w-4 text-white" />
                </span>
                <span className="text-sm font-bold">Hubble Pro</span>
              </span>
              <span className="mt-2 block text-[11px] leading-snug text-white/85">
                ულიმიტო PDF და ფუნქციები
              </span>
              <span className="mt-2.5 block rounded-full bg-white py-1.5 text-center text-[11.5px] font-bold text-[#0C5236]">
                განახლება →
              </span>
            </button>
            <div className="mx-3 border-t border-neutral-200 dark:border-neutral-800" />
          </>
        ) : (
          <button
            type="button"
            onClick={() => go(routes.subscribe.index)}
            aria-label="Hubble Pro"
            title="Hubble Pro"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-white transition-transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #1FA968 0%, #0C5236 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <Rocket className="h-5 w-5" />
          </button>
        ))}

        <DropdownMenu position="top-start" offset={8} width={236} withinPortal>
          <DropdownMenuTrigger>
            <button
              type="button"
              aria-label={t('nav.account')}
              className={cn(
                'mx-2 flex h-12 items-center rounded-lg px-2 transition-colors duration-200',
                'w-[calc(100%-1rem)]',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                isExpanded ? 'gap-2.5' : 'justify-center',
              )}
            >
              <AccountAvatar url={avatarUrl} />
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
                      {displayName}
                    </span>
                    {isPro ? (
                      <span className="shrink-0 rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-900/50 dark:text-brand-300 dark:ring-brand-700/50">
                        {t('account.planPro')}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-md bg-[#EFF4F1] px-1.5 py-0.5 text-[10px] font-medium text-[#147A4F] dark:bg-brand-900/40 dark:text-brand-300">
                        {t('account.planFree')}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            {/* Header — non-interactive */}
            <DropdownMenuLabel>
              <div className="flex items-center gap-2.5 py-0.5">
                <AccountAvatar url={avatarUrl} size={36} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold normal-case text-neutral-800 dark:text-neutral-100">
                    {displayName}
                  </div>
                  {email && (
                    <div className="truncate text-[11px] font-normal normal-case text-neutral-400 dark:text-neutral-500">
                      {email}
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem leftSection={<User size={16} />} onClick={() => go(routes.account)}>
              {t('account.profile')}
            </DropdownMenuItem>

            <DropdownMenuItem
              closeMenuOnClick={false}
              leftSection={isDark ? <Moon size={16} /> : <Sun size={16} />}
              onClick={() => toggleMode()}
            >
              {t('account.theme')}
            </DropdownMenuItem>

            <DropdownMenuItem
              closeMenuOnClick={false}
              leftSection={<Globe size={16} />}
              rightSection={
                <span className="text-[10px] font-semibold uppercase text-neutral-400">
                  {i18n.language === 'ka' ? 'ქარ' : 'ENG'}
                </span>
              }
              onClick={() => void i18n.changeLanguage(i18n.language === 'ka' ? 'en' : 'ka')}
            >
              {t('account.language')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {isPro && (
              <DropdownMenuItem leftSection={<CreditCard size={16} />} onClick={() => go(routes.account)}>
                {t('account.manage')}
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              leftSection={<Download size={16} />}
              onClick={() => window.open('https://apps.apple.com/app/hubble', '_blank', 'noopener,noreferrer')}
            >
              {t('account.downloadApp')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem color="red" leftSection={<LogOut size={16} />} onClick={() => void signOut()}>
              {t('account.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
