import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import {
  inspectionKeys,
  bobcatKeys,
  excavatorKeys,
  generalEquipmentKeys,
} from '@/app/queryKeys';
import { routes } from '@/app/routes';

const TYPE_AVATAR: Record<string, { emoji: string; bg: string }> = {
  xaracho:            { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  mobile_scaffold:    { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  mobile_scaffold_n3: { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  harness:            { emoji: '🦺', bg: 'bg-blue-50 dark:bg-blue-950/20' },
  bobcat:             { emoji: '🚜', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  excavator:          { emoji: '🚧', bg: 'bg-orange-50 dark:bg-orange-950/20' },
  general:            { emoji: '⚙️', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
  cargo_platform:     { emoji: '📦', bg: 'bg-sky-50 dark:bg-sky-950/20' },
};

interface Props {
  projectId: string;
  onNew: (category?: string) => void;
}

export function InspectionsSection({ projectId, onNew }: Props) {
  const inspectionsQ = useQuery({
    queryKey: inspectionKeys.list(projectId),
    queryFn: () => listInspections(projectId),
  });
  const bobcatsQ = useQuery({
    queryKey: bobcatKeys.list(projectId),
    queryFn: () => listBobcatInspections(projectId),
  });
  const excavatorsQ = useQuery({
    queryKey: excavatorKeys.list(projectId),
    queryFn: () => listExcavatorInspections(projectId),
  });
  const generalQ = useQuery({
    queryKey: generalEquipmentKeys.list(projectId),
    queryFn: () => listGeneralEquipmentInspections(projectId),
  });

  const items = useMemo(() => {
    const merged = [
      ...(inspectionsQ.data ?? []).map((i) => {
        const cat = Array.isArray(i.template) ? (i.template[0]?.category ?? null) : null;
        const type = cat === 'xaracho' || cat === 'mobile_scaffold' || cat === 'mobile_scaffold_n3' ? cat : 'harness';
        return {
          id: i.id,
          type,
          label: i.harness_name || `#${i.id.slice(0, 8)}`,
          status: i.status,
          href: routes.inspections.detail(i.id),
          date: i.created_at ?? '',
        };
      }),
      ...(bobcatsQ.data ?? []).map((i) => ({
        id: i.id,
        type: 'bobcat',
        label: i.equipmentModel || i.company || `ციცხვიანი #${i.id.slice(0, 8)}`,
        status: i.status,
        href: routes.bobcat.detail(i.id),
        date: i.createdAt,
      })),
      ...(excavatorsQ.data ?? []).map((i) => ({
        id: i.id,
        type: 'excavator',
        label: `ექსკავატორი${i.serialNumber ? ` — ${i.serialNumber}` : ''}`,
        status: i.status,
        href: routes.excavator.detail(i.id),
        date: i.createdAt,
      })),
      ...(generalQ.data ?? []).map((i) => ({
        id: i.id,
        type: 'general',
        label: i.objectName || `ტექ. #${i.id.slice(0, 8)}`,
        status: i.status,
        href: routes.generalEquipment.detail(i.id),
        date: i.createdAt,
      })),
    ];
    return merged.sort((a, b) => b.date.localeCompare(a.date));
  }, [inspectionsQ.data, bobcatsQ.data, excavatorsQ.data, generalQ.data]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          შემოწმების აქტები
          <span className="ml-2 text-sm font-normal text-neutral-400">({items.length})</span>
        </CardTitle>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => onNew()}>
            <Plus size={14} className="mr-1" />
            ახალი
          </Button>
          {items.length > 5 && (
            <Link to={routes.inspections.list(projectId)} className="text-sm text-brand-600 hover:underline">
              ყველა →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-neutral-500 dark:text-neutral-400">აქტები ჯერ არ არის.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {items.slice(0, 5).map((i) => {
              const avatar = TYPE_AVATAR[i.type] ?? TYPE_AVATAR['harness'];
              return (
                <li key={i.id}>
                  <Link
                    to={i.href}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${avatar.bg}`}>
                      <span className="text-lg leading-none">{avatar.emoji}</span>
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-200">{i.label}</span>
                    <StatusBadge status={i.status} showIcon={false} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
