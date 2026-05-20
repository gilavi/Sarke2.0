import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal, TextInput, PasswordInput } from '@mantine/core';
import {
  Receipt, User, KeyRound, Award, ScrollText,
  ChevronRight, Moon, Sun, Check, CalendarDays, Infinity as InfinityIcon, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { updateUserName } from '@/lib/data/account';
import { usePaymentHistory, cancelSubscription, type PaymentRecord } from '@/lib/subscription';
import { usePdfUsage, useInvalidatePdfUsage } from '@/lib/usePdfUsage';
import { fmtDateTimeKa, fmtDateKa } from '@/lib/utils';
import { listCertificates } from '@/lib/data/certificates';
import { listQualifications, qualificationLabel } from '@/lib/data/qualifications';

const STATUS_LABEL: Record<PaymentRecord['status'], string> = {
  success: 'წარმატებული',
  failed: 'წარუმატებელი',
  pending: 'მოლოდინში',
  refunded: 'დაბრუნებული',
};
const STATUS_CLASS: Record<PaymentRecord['status'], string> = {
  success: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  pending: 'bg-neutral-100 text-neutral-600',
  refunded: 'bg-amber-50 text-amber-700',
};
const formatDateTime = fmtDateTimeKa;

/* ── Reusable modal shell ── */
function AccountModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Modal opened={open} onClose={onClose} title={title} radius="lg" size="md" centered>
      {children}
    </Modal>
  );
}

/* ── Profile modal content ── */
function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setFirstName(profile?.first_name ?? ''); setLastName(profile?.last_name ?? ''); setInfo(null); }
  }, [open, profile?.first_name, profile?.last_name]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('არაავტორიზებული');
      return updateUserName(user.id, firstName.trim(), lastName.trim());
    },
    onSuccess: () => {
      setInfo('შენახულია.');
      qc.invalidateQueries({ queryKey: ['users', user?.id] });
      setTimeout(() => { setInfo(null); onClose(); }, 1200);
    },
  });

  return (
    <AccountModal open={open} onClose={onClose} title="პროფილი">
      <form onSubmit={(e) => { e.preventDefault(); if (firstName.trim() && lastName.trim()) mutation.mutate(); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="სახელი" value={firstName} onChange={(e) => setFirstName(e.target.value)} required radius="md" />
          <TextInput label="გვარი" value={lastName} onChange={(e) => setLastName(e.target.value)} required radius="md" />
        </div>
        <TextInput label="ელ-ფოსტა" value={user?.email ?? ''} disabled radius="md" />
        {mutation.error && <p className="text-sm text-red-600">{mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}</p>}
        {info && <p className="flex items-center gap-1 text-sm text-brand-600"><Check size={14} />{info}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>გაუქმება</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'ინახება…' : 'შენახვა'}</Button>
        </div>
      </form>
    </AccountModal>
  );
}

/* ── Password modal content ── */
function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { updatePassword } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => { if (open) { setPw(''); setPw2(''); setInfo(null); } }, [open]);

  const mutation = useMutation({
    mutationFn: () => updatePassword(pw),
    onSuccess: () => {
      setInfo('პაროლი შეცვლილია.');
      setPw(''); setPw2('');
      setTimeout(() => { setInfo(null); onClose(); }, 1200);
    },
  });

  const canSubmit = pw.length >= 8 && pw === pw2 && !mutation.isPending;

  return (
    <AccountModal open={open} onClose={onClose} title="პაროლის შეცვლა">
      <form onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(); }} className="space-y-3">
        <PasswordInput label="ახალი პაროლი" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="მინ. 8 სიმბოლო" radius="md" />
        <PasswordInput label="გაიმეორეთ" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} radius="md" />
        {pw && pw2 && pw !== pw2 && <p className="text-sm text-red-600">პაროლები არ ემთხვევა.</p>}
        {mutation.error && <p className="text-sm text-red-600">{mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}</p>}
        {info && <p className="flex items-center gap-1 text-sm text-brand-600"><Check size={14} />{info}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>გაუქმება</Button>
          <Button type="submit" disabled={!canSubmit}>{mutation.isPending ? 'ინახება…' : 'შეცვლა'}</Button>
        </div>
      </form>
    </AccountModal>
  );
}

