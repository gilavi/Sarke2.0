import { useNavigate, Link } from 'react-router-dom';
import type { ComponentType } from 'react';
type LucideIcon = ComponentType<import('lucide-react').LucideProps>;
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Megaphone, FileText, FolderOpen,
  Flame, Zap, ChevronDown,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { Sparkline } from '@/components/charts/Sparkline';
import { HeatmapCalendar } from '@/components/charts/HeatmapCalendar';
import { ProjectActivityWidget } from '@/components/ProjectActivityWidget';
import { useAuth } from '@/lib/auth';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listCargoPlatformInspections } from '@/lib/data/cargoPlatform';
import { listProjects } from '@/lib/data/projects';
import { listIncidents } from '@/lib/data/incidents';
import { listBriefings } from '@/lib/data/briefings';
import InspectionWizard from '@/components/InspectionWizard';
import { harnessWizardPreset } from '@/components/inspections/harnessPreset';
import { useInspectionName, equipmentInspectionName } from '@/lib/documentNames';
import { staggerContainer, fadeUpItem, STAGGER } from '@/lib/animations';
import {
  inspectionKeys,
  bobcatKeys,
  generalEquipmentKeys,
  excavatorKeys,
  cargoPlatformKeys,
  projectKeys,
  incidentKeys,
  briefingKeys,
} from '@/app/queryKeys';
import { routes } from '@/app/routes';

