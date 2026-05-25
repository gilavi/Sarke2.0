/**
 * Web-side helpers around the shared document-naming module.
 *
 * The naming RULES live in the cross-platform source of truth at
 * `@root/lib/shared/documentName` (imported by both the Expo app and web).
 * This file only adds web-specific plumbing: a hook to resolve an inspection's
 * template name from the cached templates list, and constant type names for the
 * equipment inspections (which are stored in separate web tables with no
 * template_id, unlike the unified `inspections` table on mobile).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listTemplates } from '@/lib/data/templates';
import { templateKeys } from '@/app/queryKeys';
import { inspectionDisplayName } from '@root/lib/shared/documentName';

export {
  inspectionDisplayName,
  reportDisplayName,
  certificateDisplayName,
  orderDisplayName,
} from '@root/lib/shared/documentName';

/** Canonical names for equipment inspections (no template row on web). */
export const EQUIPMENT_INSPECTION_NAME: Record<string, string> = {
  bobcat: 'ციცხვიანი დამტვირთველის შემოწმების აქტი',
  excavator: 'ექსკავატორის ტექნიკური შემოწმების აქტი',
  general: 'ტექნიკური აღჭურვილობის შემოწმების აქტი',
  cargo_platform: 'ტვირთის მიმღები პლატფორმის შემოწმების აქტი',
};

/** Display name for an equipment inspection, by web row type. */
export function equipmentInspectionName(type: string): string {
  return inspectionDisplayName(EQUIPMENT_INSPECTION_NAME[type]);
}

/**
 * Returns a resolver `(templateId) => display name` backed by the cached
 * templates list. For generic inspections (harness / xaracho / scaffold) the
 * title is the template name; falls back to the generic Georgian label.
 */
export function useInspectionName(): (templateId?: string | null) => string {
  const { data } = useQuery({ queryKey: templateKeys.lists(), queryFn: listTemplates });
  return useMemo(() => {
    const byId = new Map((data ?? []).map((t) => [t.id, t.name]));
    return (templateId?: string | null) => inspectionDisplayName(templateId ? byId.get(templateId) : undefined);
  }, [data]);
}
