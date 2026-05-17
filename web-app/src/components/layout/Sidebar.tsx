import { NavLink, Link } from 'react-router-dom';
import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  Folder,
  Calendar,
  BookOpen,
  LogOut,
  ShieldCheck,
  User,
  Clock,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { listProjects } from '@/lib/data/projects';
import { ProjectAvatar } from '@/components/ProjectAvatar';

const coreItems = [
  { to: '/home',        label: 'მთავარი',    icon: Home     },
  { to: '/history',     label: 'ისტორია',    icon: Clock    },
  { to: '/calendar',    label: 'კალენდარი',  icon: Calendar },
  { to: '/regulations', label: 'რეგულაციები', icon: BookOpen },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export const Sidebar = memo(function Sidebar({ open = true, onClose }: SidebarProps) {
  const { profile, user, signOut } = useAuth();
  const displayName = useMemo(
    () => [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || user?.email || 'მომხმარებელი',
    [profile?.first_name, profile?.last_name, user?.email],
  );

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });

  const inner = (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5">
        <Link to="/home" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
            <ShieldCheck size={20} />
          </div>
          <span className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">Sarke</span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 lg:hidden"
            aria-label="მენიუს დახურვა"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {/* Core nav items */}
        <ul className="space-y-0.5">
          {coreItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400' : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Projects section with inline list */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between px-3">
            <NavLink
              to="/projects"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  isActive ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300',
                )
              }
            >
              <Folder size={13} />
              პროექტები
            </NavLink>
            <Link
              to="/projects/new"
              onClick={onClose}
              className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              aria-label="ახალი პროექტი"
            >
              <span className="text-[16px] leading-none">+</span>
            </Link>
          </div>

          {/* Project list */}
          {projects && projects.length > 0 ? (
            <ul className="space-y-0.5">
              {projects.map((p) => (
                <li key={p.id}>
                  <NavLink
                    to={`/projects/${p.id}`}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-lg py-1.5 pl-4 pr-2 text-sm transition-colors',
                        isActive
                          ? 'bg-brand-50 font-medium text-brand-700'
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                      )
                    }
                  >
                    <ProjectAvatar project={p} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      {p.company_name || p.name}
                    </span>
                    <ChevronRight size={12} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
                  </NavLink>
                </li>
              ))}
            </ul>
          ) : projects && projects.length === 0 ? (
            <p className="px-4 py-1 text-[12px] text-neutral-400 dark:text-neutral-500">პროექტები არ არის</p>
          ) : null}
        </div>
      </nav>

      {/* Footer — Account */}
      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <NavLink
          to="/account"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
              isActive ? 'bg-brand-50 dark:bg-brand-950/30' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
            )
          }
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
            <User size={14} className="text-neutral-600 dark:text-neutral-300" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{displayName}</div>
            <div className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">{user?.email}</div>
          </div>
        </NavLink>
        <button
          onClick={() => void signOut()}
          className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <LogOut size={16} />
          გასვლა
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:flex lg:h-full lg:shrink-0">{inner}</div>

      {/* Mobile: drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="flex h-full">{inner}</div>
          <div className="flex-1 bg-black/30" onClick={onClose} />
        </div>
      )}
    </>
  );
});
