import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderOpen, ClipboardCheck, ShieldCheck, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickActionsRow, type QuickActionDef } from '@/components/ui/quick-actions';
import { SectionHeader } from '@/components/ui/section-header';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { ProBanner } from '@/components/ProBanner';
import { ProjectCard } from '@/components/home/ProjectCard';
import { DraftResumeCard } from '@/components/home/DraftResumeCard';
import { RecentRecordsFeed } from '@/components/home/RecentRecordsFeed';
import { useAuth } from '@/lib/auth';
import { usePdfUsage } from '@/lib/usePdfUsage';
import { listProjects } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { staggerContainer, fadeUpItem, STAGGER } from '@/lib/animations';

const PROJECT_PREVIEW = 6;

/** "ოთხშაბათი, 8 ივლისი" — same date line the mobile home header shows. */
function todayLabel(): string {
  const label = new Intl.DateTimeFormat('ka-GE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return label.charAt(0).toLocaleUpperCase('ka-GE') + label.slice(1);
}

export default function Home() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { data: usage } = usePdfUsage();
  // Active Pro → manage/cancel card; free & expired → the orange ProBanner
  // (two-state: progress bar + state-specific copy).
  const isPro = usage?.status === 'active';
  const firstName = profile ? (profile.first_name?.trim() || user?.email?.split('@')[0] || '') : '';

  const { data: projects, isLoading } = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: listProjects,
    staleTime: 1000 * 60 * 5,
  });

  const quickActions: QuickActionDef[] = [
    {
      key: 'inspection',
      label: 'შემოწმება',
      icon: ShieldCheck,
      tone: 'brand',
      onClick: () => navigate('/inspections/new'),
    },
    {
      key: 'order',
      label: 'ბრძანება',
      icon: ScrollText,
      tone: 'cert',
      onClick: () => navigate('/orders/new'),
    },
  ];

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer(STAGGER.grid)}
      initial="hidden"
      animate="visible"
    >
      {/* ═════ Row 1: Title + primary CTA ═════ */}
      <motion.header variants={fadeUpItem()} className="flex items-center justify-between gap-4">
        <div>
          {/* Date eyebrow — mobile home parity (date line above the greeting). */}
          <p className="text-xs font-semibold text-[var(--text-muted)]">{todayLabel()}</p>
          <h1 className="mt-0.5 font-display text-heading-1 text-neutral-900 dark:text-neutral-100">
            მოგესალმებით{firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <Button className="shrink-0 gap-1.5" onClick={() => navigate('/inspections/new')}>
          <ClipboardCheck size={15} />
          ახალი შემოწმების აქტი
        </Button>
      </motion.header>

      {/* ═════ Row 2: Quick creation verbs ═════ */}
      <motion.div variants={fadeUpItem()}>
        <QuickActionsRow actions={quickActions} />
      </motion.div>

      {/* ═════ Row 3: Subscription banner — orange ProBanner (free/expired) or
           the manage card (active Pro) ═════ */}
      <motion.div variants={fadeUpItem()}>
        {isPro ? <SubscriptionCard /> : <ProBanner />}
      </motion.div>

      {/* ═════ Row 4: Resume the newest unfinished act ═════ */}
      <motion.div variants={fadeUpItem()}>
        <DraftResumeCard />
      </motion.div>

      {/* ═════ Row 5: Projects ═════ */}
      <motion.div variants={fadeUpItem()}>
        <SectionHeader
          title="პროექტები"
          count={projects?.length}
          to="/projects"
          linkLabel="ყველა"
        />
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[148px] animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (projects?.length ?? 0) === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 py-12 text-center dark:border-neutral-800">
            <FolderOpen size={24} className="mb-2 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">პროექტები ჯერ არ არის</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(projects ?? []).slice(0, PROJECT_PREVIEW).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </motion.div>

      {/* ═════ Row 6: Recent records feed ═════ */}
      <motion.div variants={fadeUpItem()}>
        <RecentRecordsFeed />
      </motion.div>
    </motion.div>
  );
}
