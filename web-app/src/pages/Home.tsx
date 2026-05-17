import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, memo, useState } from 'react';
import { SkeletonList, SkeletonStatCard } from '@/components/SkeletonCard';
import { ClipboardCheck, AlertTriangle, Megaphone, FileText, FolderOpen, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { useAuth } from '@/lib/auth';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listProjects } from '@/lib/data/projects';
import { listIncidents } from '@/lib/data/incidents';
import { listBriefings } from '@/lib/data/briefings';
import InspectionWizard from '@/components/InspectionWizard';

const InspectionCard = memo(function InspectionCard({
  item,
}: {
  item: { id: string; label: string; date: string; status: string; href: string };
}) {
  return (
    <Link
      to={item.href}
      className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <ClipboardCheck size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">{item.label}</p>
        <p className="text-xs text-neutral-500">
          {item.date ? new Date(item.date).toLocaleDateString('ka-GE') : ''}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-neutral-400" />
    </Link>
  );
});

export default function Home() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const firstName = profile?.first_name?.trim() || user?.email?.split('@')[0] || '';

  const { data: inspections, isLoading: l1 } = useQuery({ queryKey: ['inspections'], queryFn: () => listInspections(), staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 10 });
  const { data: bobcats, isLoading: l2 } = useQuery({ queryKey: ['bobcatInspections'], queryFn: () => listBobcatInspections(), staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 10 });
  const { data: generalEq, isLoading: l3 } = useQuery({ queryKey: ['generalEquipmentInspections'], queryFn: () => listGeneralEquipmentInspections(), staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 10 });
  const { data: excavators, isLoading: l4 } = useQuery({ queryKey: ['excavatorInspections'], queryFn: () => listExcavatorInspections(), staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 10 });
  const { data: projects, isLoading: l5 } = useQuery({ queryKey: ['projects'], queryFn: listProjects, staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 10 });
  const { data: incidents, isLoading: l6 } = useQuery({ queryKey: ['incidents'], queryFn: () => listIncidents(), staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 10 });
  const { data: briefings, isLoading: l7 } = useQuery({ queryKey: ['briefings'], queryFn: () => listBriefings(), staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 10 });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7;

  const allInspectionsUnsliced = useMemo(() => [
    ...(inspections ?? []).map((i) => ({ id: i.id, label: i.harness_name || 'შემოწმების აქტი', date: i.created_at ?? '', status: i.status, href: `/inspections/${i.id}` })),
    ...(bobcats ?? []).map((i) => ({ id: i.id, label: i.equipmentModel || 'ციცხვიანი', date: i.createdAt, status: i.status, href: `/bobcat/${i.id}` })),
    ...(generalEq ?? []).map((i) => ({ id: i.id, label: i.objectName || 'ტექ. აღჭურვილობა', date: i.createdAt, status: i.status, href: `/general-equipment/${i.id}` })),
    ...(excavators ?? []).map((i) => ({ id: i.id, label: i.serialNumber || 'ექსკავატორი', date: i.createdAt, status: i.status, href: `/excavator/${i.id}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [inspections, bobcats, generalEq, excavators]);

  const allInspections = useMemo(() => allInspectionsUnsliced.slice(0, 5), [allInspectionsUnsliced]);
  const draftCount = useMemo(() => allInspectionsUnsliced.filter((i) => i.status === 'draft').length, [allInspectionsUnsliced]);
  const totalInspections = useMemo(() => (inspections?.length ?? 0) + (bobcats?.length ?? 0) + (generalEq?.length ?? 0) + (excavators?.length ?? 0), [inspections, bobcats, generalEq, excavators]);
  const [newInspectionOpen, setNewInspectionOpen] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-neutral-900">
            მოგესალმებით{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sarke ვებ-აპლიკაცია — მუშაობს იმავე ანგარიშებზე, რასაც მობილური აპი.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>+ ახალი შემოწმება</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setNewInspectionOpen(true)}>
              ფასადის ხარაჩოს შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setNewInspectionOpen(true)}>
              დამცავი ქამრების შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/bobcat/new')}>
              ციცხვიანი დამტვირთველის შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/bobcat/new')}>
              დიდი ციცხვიანი დამტვირთველის შემოწმება
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/excavator/new')}>
              ექსკავატორის ტექნიკური შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/general-equipment/new')}>
              ტექნიკური აღჭურვილობის შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/cargo-platform/new')}>
              ტვირთის მიმღები პლატფორმის შემოწმების აქტი
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <InspectionWizard open={newInspectionOpen} onClose={() => setNewInspectionOpen(false)} />
      </header>

      <SubscriptionCard />

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link to="/inspections">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">შემოწმების აქტები</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-brand-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalInspections}</p>
                {draftCount > 0 && (
                  <p className="text-xs text-amber-600 mt-1">{draftCount} დრაფტი</p>
                )}
              </CardContent>
            </Card>
          </Link>
          <Link to="/projects">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">პროექტები</CardTitle>
                <FolderOpen className="h-4 w-4 text-brand-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{projects?.length ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/incidents">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">ინციდენტები</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{incidents?.length ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/briefings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">ინსტრუქტაჟები</CardTitle>
                <Megaphone className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{briefings?.length ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Recent inspections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ბოლო შემოწმებები</CardTitle>
          <Link to="/inspections" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
            ყველა <ChevronRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonList count={5} />
          ) : allInspections.length === 0 ? (
            <p className="text-sm text-neutral-500">შემოწმების აქტები არ არის.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {allInspections.map((item) => (
                <InspectionCard key={item.id} item={item} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/incidents/new">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-sm font-medium">ინციდენტის დამატება</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/briefings/new">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Megaphone className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-sm font-medium">ინსტრუქტაჟის შეტანა</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/reports/new">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <FileText className="h-5 w-5 text-neutral-500" />
              <CardTitle className="text-sm font-medium">ახალი რეპორტი</CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
