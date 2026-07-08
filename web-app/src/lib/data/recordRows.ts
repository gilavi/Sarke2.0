/**
 * Merged inspection-act rows across EVERY act source — the single feed behind
 * Home (RecentRecordsFeed / DraftResumeCard), History and a project's
 * RecordsSection.
 *
 * Sources:
 *   (a) the generic `inspections` table (harness + scaffold acts), labeled via
 *       the cached template name (mirrors the old History label logic);
 *   (b) every structured act in STRUCTURED_ACT_LIST that is not
 *       `excludeFromList`, flattened via `actRows()`. Large-loader rows live in
 *       `bobcat_inspections` (split off by templateId, see below).
 */
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { listInspections, type Inspection } from '@/lib/data/inspections';
import { equipmentInspectionName, useInspectionName } from '@/lib/documentNames';
import {
  actRows,
  STRUCTURED_ACT_LIST,
  STRUCTURED_ACTS,
  type StructuredAct,
} from '@/features/inspections/structured/acts';
import { LARGE_LOADER_TEMPLATE_ID } from '@/lib/types/bobcat';
import { inspectionKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';

/** One act row in the merged cross-type feed (newest first). */
export interface ActRow {
  id: string;
  label: string;
  projectId: string | null;
  /** Structured-act registry key; null for generic (harness/scaffold) acts. */
  actKey: string | null;
  /** Display type (template category or act key) — feeds inspectionTypeMeta. */
  type: string;
  status: string;
  date: string;
  href: string;
}

const STALE_TIME = 5 * 60_000;

/** Acts queried as their own row source (large_loader is surfaced via bobcat). */
const LISTED_ACTS = STRUCTURED_ACT_LIST.filter((a) => !a.excludeFromList);

/**
 * Act key → legacy equipment type key. Keeps the labels (equipmentInspectionName)
 * and `type` values byte-identical to the pre-unification History rows for the
 * four original equipment tables.
 */
const LEGACY_EQUIPMENT_TYPE: Record<string, string> = {
  bobcat: 'bobcat',
  excavator: 'excavator',
  general_equipment: 'general',
  cargo_platform: 'cargo_platform',
};

interface StructuredItem {
  id: string;
  status: string;
  createdAt?: string;
  templateId?: string | null;
}

function toActRows(act: StructuredAct, items: StructuredItem[]): ActRow[] {
  const legacyType = LEGACY_EQUIPMENT_TYPE[act.key];
  return actRows(act, items).map((r) => ({
    id: r.id,
    label: legacyType ? equipmentInspectionName(legacyType) : r.label,
    projectId: r.projectId || null,
    actKey: r.actKey,
    type: legacyType ?? act.key,
    status: r.status,
    date: r.date,
    href: r.href,
  }));
}

function flattenAct(act: StructuredAct, items: StructuredItem[]): ActRow[] {
  if (act.key === 'bobcat') {
    // Large-loader rows share bobcat_inspections and are distinguished by the
    // row's templateId. NOTE: STRUCTURED_ACTS.large_loader.schema is the SHARED
    // bobcat PDF schema whose `templateId` is the bobcat seed UUID, so we match
    // against the canonical LARGE_LOADER_TEMPLATE_ID constant instead (the same
    // one that schema branches its catalog on).
    const largeLoader = STRUCTURED_ACTS.large_loader;
    const isLarge = (i: StructuredItem) => i.templateId === LARGE_LOADER_TEMPLATE_ID;
    return [
      ...toActRows(act, items.filter((i) => !isLarge(i))),
      ...(largeLoader ? toActRows(largeLoader, items.filter(isLarge)) : []),
    ];
  }
  return toActRows(act, items);
}

/**
 * Fetches every act source in parallel (React Query, 5-min staleTime) and
 * returns the merged rows sorted newest-first. Pass `projectId` to scope every
 * query to one project (project-scoped cache keys). No side effects beyond the
 * underlying Supabase list reads.
 */
export function useActRows(projectId?: string): {
  rows: ActRow[];
  isLoading: boolean;
  isError: boolean;
} {
  const inspectionName = useInspectionName();

  const generic = useQuery({
    queryKey: projectId ? inspectionKeys.list(projectId) : inspectionKeys.lists(),
    queryFn: () => listInspections(projectId),
    staleTime: STALE_TIME,
  });

  const structured = useQueries({
    queries: LISTED_ACTS.map((act) => ({
      // Same shape as <type>Keys.list(projectId) / <type>Keys.lists().
      queryKey: projectId ? [...act.descriptor.listKey(), projectId] : act.descriptor.listKey(),
      queryFn: () => act.descriptor.list(projectId) as Promise<StructuredItem[]>,
      staleTime: STALE_TIME,
    })),
    combine: (results) => ({
      rows: results.flatMap((r, idx) => flattenAct(LISTED_ACTS[idx], r.data ?? [])),
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
    }),
  });

  const rows = useMemo(() => {
    const genericRows: ActRow[] = (generic.data ?? []).map((i: Inspection) => {
      // The `inspections` table holds harness AND scaffold acts; the display
      // type comes off the joined `template:templates(category)`.
      const tmpl = (i as { template?: { category?: string | null }[] | null }).template;
      const cat = Array.isArray(tmpl) ? (tmpl[0]?.category ?? null) : null;
      return {
        id: i.id,
        label: inspectionName(i.template_id),
        projectId: i.project_id ?? null,
        actKey: null,
        type: cat ?? 'harness',
        status: i.status,
        date: i.created_at ?? '',
        href: routes.inspections.detail(i.id),
      };
    });
    return [...genericRows, ...structured.rows].sort((a, b) =>
      (b.date || '').localeCompare(a.date || ''),
    );
  }, [generic.data, structured.rows, inspectionName]);

  return {
    rows,
    isLoading: generic.isLoading || structured.isLoading,
    isError: generic.isError || structured.isError,
  };
}
