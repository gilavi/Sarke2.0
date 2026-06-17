/**
 * Equipment-inspection data modules (bobcat / excavator / general-equipment /
 * cargo-platform). All four are thin `makeRepository` configs, so these tests
 * drive the public exports to exercise each module's toInsert/toModel/toUpdate
 * mappers + the standalone catalog helpers. The generic CRUD plumbing itself is
 * covered by repository.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() }, rpc: vi.fn() },
}));

import { supabase } from '@/lib/supabase';
import { makeBuilder, authedUser } from '../../helpers/supabaseChain';

import {
  createBobcatInspection,
  updateBobcatInspection,
  listBobcatInspections,
  getBobcatInspection,
  deleteBobcatInspection,
  BOBCAT_ITEMS,
} from '@/lib/data/bobcat';
import {
  createExcavatorInspection,
  updateExcavatorInspection,
  listExcavatorInspections,
  getExcavatorInspection,
  ENGINE_ITEMS,
  MAINTENANCE_ITEMS,
  EXCAVATOR_TEMPLATE_ID,
  EXCAVATOR_VERDICT_LABEL,
} from '@/lib/data/excavator';
import {
  createGeneralEquipmentInspection,
  listGeneralEquipmentInspections,
  newEquipmentRow,
  GENERAL_EQUIPMENT_TEMPLATE_ID,
} from '@/lib/data/generalEquipment';
import {
  createCargoPlatformInspection,
  listCargoPlatformInspections,
  getCargoPlatformInspection,
  CP_ITEMS,
  CP_VERDICT_LABEL,
  CP_RESULT_LABEL,
  CP_SECTION_LABELS,
  cpTotalWeight,
  newCargoRow,
  CARGO_PLATFORM_TEMPLATE_ID,
} from '@/lib/data/cargoPlatform';

const from = supabase.from as unknown as Mock;
const getUser = supabase.auth.getUser as unknown as Mock;
const rpc = supabase.rpc as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue(authedUser('u1'));
  // Equipment types that opt into a parent inspections row (bobcat, safety-net)
  // call create_equipment_inspection before the type-table insert. Default ok.
  rpc.mockResolvedValue({ data: null, error: null });
});
afterEach(() => vi.restoreAllMocks());

describe('bobcat data module', () => {
  it('createBobcatInspection inserts a draft with an empty checklist', async () => {
    const b = makeBuilder({ data: { id: 'new' }, error: null });
    from.mockReturnValue(b);
    await createBobcatInspection({ projectId: 'p1', templateId: 'tpl' });
    const arg = b.insert.mock.calls[0][0] as { status: string; template_id: string; items: unknown[]; user_id: string };
    expect(from).toHaveBeenCalledWith('bobcat_inspections');
    expect(arg.status).toBe('draft');
    expect(arg.template_id).toBe('tpl');
    expect(arg.user_id).toBe('u1');
    expect(arg.items).toHaveLength(BOBCAT_ITEMS.length);
    // Round-trip: also creates the parent public.inspections row via the RPC,
    // tagging inspections.type so the unified mobile list dispatches correctly.
    expect(rpc).toHaveBeenCalledWith(
      'create_equipment_inspection',
      expect.objectContaining({ p_type: 'bobcat', p_project_id: 'p1', p_template_id: 'tpl' }),
    );
  });

  it('listBobcatInspections maps rows (items default to [])', async () => {
    const b = makeBuilder({ data: [{ id: 'i1', items: null, signatories: null, summary_photos: null }], error: null });
    from.mockReturnValue(b);
    const [m] = await listBobcatInspections('p1');
    expect(m.id).toBe('i1');
    expect(m.items).toEqual([]);
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(b.limit).toHaveBeenCalledWith(50);
    expect(b.eq).toHaveBeenCalledWith('project_id', 'p1');
  });

  it('getBobcatInspection returns null when missing', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await getBobcatInspection('nope')).toBeNull();
  });

  it('updateBobcatInspection maps a verdict patch (no completed_at)', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await updateBobcatInspection('i1', { verdict: 'approved', notes: 'ok' });
    expect(b.update).toHaveBeenCalledWith({ verdict: 'approved', notes: 'ok' });
  });

  it('updateBobcatInspection stamps completed_at when completing', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await updateBobcatInspection('i1', { status: 'completed' });
    const arg = b.update.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.status).toBe('completed');
    expect(arg.completed_at).toEqual(expect.any(String));
  });

  it('deleteBobcatInspection deletes by id', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await deleteBobcatInspection('i1');
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 'i1');
  });
});

describe('excavator data module', () => {
  it('createExcavatorInspection seeds the four checklists + maintenance', async () => {
    const b = makeBuilder({ data: { id: 'new' }, error: null });
    from.mockReturnValue(b);
    await createExcavatorInspection({ projectId: 'p1' });
    const arg = b.insert.mock.calls[0][0] as {
      template_id: string;
      engine_items: unknown[];
      maintenance_items: { answer: null; date: null }[];
    };
    expect(arg.template_id).toBe(EXCAVATOR_TEMPLATE_ID);
    expect(arg.engine_items).toHaveLength(ENGINE_ITEMS.length);
    expect(arg.maintenance_items).toHaveLength(MAINTENANCE_ITEMS.length);
    expect(arg.maintenance_items[0]).toMatchObject({ answer: null, date: null });
  });

  it('toModel forces registrationNumber to null and defaults arrays', async () => {
    from.mockReturnValue(makeBuilder({ data: { id: 'i1', engine_items: null, signatories: null }, error: null }));
    const m = await getExcavatorInspection('i1');
    expect(m?.registrationNumber).toBeNull();
    expect(m?.engineItems).toEqual([]);
  });

  it('listExcavatorInspections orders + limits', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listExcavatorInspections();
    expect(from).toHaveBeenCalledWith('excavator_inspections');
    expect(b.limit).toHaveBeenCalledWith(50);
  });

  it('updateExcavatorInspection maps motoHours → moto_hours', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await updateExcavatorInspection('i1', { motoHours: 1200 });
    expect(b.update).toHaveBeenCalledWith({ moto_hours: 1200 });
  });

  it('EXCAVATOR_VERDICT_LABEL is a non-empty label map', () => {
    expect(Object.keys(EXCAVATOR_VERDICT_LABEL).length).toBeGreaterThan(0);
  });
});

describe('general-equipment data module', () => {
  it('createGeneralEquipmentInspection inserts a draft with empty equipment', async () => {
    const b = makeBuilder({ data: { id: 'new' }, error: null });
    from.mockReturnValue(b);
    await createGeneralEquipmentInspection({ projectId: 'p1' });
    const arg = b.insert.mock.calls[0][0] as { template_id: string; equipment: unknown[] };
    expect(arg.template_id).toBe(GENERAL_EQUIPMENT_TEMPLATE_ID);
    expect(arg.equipment).toEqual([]);
  });

  it('listGeneralEquipmentInspections maps equipment default []', async () => {
    from.mockReturnValue(makeBuilder({ data: [{ id: 'i1', equipment: null }], error: null }));
    const [m] = await listGeneralEquipmentInspections();
    expect(m.equipment).toEqual([]);
  });

  it('newEquipmentRow returns a blank row with a string id', () => {
    const row = newEquipmentRow();
    expect(typeof row.id).toBe('string');
    expect(row).toMatchObject({ name: '', model: '', serialNumber: '', condition: null, note: '', photo_paths: [] });
  });
});

describe('cargo-platform data module', () => {
  it('createCargoPlatformInspection seeds items + empty cargo (no persisted signatures)', async () => {
    const b = makeBuilder({ data: { id: 'new' }, error: null });
    from.mockReturnValue(b);
    await createCargoPlatformInspection({ projectId: 'p1' });
    const arg = b.insert.mock.calls[0][0] as { template_id: string; cargo: unknown[]; items: unknown[]; signatures?: unknown[] };
    expect(arg.template_id).toBe(CARGO_PLATFORM_TEMPLATE_ID);
    expect(arg.cargo).toEqual([]);
    expect(arg.items).toHaveLength(CP_ITEMS.length);
    // Signatures are never persisted (regulatory) - not seeded on insert.
    expect(arg.signatures).toBeUndefined();
  });

  it('list is intentionally unlimited (no .limit call)', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listCargoPlatformInspections();
    expect(from).toHaveBeenCalledWith('cargo_platform_inspections');
    expect(b.limit).not.toHaveBeenCalled();
  });

  it('toModel coalesces nullable strings and seeds default items/signatures', async () => {
    from.mockReturnValue(makeBuilder({
      data: { id: 'i1', company: null, items: null, signatures: null, cargo: null },
      error: null,
    }));
    const m = await getCargoPlatformInspection('i1');
    expect(m?.company).toBe('');
    expect(m?.items).toHaveLength(CP_ITEMS.length);
    expect(m?.signatures).toHaveLength(2);
    expect(m?.cargo).toEqual([]);
  });

  it('cpTotalWeight sums total_weight_kg, treating null as 0', () => {
    expect(cpTotalWeight([
      newCargoRow(),
      { ...newCargoRow(), total_weight_kg: 100 },
      { ...newCargoRow(), total_weight_kg: 50 },
    ])).toBe(150);
  });

  it('exposes verdict / result / section label maps', () => {
    expect(CP_VERDICT_LABEL.approved).toContain('ექსპლუატაცია');
    expect(CP_RESULT_LABEL.good).toBe('ნორმაში');
    expect(Object.keys(CP_SECTION_LABELS)).toEqual(['A', 'B']);
  });
});