/* ─── Quick action tile ─── */
function QuickActionTile({ to, icon: Icon, label, color, darkColor }: {
  to: string; icon: LucideIcon; label: string; color: string; darkColor: string;
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
  // Only fall back to the email prefix once `profile` has actually loaded —
  // otherwise the greeting flashes "gilavi2000" before correcting to "Giorgi"
  // on the first render after auth restores.
  const firstName = profile ? (profile.first_name?.trim() || user?.email?.split('@')[0] || '') : '';

  const { data: inspections, isLoading: l1 } = useQuery({ queryKey: inspectionKeys.lists(), queryFn: () => listInspections(), staleTime: 1000 * 60 * 5 });
  const { data: bobcats, isLoading: l2 } = useQuery({ queryKey: bobcatKeys.lists(), queryFn: () => listBobcatInspections(), staleTime: 1000 * 60 * 5 });
  const { data: generalEq, isLoading: l3 } = useQuery({ queryKey: generalEquipmentKeys.lists(), queryFn: () => listGeneralEquipmentInspections(), staleTime: 1000 * 60 * 5 });
  const { data: excavators, isLoading: l4 } = useQuery({ queryKey: excavatorKeys.lists(), queryFn: () => listExcavatorInspections(), staleTime: 1000 * 60 * 5 });
  const { data: cargoPlatforms, isLoading: l8 } = useQuery({ queryKey: cargoPlatformKeys.lists(), queryFn: () => listCargoPlatformInspections(), staleTime: 1000 * 60 * 5 });
  const { data: projects, isLoading: l5 } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects, staleTime: 1000 * 60 * 5 });
  const { data: incidents, isLoading: l6 } = useQuery({ queryKey: incidentKeys.lists(), queryFn: () => listIncidents(), staleTime: 1000 * 60 * 5 });
  const { data: briefings, isLoading: l7 } = useQuery({ queryKey: briefingKeys.lists(), queryFn: () => listBriefings(), staleTime: 1000 * 60 * 5 });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8;

  const inspectionName = useInspectionName();
  const allInspectionsUnsliced = useMemo(() => [
    ...(inspections ?? []).map((i) => {
      const cat = Array.isArray(i.template) ? i.template[0]?.category : null;
      const href = cat === 'harness' ? routes.harness.detail(i.id) : routes.inspections.detail(i.id);
      return { id: i.id, label: inspectionName(i.template_id), date: i.created_at ?? '', status: i.status, href };
    }),
    ...(bobcats ?? []).map((i) => ({ id: i.id, label: equipmentInspectionName('bobcat'), date: i.createdAt, status: i.status, href: routes.bobcat.detail(i.id) })),
    ...(generalEq ?? []).map((i) => ({ id: i.id, label: equipmentInspectionName('general'), date: i.createdAt, status: i.status, href: routes.generalEquipment.detail(i.id) })),
    ...(excavators ?? []).map((i) => ({ id: i.id, label: equipmentInspectionName('excavator'), date: i.createdAt, status: i.status, href: routes.excavator.detail(i.id) })),
    ...(cargoPlatforms ?? []).map((i) => ({ id: i.id, label: equipmentInspectionName('cargo_platform'), date: i.createdAt, status: i.status, href: routes.cargoPlatform.detail(i.id) })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [inspections, bobcats, generalEq, excavators, cargoPlatforms, inspectionName]);

  const totalInspections = useMemo(() => (inspections?.length ?? 0) + (bobcats?.length ?? 0) + (generalEq?.length ?? 0) + (excavators?.length ?? 0) + (cargoPlatforms?.length ?? 0), [inspections, bobcats, generalEq, excavators, cargoPlatforms]);

  const [newInspectionOpen, setNewInspectionOpen] = useState(false);
  const [harnessOpen, setHarnessOpen] = useState(false);

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
            Hubble — თქვენი შრომის უსაფრთხოების ცენტრი.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="shrink-0 gap-1.5">
              <Zap size={15} />
              ახალი აქტი
              <ChevronDown size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onSelect={() => setNewInspectionOpen(true)}>ფასადის ხარაჩოს შემოწმება</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setHarnessOpen(true)}>დამცავი ქამრების შემოწმება</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(routes.bobcat.new)}>ციცხვიანი დამტვირთველი</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(routes.excavator.new)}>ექსკავატორის შემოწმება</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(routes.generalEquipment.new)}>ტექ. აღჭურვილობა</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(routes.cargoPlatform.new)}>ტვირთის პლატფორმა</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <InspectionWizard open={newInspectionOpen} onClose={() => setNewInspectionOpen(false)} />
        <InspectionWizard open={harnessOpen} onClose={() => setHarnessOpen(false)} preset={harnessWizardPreset} />
      </motion.header>

      {/* ═════ Row 2: Subscription Banner (full width) ═════ */}
      <motion.div variants={fadeUpItem()}>
        <SubscriptionCard />
      </motion.div>

      {/* ═════ Row 3: Quick Actions ═════ */}
      <motion.div variants={fadeUpItem()} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionTile
          to={routes.incidents.new()}
          icon={AlertTriangle}
          label="ინციდენტის დამატება"
          color="bg-amber-50 text-amber-600"
          darkColor="dark:bg-amber-950/30 dark:text-amber-400"
        />
        <QuickActionTile
          to={routes.briefings.new()}
          icon={Megaphone}
          label="ინსტრუქტაჟის ჩატარება"
          color="bg-blue-50 text-blue-600"
          darkColor="dark:bg-blue-950/30 dark:text-blue-400"
        />
        <QuickActionTile
          to={routes.reports.new()}
          icon={FileText}
          label="ახალი რეპორტი"
          color="bg-red-50 text-red-600"
          darkColor="dark:bg-red-950/30 dark:text-red-400"
        />
        <QuickActionTile
          to={routes.orders.new()}
          icon={Flame}
          label="ბრძანების შექმნა"
          color="bg-red-50 text-red-600"
          darkColor="dark:bg-red-950/30 dark:text-red-400"
        />
      </motion.div>

      {/* ═════ Row 4: Stats + Heatmap combined ═════ */}
      <motion.div variants={fadeUpItem()}>
        <Card disableHover className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left: 2×2 stat grid */}
            <div className="border-b border-neutral-100 dark:border-neutral-800 lg:border-b-0 lg:border-r">
              {isLoading ? (
                <div className="grid grid-cols-2 divide-x divide-y divide-neutral-100 dark:divide-neutral-800">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-5">
                      <div className="h-4 w-16 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800 mb-2" />
                      <div className="h-8 w-10 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 divide-x divide-y divide-neutral-100 dark:divide-neutral-800">
                  {[
                    { title: 'შემოწმებები', value: totalInspections, href: routes.inspections.list(), sparklineData: [2,5,3,8,6,totalInspections] },
                    { title: 'პროექტები',   value: projects?.length ?? 0, href: routes.projects.list,   sparklineData: [1,2,2,3,4,projects?.length ?? 0] },
                    { title: 'ინციდენტები', value: incidents?.length ?? 0, href: routes.incidents.list(), sparklineData: [0,1,0,2,1,incidents?.length ?? 0] },
                    { title: 'ინსტრუქტ.',  value: briefings?.length ?? 0, href: routes.briefings.list(), sparklineData: [1,3,2,4,3,briefings?.length ?? 0] },
                  ].map(({ title, value, href, sparklineData }) => (
                    <Link key={href} to={href} className="group flex flex-col justify-between p-5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
                      <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
                      <Sparkline data={sparklineData} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Right: heatmap */}
            <div className="flex flex-col p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                აქტივობა
              </p>
              <HeatmapCalendar data={heatmapData} />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ═════ Row 4: Project widgets ═════ */}
      <motion.div variants={fadeUpItem()}>
        <div>
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

    </motion.div>
  );
}
