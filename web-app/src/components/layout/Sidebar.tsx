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
  Megaphone,
  AlertTriangle,
  FileText,
  GraduationCap,
  CreditCard,
  LayoutTemplate,
  ScrollText,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', label: 'მთავარი', icon: Home },
  { to: '/projects', label: 'პროექტები', icon: Folder },
  { to: '/inspections', label: 'შემოწმების აქტები', icon: ClipboardCheck },
  { to: '/briefings', label: 'ბრიფინგები', icon: Megaphone },
  { to: '/incidents', label: 'ინციდენტები', icon: AlertTriangle },
  { to: '/reports', label: 'რეპორტები', icon: FileText },
  { to: '/certificates', label: 'სერტიფიკატები', icon: Award },
  { to: '/qualifications', label: 'ჩემი კვალიფიკაცია', icon: GraduationCap },
  { to: '/calendar', label: 'კალენდარი', icon: Calendar },
  { to: '/regulations', label: 'რეგულაციები', icon: BookOpen },
  { to: '/safety', label: '3D უსაფრთხოების გზამკვლევი', icon: Building2 },
  { to: '/templates', label: 'შაბლონები', icon: LayoutTemplate },
  { to: '/terms', label: 'წესები და პირობები', icon: ScrollText },
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

      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
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
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <NavLink
          to="/account"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
              isActive ? 'bg-brand-50' : 'hover:bg-neutral-100',
            )
          }
        >
          <CreditCard size={18} className="shrink-0 text-neutral-500" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-neutral-900">{displayName}</div>
            <div className="truncate text-xs text-neutral-500">{user?.email}</div>
          </div>
        </NavLink>
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
