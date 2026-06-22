import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { ProjectActivityWidget } from '@/components/ProjectActivityWidget';
import { useAuth } from '@/lib/auth';
import { listProjects } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { staggerContainer, fadeUpItem, STAGGER } from '@/lib/animations';

export default function Home() {
  const { profile, user } = useAuth();
  const firstName = profile ? (profile.first_name?.trim() || user?.email?.split('@')[0] || '') : '';

  const { data: projects, isLoading } = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: listProjects,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer(STAGGER.grid)}
      initial="hidden"
      animate="visible"
    >
      {/* ═════ Row 1: Title ═════ */}
      <motion.header variants={fadeUpItem()} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">
            მოგესალმებით{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Hubble - თქვენი შრომის უსაფრთხოების ცენტრი.
          </p>
        </div>
      </motion.header>

      {/* ═════ Row 2: Subscription Banner ═════ */}
      <motion.div variants={fadeUpItem()}>
        <SubscriptionCard />
      </motion.div>

      {/* ═════ Row 3: Project widgets ═════ */}
      <motion.div variants={fadeUpItem()}>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (projects?.length ?? 0) === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-12 text-center dark:border-neutral-800">
            <FolderOpen size={24} className="mb-2 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">პროექტი არ არის</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(projects ?? []).slice(0, 4).map((project) => (
              <ProjectActivityWidget
                key={project.id}
                project={project}
                onNewAct={() => {}}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
