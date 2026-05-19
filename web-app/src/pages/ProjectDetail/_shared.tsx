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
