import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SkeletonStatCard } from '@/components/SkeletonCard';
import {
  ClipboardCheck, AlertTriangle, Megaphone, FileText, FolderOpen,
  Flame, TrendingUp, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { StatCard } from '@/components/charts/StatCard';
import { HeatmapCalendar } from '@/components/charts/HeatmapCalendar';
import { ProjectActivityWidget } from '@/components/ProjectActivityWidget';
import { useAuth } from '@/lib/auth';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listProjects } from '@/lib/data/projects';
import { listIncidents } from '@/lib/data/incidents';
import { listBriefings } from '@/lib/data/briefings';
import InspectionWizard from '@/components/InspectionWizard';
import { staggerContainer, fadeUpItem, STAGGER } from '@/lib/animations';

/* ─── Quick action tile ─── */
function QuickActionTile({ to, icon: Icon, label, color, darkColor }: {
  to: string; icon: React.ElementType; label: string; color: string; darkColor: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color} ${darkColor}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</p>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">ახლავე დაიწყეთ</p>
      </div>
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const firstName = profile?.first_name?.trim() || user?.email?.split('@')[0] || '';

  const { data: inspections, isLoading: l1 } = useQuery({ queryKey: ['inspections'], queryFn: () => listInspections(), staleTime: 1000 * 60 * 5 });
  const { data: bobcats, isLoading: l2 } = useQuery({ queryKey: ['bobcatInspections'], queryFn: () => listBobcatInspections(), staleTime: 1000 * 60 * 5 });
  const { data: generalEq, isLoading: l3 } = useQuery({ queryKey: ['generalEquipmentInspections'], queryFn: () => listGeneralEquipmentInspections(), staleTime: 1000 * 60 * 5 });
  const { data: excavators, isLoading: l4 } = useQuery({ queryKey: ['excavatorInspections'], queryFn: () => listExcavatorInspections(), staleTime: 1000 * 60 * 5 });
  const { data: projects, isLoading: l5 } = useQuery({ queryKey: ['projects'], queryFn: listProjects, staleTime: 1000 * 60 * 5 });
  const { data: incidents, isLoading: l6 } = useQuery({ queryKey: ['incidents'], queryFn: () => listIncidents(), staleTime: 1000 * 60 * 5 });
  const { data: briefings, isLoading: l7 } = useQuery({ queryKey: ['briefings'], queryFn: () => listBriefings(), staleTime: 1000 * 60 * 5 });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7;

  const allInspectionsUnsliced = useMemo(() => [
    ...(inspections ?? []).map((i) => ({ id: i.id, label: i.harness_name || 'შემოწმების აქტი', date: i.created_at ?? '', status: i.status, href: `/inspections/${i.id}` })),
    ...(bobcats ?? []).map((i) => ({ id: i.id, label: i.equipmentModel || 'ციცხვიანი', date: i.createdAt, status: i.status, href: `/bobcat/${i.id}` })),
    ...(generalEq ?? []).map((i) => ({ id: i.id, label: i.objectName || 'ტექ. აღჭურვილობა', date: i.createdAt, status: i.status, href: `/general-equipment/${i.id}` })),
    ...(excavators ?? []).map((i) => ({ id: i.id, label: i.serialNumber || 'ექსკავატორი', date: i.createdAt, status: i.status, href: `/excavator/${i.id}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [inspections, bobcats, generalEq, excavators]);

  const allInspections = useMemo(() => allInspectionsUnsliced.slice(0, 5), [allInspectionsUnsliced]);
  const totalInspections = useMemo(() => (inspections?.length ?? 0) + (bobcats?.length ?? 0) + (generalEq?.length ?? 0) + (excavators?.length ?? 0), [inspections, bobcats, generalEq, excavators]);
  const completedThisWeek = useMemo(() => allInspectionsUnsliced.filter((i) => i.status === 'completed').length, [allInspectionsUnsliced]);

  const [newInspectionOpen, setNewInspectionOpen] = useState(false);

  const heatmapData = useMemo(() => {
    const out: { date: string; count: number }[] = [];
    for (const i of allInspectionsUnsliced) {
      if (i.date) out.push({ date: i.date.slice(0, 10), count: 1 });
    }
    return out;
  }, [allInspectionsUnsliced]);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer(STAGGER.grid)}
      initial="hidden"
      animate="visible"
    >
      {/* ═════ Row 1: Title + Button ═════ */}
      <motion.header variants={fadeUpItem()} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">
            მოგესალმებით{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Sarke — თქვენი შრომის უსაფრთხოების ცენტრი.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="shrink-0 gap-1.5">
              <Zap size={15} />
              ახალი აქტი
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onSelect={() => setNewInspectionOpen(true)}>ფასადის ხარაჩოს შემოწმება</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setNewInspectionOpen(true)}>დამცავი ქამრების შემოწმება</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/bobcat/new')}>ციცხვიანი დამტვირთველი</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/excavator/new')}>ექსკავატორის შემოწმება</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/general-equipment/new')}>ტექ. აღჭურვილობა</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/cargo-platform/new')}>ტვირთის პლატფორმა</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <InspectionWizard open={newInspectionOpen} onClose={() => setNewInspectionOpen(false)} />
      </motion.header>

      {/* ═════ Row 2: Subscription Banner (full width) ═════ */}
      <motion.div variants={fadeUpItem()}>
        <SubscriptionCard />
      </motion.div>

      {/* ═════ Row 3: 4 Stat Cards ═════ */}
      <motion.div variants={fadeUpItem()}>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="შემოწმების აქტები"
              value={totalInspections}
              icon={ClipboardCheck}
              href="/inspections"
              sparklineData={[2, 5, 3, 8, 6, totalInspections]}
              trendCurrent={totalInspections}
              trendPrevious={Math.max(1, totalInspections - 2)}
              trendLabel="წინა თვესთან"
              staggerIndex={0}
            />
            <StatCard
              title="პროექტები"
              value={projects?.length ?? 0}
              icon={FolderOpen}
              href="/projects"
              sparklineData={[1, 2, 2, 3, 4, projects?.length ?? 0]}
              staggerIndex={1}
            />
            <StatCard
              title="ინციდენტები"
              value={incidents?.length ?? 0}
              icon={AlertTriangle}
              href="/incidents"
              sparklineData={[0, 1, 0, 2, 1, incidents?.length ?? 0]}
              staggerIndex={2}
            />
            <StatCard
              title="ინსტრუქტაჟები"
              value={briefings?.length ?? 0}
              icon={Megaphone}
              href="/briefings"
              sparklineData={[1, 3, 2, 4, 3, briefings?.length ?? 0]}
              staggerIndex={3}
            />
          </div>
        )}
      </motion.div>

      {/* ═════ Row 2: Activity heatmap + Project widgets ═════ */}
      <motion.div variants={fadeUpItem()} className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Heatmap — left 2 cols */}
        <Card disableHover className="overflow-hidden xl:col-span-2">
          <CardHeader className="border-b border-neutral-100 pb-4 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                <TrendingUp size={18} />
              </div>
              <div>
                <CardTitle className="text-heading-3">აქტივობა</CardTitle>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {completedThisWeek} დასრულებული · {allInspectionsUnsliced.filter(i => i.status === 'draft').length} დრაფტი
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <HeatmapCalendar data={heatmapData} color="#147A4F" />
          </CardContent>
        </Card>

        {/* Project widgets — right 3 cols */}
        <div className="xl:col-span-3">
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
                  onNewAct={() => setNewInspectionOpen(true)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ═════ Row 3: Quick Actions ═════ */}
      <motion.div variants={fadeUpItem()} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionTile
          to="/incidents/new"
          icon={AlertTriangle}
          label="ინციდენტის დამატება"
          color="bg-amber-50 text-amber-600"
          darkColor="dark:bg-amber-950/30 dark:text-amber-400"
        />
        <QuickActionTile
          to="/briefings/new"
          icon={Megaphone}
          label="ინსტრუქტაჟის ჩატარება"
          color="bg-blue-50 text-blue-600"
          darkColor="dark:bg-blue-950/30 dark:text-blue-400"
        />
        <QuickActionTile
          to="/reports/new"
          icon={FileText}
          label="ახალი რეპორტი"
          color="bg-neutral-100 text-neutral-600"
          darkColor="dark:bg-neutral-800 dark:text-neutral-300"
        />
        <QuickActionTile
          to="/orders/new"
          icon={Flame}
          label="ბრძანების შექმნა"
          color="bg-red-50 text-red-600"
          darkColor="dark:bg-red-950/30 dark:text-red-400"
        />
      </motion.div>
    </motion.div>
  );
}
