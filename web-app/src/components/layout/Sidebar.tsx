import { NavLink } from 'react-router-dom';
import {
  Home,
  Folder,
  ClipboardCheck,
  Award,
  Calendar,
  BookOpen,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  enabled: boolean;
}

const items: NavItem[] = [
  { to: '/', label: 'მთავარი', icon: Home, enabled: true },
  { to: '/projects', label: 'პროექტები', icon: Folder, enabled: true },
  { to: '/inspections', label: 'შემოწმების აქტები', icon: ClipboardCheck, enabled: true },
  { to: '/certificates', label: 'სერტიფიკატები', icon: Award, enabled: true },
  { to: '/calendar', label: 'კალენდარი', icon: Calendar, enabled: false },
  { to: '/regulations', label: 'რეგულაციები', icon: BookOpen, enabled: false },
];

export function Sidebar() {
  const { profile, user, signOut } = useAuth();
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'მომხმარებელი';

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
          <ShieldCheck size={20} />
        </div>
        <span className="font-display text-lg font-bold text-neutral-900">Sarke</span>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                {item.enabled ? (
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-neutral-700 hover:bg-neutral-100',
                      )
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                ) : (
                  <span
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400"
                    title="მალე"
                  >
                    <Icon size={18} />
                    {item.label}
                    <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      მალე
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <div className="px-3 py-2">
          <div className="text-sm font-medium text-neutral-900 truncate">{displayName}</div>
          <div className="text-xs text-neutral-500 truncate">{user?.email}</div>
        </div>
        <button
          onClick={() => void signOut()}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          <LogOut size={18} />
          გასვლა
        </button>
      </div>
    </aside>
  );
}
