import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { EmptyState, SectionHeader, listShellClass, rowClass } from './_shared';

interface Props {
  projectId: string;
  onNew: () => void;
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
      ...(inspectionsQ.data ?? []).map((i) => ({
        id: i.id,
        label: i.harness_name || `#${i.id.slice(0, 8)}`,
        status: i.status,
        href: routes.inspections.detail(i.id),
        date: i.created_at ?? '',
      })),
      ...(bobcatsQ.data ?? []).map((i) => ({
        id: i.id,
        label: i.equipmentModel || i.company || `ციცხვიანი #${i.id.slice(0, 8)}`,
        status: i.status,
        href: routes.bobcat.detail(i.id),
        date: i.createdAt,
      })),
      ...(excavatorsQ.data ?? []).map((i) => ({
        id: i.id,
        label: `ექსკავატორი${i.serialNumber ? ` — ${i.serialNumber}` : ''}`,
        status: i.status,
        href: routes.excavator.detail(i.id),
        date: i.createdAt,
      })),
      ...(generalQ.data ?? []).map((i) => ({
        id: i.id,
        label: i.objectName || `ტექ. #${i.id.slice(0, 8)}`,
        status: i.status,
        href: routes.generalEquipment.detail(i.id),
        date: i.createdAt,
      })),
    ];
    return merged.sort((a, b) => b.date.localeCompare(a.date));
  }, [inspectionsQ.data, bobcatsQ.data, excavatorsQ.data, generalQ.data]);

  return (
    <section>
      <SectionHeader
        title="შემოწმების აქტები"
        count={items.length}
        viewAllTo={items.length > 5 ? routes.inspections.list(projectId) : undefined}
        action={
          <Button variant="outline" size="sm" onClick={onNew}>
            <Plus size={14} className="mr-1" />
            ახალი
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState text="აქტები ჯერ არ არის." />
      ) : (
        <ul className={listShellClass}>
          {items.slice(0, 5).map((i) => (
            <li key={i.id}>
              <Link to={i.href} className={rowClass}>
                <span className="text-sm text-neutral-800">{i.label}</span>
                <StatusBadge status={i.status} showIcon={false} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
