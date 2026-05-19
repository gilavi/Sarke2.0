import { Link } from 'react-router-dom';
import type { IncidentType } from '@/lib/data/incidents';

export const INCIDENT_TYPE_COLOR: Record<IncidentType, string> = {
  minor: 'bg-yellow-100 text-yellow-800',
  severe: 'bg-orange-100 text-orange-800',
  fatal: 'bg-red-100 text-red-800',
  mass: 'bg-red-200 text-red-900',
  nearmiss: 'bg-violet-100 text-violet-700',
};

export const CREW_ROLE_LABEL: Record<string, string> = {
  expert: 'ექსპერტი',
  xaracho_supervisor: 'ხარაჩოს ხელმძღვანელი',
  xaracho_assembler: 'ხარაჩოს მამშენებელი',
  other: 'სხვა',
};

interface SectionHeaderProps {
  title: string;
  count: number;
  viewAllTo?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, count, viewAllTo, action }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg font-semibold text-neutral-900">
        {title}
        <span className="ml-2 text-sm font-normal text-neutral-400">({count})</span>
      </h2>
      <div className="flex items-center gap-3">
        {action}
        {viewAllTo && (
          <Link to={viewAllTo} className="text-sm text-brand-600 hover:underline">
            ყველა →
          </Link>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-neutral-500">{text}</p>;
}

export const listShellClass =
  'divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white';

export const rowClass =
  'flex items-center justify-between px-4 py-3 hover:bg-neutral-50';
