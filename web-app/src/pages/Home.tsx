import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, memo, useState } from 'react';
import { motion } from 'framer-motion';
import { SkeletonList, SkeletonStatCard } from '@/components/SkeletonCard';
import {
  ClipboardCheck, AlertTriangle, Megaphone, FileText, FolderOpen,
  ChevronRight, Truck, Pickaxe, Wrench, ShieldCheck, Flame,
  TrendingUp, Clock, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { StatCard } from '@/components/charts/StatCard';
import { HeatmapCalendar } from '@/components/charts/HeatmapCalendar';
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

/* ─── Type icons per inspection type ─── */
const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; darkBg: string; label: string }> = {
  harness:       { icon: ShieldCheck, color: 'text-brand-600',      bg: 'bg-brand-50',      darkBg: 'dark:bg-brand-950/30',      label: 'ქამარი' },
  xaracho:       { icon: ShieldCheck, color: 'text-brand-600',      bg: 'bg-brand-50',      darkBg: 'dark:bg-brand-950/30',      label: 'ხარაჩო' },
  bobcat:        { icon: Truck,       color: 'text-amber-600',      bg: 'bg-amber-50',      darkBg: 'dark:bg-amber-950/30',      label: 'ციცხვიანი' },
  excavator:     { icon: Pickaxe,     color: 'text-blue-600',       bg: 'bg-blue-50',       darkBg: 'dark:bg-blue-950/30',       label: 'ექსკავატორი' },
  general:       { icon: Wrench,      color: 'text-purple-600',     bg: 'bg-purple-50',     darkBg: 'dark:bg-purple-950/30',     label: 'ტექ. აღჭურვ.' },
  cargo_platform:{ icon: ShieldCheck, color: 'text-teal-600',       bg: 'bg-teal-50',        darkBg: 'dark:bg-teal-950/30',        label: 'პლატფორმა' },
  default:       { icon: ClipboardCheck, color: 'text-brand-600', bg: 'bg-brand-50',      darkBg: 'dark:bg-brand-950/30',      label: 'აქტი' },
};

function getTypeConfig(href: string) {
  if (href.includes('bobcat')) return TYPE_CONFIG.bobcat;
  if (href.includes('excavator')) return TYPE_CONFIG.excavator;
  if (href.includes('general-equipment')) return TYPE_CONFIG.general;
  if (href.includes('cargo-platform')) return TYPE_CONFIG.cargo_platform;
  return TYPE_CONFIG.default;
}

/* ─── Recent item row ─── */
const RecentItemRow = memo(function RecentItemRow({
  item,
}: {
  item: { id: string; label: string; date: string; status: string; href: string };
}) {
  const config = getTypeConfig(item.href);
  const Icon = config.icon;
  const isCompleted = item.status === 'completed';

  return (
    <Link
      to={item.href}
      className="group flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-3 transition-all hover:border-brand-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-brand-700"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg} ${config.darkBg} ${config.color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">{config.label}</span>
          <span className="text-[10px] text-neutral-300 dark:text-neutral-600">•</span>
          <span className="font-mono text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">
            {item.date ? new Date(item.date).toLocaleDateString('ka-GE') : ''}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          isCompleted
            ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
        }`}>
          {isCompleted ? 'დასრულებული' : 'დრაფტი'}
        </span>
        <ChevronRight size={14} className="text-neutral-300 transition-transform group-hover:translate-x-0.5 dark:text-neutral-600" />
      </div>
    </Link>
  );
});

/* ─── Quick action tile ─── */
function QuickActionTile({ to, icon: Icon, label, color, darkColor }: {
  to: string; icon: React.ElementType; label: string; color: string; darkColor: string;
}) {
  return (
    <Link to={to}>
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color} ${darkColor}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">ახლავე დაიწყეთ</p>
        </div>
        <ChevronRight size={16} className="ml-auto text-neutral-300 dark:text-neutral-600" />
      </motion.div>
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
      className="space-y-8"
      variants={staggerContainer(STAGGER.grid)}
      initial="hidden"
      animate="visible"
    >
      {/* ═════ Top Row: Left (stats) | Right (greeting + sub) ═════ */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {/* Left: 4 stat cards in a 2×2 grid */}
        <motion.div variants={fadeUpItem()} className="xl:col-span-2">
          {isLoading ? (
            <div className="grid h-full gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} className="h-full" />)}
            </div>
          ) : (
            <div className="grid h-full gap-4 sm:grid-cols-2">
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
                className="h-full"
              />
              <StatCard
                title="პროექტები"
                value={projects?.length ?? 0}
                icon={FolderOpen}
                href="/projects"
                sparklineData={[1, 2, 2, 3, 4, projects?.length ?? 0]}
                staggerIndex={1}
                className="h-full"
              />
              <StatCard
                title="ინციდენტები"
                value={incidents?.length ?? 0}
                icon={AlertTriangle}
                href="/incidents"
                sparklineData={[0, 1, 0, 2, 1, incidents?.length ?? 0]}
                staggerIndex={2}
                className="h-full"
              />
              <StatCard
                title="ინსტრუქტაჟები"
                value={briefings?.length ?? 0}
                icon={Megaphone}
                href="/briefings"
                sparklineData={[1, 3, 2, 4, 3, briefings?.length ?? 0]}
                staggerIndex={3}
                className="h-full"
              />
            </div>
          )}
        </motion.div>

        {/* Right: greeting + button + subscription */}
        <motion.div variants={fadeUpItem()} className="xl:col-span-2 space-y-5">
          <header className="flex items-start justify-between gap-4">
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
          </header>
          <SubscriptionCard />
        </motion.div>
      </div>

      {/* ═════ Row 2: Full-Width Activity + Recent ═════ */}
      <motion.div variants={fadeUpItem()}>
        <Card disableHover className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                <TrendingUp size={18} />
              </div>
              <div>
                <CardTitle className="text-heading-3">აქტივობა და ბოლო ჩანაწერები</CardTitle>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {completedThisWeek} დასრულებული • {allInspectionsUnsliced.filter(i => i.status === 'draft').length} დრაფტი
                </p>
              </div>
            </div>
            <Link to="/inspections" className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20">
              ყველა <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 xl:grid-cols-5">
              {/* Heatmap — takes left 3 cols */}
              <div className="col-span-1 xl:col-span-3 border-b border-neutral-100 p-5 dark:border-neutral-800 xl:border-b-0 xl:border-r">
                <HeatmapCalendar data={heatmapData} color="#147A4F" />
              </div>

              {/* Recent list — takes right 2 cols */}
              <div className="col-span-1 xl:col-span-2 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-neutral-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">ბოლო 5 ჩანაწერი</span>
                </div>
                {isLoading ? (
                  <SkeletonList count={5} />
                ) : allInspections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ClipboardCheck size={24} className="mb-2 text-neutral-300 dark:text-neutral-700" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">ჯერ არაფერია დაფიქსირებული</p>
                    <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">დაიწყეთ პირველი შემოწმებით</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {allInspections.map((item) => (
                      <RecentItemRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
