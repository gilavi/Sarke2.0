import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

import { supabase } from '@/lib/supabase';
import { makeRepository, mapDefined, NOT_AUTHENTICATED } from '@/lib/db/repository';
import { makeBuilder, authedUser } from '../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;
const getUser = supabase.auth.getUser as unknown as Mock;

interface Row {
  id: string;
  equipment_model: string;
  notes: string | null;
  project_id: string;
  created_at: string;
}
interface Model {
  id: string;
  equipmentModel: string;
  notes: string | null;
}
interface CreateInput {
  equipmentModel: string;
}
interface Patch {
  equipmentModel?: string;
  notes?: string | null;
}

const baseCfg = {
  table: 'widgets',
  columns: 'id, equipment_model, notes, project_id, created_at',
  toModel: (r: Row): Model => ({ id: r.id, equipmentModel: r.equipment_model, notes: r.notes }),
  toInsert: (input: CreateInput, userId: string) => ({
    equipment_model: input.equipmentModel,
    user_id: userId,
  }),
  toUpdate: (p: Patch) => mapDefined(p, { equipmentModel: 'equipment_model', notes: 'notes' }),
};

const row = (over: Partial<Row> = {}): Row => ({
  id: 'w1',
  equipment_model: 'Bobcat',
  notes: null,
  project_id: 'p1',
  created_at: '2026-01-01T00:00:00Z',
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('mapDefined', () => {
  it('copies defined values under their mapped column names', () => {
    expect(mapDefined({ equipmentModel: 'X', notes: 'n' }, { equipmentModel: 'equipment_model', notes: 'notes' }))
      .toEqual({ equipment_model: 'X', notes: 'n' });
  });

  it('skips undefined values but keeps explicit null', () => {
    expect(mapDefined({ equipmentModel: undefined, notes: null }, { equipmentModel: 'equipment_model', notes: 'notes' }))
      .toEqual({ notes: null });
  });

  it('ignores keys absent from the map', () => {
    expect(mapDefined({ equipmentModel: 'X', extra: 'y' } as Patch & { extra: string }, { equipmentModel: 'equipment_model' }))
      .toEqual({ equipment_model: 'X' });
  });

  it('returns an empty object for an empty patch', () => {
    expect(mapDefined({}, { equipmentModel: 'equipment_model' })).toEqual({});
  });
});

describe('makeRepository.list', () => {
  it('maps rows and applies default order + limit, with no project filter', async () => {
    const b = makeBuilder({ data: [row(), row({ id: 'w2' })], error: null });
    from.mockReturnValue(b);

    const repo = makeRepository<Model, Row, CreateInput, Patch>(baseCfg);
    const result = await repo.list();

    expect(result).toEqual([
      { id: 'w1', equipmentModel: 'Bobcat', notes: null },
      { id: 'w2', equipmentModel: 'Bobcat', notes: null },
    ]);
    expect(from).toHaveBeenCalledWith('widgets');
    expect(b.select).toHaveBeenCalledWith(baseCfg.columns);
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(b.limit).toHaveBeenCalledWith(50);
    expect(b.eq).not.toHaveBeenCalled();
  });

  it('filters by project_id when a projectId is passed', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await makeRepository<Model, Row, CreateInput, Patch>(baseCfg).list('p1');
    expect(b.eq).toHaveBeenCalledWith('project_id', 'p1');
  });

  it('returns [] when data is null', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await makeRepository<Model, Row, CreateInput, Patch>(baseCfg).list()).toEqual([]);
  });

  it('throws the error message on failure', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(makeRepository<Model, Row, CreateInput, Patch>(baseCfg).list()).rejects.toThrow('boom');
  });

  it('honors config overrides (no limit, ascending, custom columns)', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    const repo = makeRepository<Model, Row, CreateInput, Patch>({
      ...baseCfg,
      orderColumn: 'name',
      orderAscending: true,
      listLimit: null,
      projectColumn: 'owner_id',
    });
    await repo.list('p9');
    expect(b.order).toHaveBeenCalledWith('name', { ascending: true });
    expect(b.limit).not.toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('owner_id', 'p9');
  });
});

