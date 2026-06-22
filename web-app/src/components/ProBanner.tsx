import { useNavigate } from 'react-router-dom';
import { Rocket, ArrowRight } from 'lucide-react';
import { usePdfUsage } from '@/lib/usePdfUsage';
import { routes } from '@/app/routes';

/**
 * The orange "go Pro" banner shown on the home page. One visual, two states:
 *
 *  - `free`    → promote Pro; the progress bar shows PDF usage toward the limit.
 *  - `expired` → the subscription lapsed; same bar (now maxed) + a renew CTA.
 *
 * Renders nothing for active Pro users (nothing to sell) — the home page shows
 * the manage/cancel `SubscriptionCard` for them instead. Replaces the old gray
 * `გამოწერა ამოიწურა` banner so both states share the nicer orange treatment.
 */
export function ProBanner() {
  const navigate = useNavigate();
  const { data: usage } = usePdfUsage();

  if (!usage || usage.status === 'active') return null;

  const { status, count, limit } = usage;
  const expired = status === 'expired';
  const pct = limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0;

  const copy = expired
    ? { title: 'გამოწერა ამოიწურა', sub: 'განაახლეთ Pro წვდომა შეუზღუდავი PDF-ისთვის', cta: 'განახლება ₾19/თვე' }
    : { title: 'Hubble Pro', sub: 'ულიმიტო PDF და დამატებითი ფუნქციები', cta: 'განახლება' };

  return (
    <button
      type="button"
      onClick={() => navigate(routes.subscribe.index)}
      aria-label={copy.title}
      className="flex w-full items-center gap-4 rounded-2xl p-4 text-left text-white transition-transform hover:scale-[1.01]"
      style={{ background: 'linear-gradient(135deg, #FF7A47 0%, #E84709 100%)' }}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Rocket className="h-5 w-5 text-white" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="block text-sm font-bold">{copy.title}</span>
          <span className="shrink-0 text-[11px] font-semibold text-white/85">PDF: {count} / {limit}</span>
        </span>
        <span className="mt-1 block text-[12px] leading-snug text-white/85">{copy.sub}</span>
        {/* Progress bar — white fill on a translucent track, readable on orange. */}
        <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-white/25">
          <span className="block h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold text-[#E84709]">
        {copy.cta} <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