/* ── List widget (certificates / qualifications / templates) ── */
interface ListItem { id: string; label: string; sub: string; href: string; }

function ListCard({ to, title, icon: Icon, iconColor, iconBg, items, isLoading }: {
  to: string; title: string; icon: React.ElementType;
  iconColor: string; iconBg: string; items: ListItem[]; isLoading?: boolean;
}) {
  const preview = items.slice(0, 3);
  const extra = items.length - 3;
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
          <Icon size={15} />
        </div>
        <p className="flex-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
        <Link to={to} className="flex items-center gap-0.5 text-xs text-brand-600 hover:underline dark:text-brand-400">
          ყველა <ChevronRight size={12} />
        </Link>
      </div>
      {isLoading ? (
        <div className="m-4 h-12 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
      ) : items.length === 0 ? (
        <p className="px-4 py-5 text-center text-sm text-neutral-400 dark:text-neutral-500">ჩანაწერი არ არის</p>
      ) : (
        <>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {preview.map((item) => (
              <li key={item.id}>
                <Link to={item.href} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{item.label}</p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{item.sub}</p>
                  </div>
                  <ChevronRight size={13} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
                </Link>
              </li>
            ))}
          </ul>
          {extra > 0 && (
            <Link to={to} className="flex items-center justify-center gap-1 border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/50">
              კიდევ {extra} <ChevronRight size={12} />
            </Link>
          )}
        </>
      )}
    </div>
  );
}