describe('makeRepository.get', () => {
  it('returns the mapped model via maybeSingle', async () => {
    const b = makeBuilder({ data: row(), error: null });
    from.mockReturnValue(b);
    const result = await makeRepository<Model, Row, CreateInput, Patch>(baseCfg).get('w1');
    expect(result).toEqual({ id: 'w1', equipmentModel: 'Bobcat', notes: null });
    expect(b.eq).toHaveBeenCalledWith('id', 'w1');
    expect(b.maybeSingle).toHaveBeenCalled();
  });

  it('returns null when no row is found', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await makeRepository<Model, Row, CreateInput, Patch>(baseCfg).get('nope')).toBeNull();
  });

  it('throws on error', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'bad' } }));
    await expect(makeRepository<Model, Row, CreateInput, Patch>(baseCfg).get('w1')).rejects.toThrow('bad');
  });
});

describe('makeRepository.create', () => {
  it('inserts the mapped payload with the authenticated user id', async () => {
    getUser.mockResolvedValue(authedUser('user-9'));
    const b = makeBuilder({ data: row({ id: 'new' }), error: null });
    from.mockReturnValue(b);

    const result = await makeRepository<Model, Row, CreateInput, Patch>(baseCfg).create({ equipmentModel: 'CAT' });

    expect(b.insert).toHaveBeenCalledWith({ equipment_model: 'CAT', user_id: 'user-9' });
    expect(result.id).toBe('new');
  });

  it('throws NOT_AUTHENTICATED when there is no user', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(makeRepository<Model, Row, CreateInput, Patch>(baseCfg).create({ equipmentModel: 'CAT' }))
      .rejects.toThrow(NOT_AUTHENTICATED);
  });

  it('throws the auth error when getUser fails', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('auth down') });
    await expect(makeRepository<Model, Row, CreateInput, Patch>(baseCfg).create({ equipmentModel: 'CAT' }))
      .rejects.toThrow('auth down');
  });

  it('throws the insert error message', async () => {
    getUser.mockResolvedValue(authedUser());
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'insert failed' } }));
    await expect(makeRepository<Model, Row, CreateInput, Patch>(baseCfg).create({ equipmentModel: 'CAT' }))
      .rejects.toThrow('insert failed');
  });
});

describe('makeRepository.update', () => {
  it('is a no-op (no Supabase call) when the patch maps to nothing', async () => {
    await makeRepository<Model, Row, CreateInput, Patch>(baseCfg).update('w1', {});
    expect(from).not.toHaveBeenCalled();
  });

  it('updates the mapped columns scoped by id', async () => {
    const b = makeBuilder({ data: null, error: null });
    from.mockReturnValue(b);
    await makeRepository<Model, Row, CreateInput, Patch>(baseCfg).update('w1', { notes: 'hi' });
    expect(b.update).toHaveBeenCalledWith({ notes: 'hi' });
    expect(b.eq).toHaveBeenCalledWith('id', 'w1');
  });

  it('throws the error message', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'update failed' } }));
    await expect(makeRepository<Model, Row, CreateInput, Patch>(baseCfg).update('w1', { notes: 'x' }))
      .rejects.toThrow('update failed');
  });
});

describe('makeRepository.remove', () => {
  it('deletes scoped by id', async () => {
    const b = makeBuilder({ data: null, error: null });
    from.mockReturnValue(b);
    await makeRepository<Model, Row, CreateInput, Patch>(baseCfg).remove('w1');
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 'w1');
  });

  it('throws the error message', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'delete failed' } }));
    await expect(makeRepository<Model, Row, CreateInput, Patch>(baseCfg).remove('w1')).rejects.toThrow('delete failed');
  });
});
