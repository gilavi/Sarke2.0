import { supabase } from './supabase';
import { questionnairesApi } from './services';

// Maps a unified-inspection `source` / `category` discriminator to its
// dedicated equipment table. Equipment inspections live in their own tables;
// everything else is a questionnaire row in `inspections`.
const SOURCE_TO_TABLE: Record<string, string> = {
  bobcat: 'bobcat_inspections',
  excavator: 'excavator_inspections',
  general_equipment: 'general_equipment_inspections',
  cargo_platform: 'cargo_platform_inspections',
  safety_net_inspection: 'safety_net_inspections',
  mobile_ladder_inspection: 'mobile_ladder_inspections',
  fall_protection_inspection: 'fall_protection_inspections',
  lifting_accessories_inspection: 'lifting_accessories_inspections',
  forklift_inspection: 'forklift_inspections',
};

/**
 * Delete an inspection row by its unified `source` / `category`. Centralizes
 * the per-table delete that was duplicated as raw `supabase.from(...).delete()`
 * switches in the project-detail and home screens. Throws on DB error so
 * callers can surface a failure toast.
 */
export async function deleteInspectionBySource(
  source: string | undefined,
  id: string,
): Promise<void> {
  const table = source ? SOURCE_TO_TABLE[source] : undefined;
  if (table) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  } else {
    await questionnairesApi.remove(id);
  }
}
