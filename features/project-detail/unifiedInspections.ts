// Cross-source inspection helpers for the project detail screen.
//
// The mobile app has ten parallel inspection tables (generic +
// per-equipment). The project detail screen merges them into one
// chronological list backed by this `UnifiedInspection` discriminated
// union. The same union drives swipe-delete: `deleteUnifiedInspection`
// dispatches to `deleteInspectionBySource` and then optimistically
// removes the row from the matching local list via the supplied
// setters.
//
// When adding a new equipment inspection type, all three of:
//   - the per-source useState in `useProjectDetailData`,
//   - the source branch in `buildUnifiedInspections`,
//   - the source branch in `deleteUnifiedInspection`,
// need a new entry.

import type { Questionnaire } from '../../types/models';
import { deleteInspectionBySource } from '../../lib/inspectionDelete';

export type UnifiedInspectionSource =
  | 'generic'
  | 'bobcat'
  | 'excavator'
  | 'general_equipment'
  | 'cargo_platform'
  | 'safety_net_inspection'
  | 'mobile_ladder_inspection'
  | 'fall_protection_inspection'
  | 'lifting_accessories_inspection'
  | 'forklift_inspection';

export type UnifiedInspection = {
  id: string;
  template_id: string;
  status: 'draft' | 'completed';
  created_at: string;
  source: UnifiedInspectionSource;
};

export function buildUnifiedInspections(args: {
  questionnaires: Questionnaire[];
  bobcatInspections: any[];
  excavatorInspections: any[];
  generalEquipmentInspections: any[];
  cpInspections: any[];
  snInspections: any[];
  mlInspections: any[];
  fpInspections: any[];
  laInspections: any[];
  fkInspections: any[];
}): UnifiedInspection[] {
  const {
    questionnaires, bobcatInspections, excavatorInspections,
    generalEquipmentInspections, cpInspections, snInspections,
    mlInspections, fpInspections, laInspections, fkInspections,
  } = args;

  const generic: UnifiedInspection[] = questionnaires.map(q => ({
    id: q.id,
    template_id: q.template_id,
    status: q.status,
    created_at: q.created_at,
    source: 'generic',
  }));
  const bobcat: UnifiedInspection[] = bobcatInspections.map(b => ({
    id: b.id,
    template_id: b.templateId,
    status: b.status,
    created_at: b.createdAt,
    source: 'bobcat',
  }));
  const excavator: UnifiedInspection[] = excavatorInspections.map(e => ({
    id: e.id,
    template_id: e.templateId,
    status: e.status,
    created_at: e.createdAt,
    source: 'excavator',
  }));
  const ge: UnifiedInspection[] = generalEquipmentInspections.map(g => ({
    id: g.id,
    template_id: g.templateId,
    status: g.status,
    created_at: g.createdAt,
    source: 'general_equipment' as const,
  }));
  const cp: UnifiedInspection[] = cpInspections.map(c => ({
    id: c.id,
    template_id: c.templateId,
    status: c.status,
    created_at: c.createdAt,
    source: 'cargo_platform' as const,
  }));
  const sn: UnifiedInspection[] = snInspections.map(s => ({
    id: s.id,
    template_id: s.templateId,
    status: s.status,
    created_at: s.createdAt,
    source: 'safety_net_inspection' as const,
  }));
  const ml: UnifiedInspection[] = mlInspections.map(m => ({
    id: m.id,
    template_id: m.templateId,
    status: m.status,
    created_at: m.createdAt,
    source: 'mobile_ladder_inspection' as const,
  }));
  const fp: UnifiedInspection[] = fpInspections.map(f => ({
    id: f.id,
    template_id: f.templateId,
    status: f.status,
    created_at: f.createdAt,
    source: 'fall_protection_inspection' as const,
  }));
  const la: UnifiedInspection[] = laInspections.map(l => ({
    id: l.id,
    template_id: l.templateId,
    status: l.status,
    created_at: l.createdAt,
    source: 'lifting_accessories_inspection' as const,
  }));
  const fk: UnifiedInspection[] = fkInspections.map(f => ({
    id: f.id,
    template_id: f.templateId,
    status: f.status,
    created_at: f.createdAt,
    source: 'forklift_inspection' as const,
  }));
  return [...generic, ...bobcat, ...excavator, ...ge, ...cp, ...sn, ...ml, ...fp, ...la, ...fk].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
}

type Setter<T> = (updater: (prev: T[]) => T[]) => void;

export type UnifiedSetters = {
  setBobcatInspections: Setter<any>;
  setExcavatorInspections: Setter<any>;
  setGeneralEquipmentInspections: Setter<any>;
  setCpInspections: Setter<any>;
  setSnInspections: Setter<any>;
  setMlInspections: Setter<any>;
  setFpInspections: Setter<any>;
  setLaInspections: Setter<any>;
  setFkInspections: Setter<any>;
  setQuestionnaires: Setter<Questionnaire>;
};

/**
 * Performs the delete against the source-specific API, then optimistically
 * removes the row from the matching local list via the supplied setter.
 * Throws on API error so the caller can show a toast and avoid mutating
 * local state if the delete failed.
 */
export async function deleteUnifiedInspection(
  item: UnifiedInspection,
  setters: UnifiedSetters,
): Promise<void> {
  await deleteInspectionBySource(item.source, item.id);
  switch (item.source) {
    case 'bobcat': setters.setBobcatInspections(prev => prev.filter(x => x.id !== item.id)); break;
    case 'excavator': setters.setExcavatorInspections(prev => prev.filter(x => x.id !== item.id)); break;
    case 'general_equipment': setters.setGeneralEquipmentInspections(prev => prev.filter(x => x.id !== item.id)); break;
    case 'cargo_platform': setters.setCpInspections(prev => prev.filter(x => x.id !== item.id)); break;
    case 'safety_net_inspection': setters.setSnInspections(prev => prev.filter(x => x.id !== item.id)); break;
    case 'mobile_ladder_inspection': setters.setMlInspections(prev => prev.filter(x => x.id !== item.id)); break;
    case 'fall_protection_inspection': setters.setFpInspections(prev => prev.filter(x => x.id !== item.id)); break;
    case 'lifting_accessories_inspection': setters.setLaInspections(prev => prev.filter(x => x.id !== item.id)); break;
    case 'forklift_inspection': setters.setFkInspections(prev => prev.filter(x => x.id !== item.id)); break;
    default: setters.setQuestionnaires(prev => prev.filter(x => x.id !== item.id));
  }
}