/* ── Main Account page ── */
export default function Account() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { data: history, isLoading: histLoading } = usePaymentHistory();
  const { data: usage } = usePdfUsage();
  const invalidate = useInvalidatePdfUsage();
  const { isDark, toggleMode } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const { data: certs } = useQuery({ queryKey: ['certificates'], queryFn: listCertificates, staleTime: 1000 * 60 * 5 });
  const { data: quals } = useQuery({ queryKey: ['qualifications'], queryFn: listQualifications, staleTime: 1000 * 60 * 5 });

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0] || '';

  const cancelled = !!usage?.cancelledAt;

  async function handleCancel() {
    if (!user || !usage) return;
    if (!window.confirm(
      usage.expiresAt
        ? `გამოწერის გაუქმება? წვდომა გაგრძელდება ${fmtDateKa(usage.expiresAt)}-მდე.`
        : 'გამოწერის გაუქმება?',
    )) return;
    setCancelling(true);
    try {
      const res = await cancelSubscription(user.id);
      invalidate();
      setCancelMsg(res.active_until ? `წვდომა გაგრძელდება ${fmtDateKa(res.active_until)}-მდე` : 'გამოწერა გაუქმდა');
    } catch (e) {
      setCancelMsg(`შეცდომა: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">ანგარიში</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          გამოწერა, პროფილი და გადახდის ისტორია.
        </p>
      </header>

      {/* Profile + subscription combined card */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {/* User identity + plan — merged row */}
        <div className={cn(
          'flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800',
          usage?.status === 'active' && 'bg-amber-50/60 dark:bg-amber-950/10',
        )}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400 font-semibold text-sm">
            {displayName.slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{displayName}</p>
              {usage?.status === 'active' && (
                <span className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  cancelled ? 'bg-neutral-300 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400' : 'bg-amber-500 text-white',
                )}>
                  PRO{!cancelled && ' ✓'}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user?.email}</p>
            {/* Plan details */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {usage?.status === 'active' && (
                <>
                  {usage.expiresAt && (
                    <span className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                      <CalendarDays size={11} className="shrink-0" />
                      მოქმედია {fmtDateKa(usage.expiresAt)}-მდე
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                    <InfinityIcon size={11} className="shrink-0" />
                    შეუზღუდავი PDF
                  </span>
                  {cancelMsg && <span className="text-[11px] text-neutral-400">{cancelMsg}</span>}
                </>
              )}
              {usage?.status === 'expired' && (
                <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={11} className="shrink-0" />
                  გამოწერა ამოიწურა · PDF: {usage.count}/{usage.limit}
                </span>
              )}
              {usage?.status === 'free' && (
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                  უფასო გეგმა · PDF: {usage.count}/{usage.limit}
                </span>
              )}
            </div>
          </div>
          {/* Plan action */}
          {usage?.status === 'active' && !cancelled && (
            <button
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="shrink-0 text-xs font-medium text-neutral-400 transition-colors hover:text-red-500 disabled:opacity-50 dark:text-neutral-500"
            >
              {cancelling ? '…' : 'გაუქმება'}
            </button>
          )}
          {(usage?.status === 'expired' || usage?.status === 'free' || (usage?.status === 'active' && cancelled)) && (
            <Button onClick={() => navigate('/subscribe')} size="sm" className="shrink-0 gap-1">
              {usage.status === 'active' ? 'განახლება' : 'PRO'} <ArrowRight size={13} />
            </Button>
          )}
        </div>
        {/* Actions */}
        {[
          { icon: User,     label: 'პროფილის რედაქტირება', sub: 'სახელი, გვარი',         onClick: () => setProfileOpen(true) },
          { icon: KeyRound, label: 'პაროლის შეცვლა',       sub: 'ანგარიშის უსაფრთხოება', onClick: () => setPasswordOpen(true) },
        ].map(({ icon: Icon, label, sub, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 border-t border-neutral-100 px-5 py-3.5 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/60"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <Icon size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{sub}</p>
            </div>
            <ChevronRight size={14} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
          </button>
        ))}
        {/* Appearance toggle — inline, no modal */}
        <div className="flex items-center gap-3 border-t border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {isDark ? <Moon size={15} /> : <Sun size={15} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">გარეგნობა</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{isDark ? 'მუქი რეჟიმი' : 'ნათელი რეჟიმი'}</p>
          </div>
          <button
            onClick={toggleMode}
            aria-label="გარეგნობის შეცვლა"
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors',
              isDark ? 'bg-brand-500' : 'bg-neutral-200',
            )}
          >
            <span className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              isDark ? 'translate-x-5' : 'translate-x-0.5',
            )} />
          </button>
        </div>
        <Link
          to="/terms"
          className="flex items-center gap-3 border-t border-neutral-100 px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/60"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <ScrollText size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">წესები და პირობები</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">სამართლებრივი ინფორმაცია</p>
          </div>
          <ChevronRight size={14} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
        </Link>
      </div>

      {/* List widgets */}
      <ListCard
        to="/certificates"
        title="სერტიფიკატები"
        icon={Award}
        iconColor="text-amber-600"
        iconBg="bg-amber-50 dark:bg-amber-950/30"
        isLoading={!certs}
        items={(certs ?? []).map((c) => ({
          id: c.id,
          label: c.conclusion_text || `სერტ. #${c.id.slice(0, 6)}`,
          sub: c.generated_at ? new Date(c.generated_at).toLocaleDateString('ka-GE') : '',
          href: `/certificates/${c.id}`,
        }))}
      />
      <ListCard
        to="/qualifications"
        title="კვალიფიკაციები"
        icon={Award}
        iconColor="text-blue-600"
        iconBg="bg-blue-50 dark:bg-blue-950/30"
        isLoading={!quals}
        items={(quals ?? []).map((q) => ({
          id: q.id,
          label: qualificationLabel(q.type),
          sub: [q.number, q.expires_at ? new Date(q.expires_at).toLocaleDateString('ka-GE') : ''].filter(Boolean).join(' · '),
          href: `/qualifications/${q.id}`,
        }))}
      />

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt size={16} /> გადახდის ისტორია
          </CardTitle>
        </CardHeader>
        <CardContent>
          {histLoading ? (
            <div className="h-20 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
          ) : !history || history.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-neutral-500">
              <Receipt size={28} className="text-neutral-300 dark:text-neutral-600" />
              <span>ჩანაწერები არ არის</span>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {history.map((row) => (
                <li key={row.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {row.amount != null ? `${row.currency === 'GEL' ? '₾' : (row.currency ?? '')}${row.amount.toFixed(2)}` : '—'}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDateTime(row.created_at)} · #{row.bog_order_id.slice(0, 8)}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[row.status]}`}>
                    {STATUS_LABEL[row.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
