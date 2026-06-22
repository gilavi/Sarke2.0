import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, UserRound, LogOut, Globe, Sun, Moon, CreditCard, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { usePdfUsage } from '@/lib/usePdfUsage';
import { routes } from '@/app/routes';
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
function AccountAvatar({ url, size = 30 }: { url?: string | null; size?: number }) {
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
      className="flex shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[var(--text-muted)] dark:bg-white/[0.08]"
    >
      <UserRound size={Math.round(size * 0.56)} strokeWidth={2} />
    </div>
  );
}

/* ── Shared footer (Go Pro card + account block + menu) ─
   Single permanent state - always full + labeled (no icon-only variant). */
export function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
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
    <div className="space-y-2.5 px-2 pb-3 pt-1">
      <DropdownMenu position="top-start" offset={8} width={236} withinPortal>
        <DropdownMenuTrigger>
          <button
            type="button"
            aria-label={t('nav.account')}
            className="flex h-12 w-full items-center gap-2.5 rounded-xl px-2 transition-colors duration-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
          >
            <AccountAvatar url={avatarUrl} />
            <span className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-[var(--text-primary)]">
              {displayName}
            </span>
            {isPro ? (
              <span className="shrink-0 rounded-md bg-[var(--nav-active-bg)] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--nav-active-text)]">
                {t('account.planPro')}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-[var(--nav-active-bg)] px-2 py-0.5 text-[9.5px] font-medium text-[var(--nav-active-text)]">
                {t('account.planFree')}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          {/* Header - non-interactive */}
          <DropdownMenuLabel>
            <div className="flex items-center gap-2.5 py-0.5">
              <AccountAvatar url={avatarUrl} size={36} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold normal-case text-[var(--text-primary)]">
                  {displayName}
                </div>
                {email && (
                  <div className="truncate text-[11px] font-normal normal-case text-[var(--text-muted)]">
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
              <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
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
  );
}
