import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));
vi.mock('@/lib/db/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/storage')>();
  return { ...actual, removeObjects: vi.fn() };
});

import { supabase } from '@/lib/supabase';
import { removeObjects, STORAGE_BUCKETS } from '@/lib/db/storage';
import {
  listProjects,
  countProjects,
  getProject,
  createProject,
  updateProject,
  updateProjectLogo,
  deleteProject,
  setProjectCrew,
  addProjectSigner,
  listProjectSigners,
  deleteProjectSigner,
} from '@/lib/data/projects';
import { makeBuilder } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;

beforeEach(() => vi.clearAllMocks());

describe('listProjects', () => {
  it('orders by created_at desc, limits 50', async () => {
    const b = makeBuilder({ data: [{ id: 'p1' }], error: null });
    from.mockReturnValue(b);
    expect(await listProjects()).toEqual([{ id: 'p1' }]);
    expect(from).toHaveBeenCalledWith('projects');
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(b.limit).toHaveBeenCalledWith(50);
  });

  it('throws on error', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(listProjects()).rejects.toThrow('boom');
  });
});

describe('countProjects', () => {
  it('returns the exact head count, 0 when null', async () => {
    from.mockReturnValueOnce(makeBuilder({ count: 4, error: null }));
    expect(await countProjects()).toBe(4);
    from.mockReturnValueOnce(makeBuilder({ count: null, error: null }));
    expect(await countProjects()).toBe(0);
  });
});

describe('getProject', () => {
  it('returns the row, or null when missing', async () => {
    from.mockReturnValueOnce(makeBuilder({ data: { id: 'p1' }, error: null }));
    expect(await getProject('p1')).toEqual({ id: 'p1' });
    from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    expect(await getProject('nope')).toBeNull();
  });
});

describe('createProject', () => {
  it('inserts with null-coalesced geo and returns the row', async () => {
    const b = makeBuilder({ data: { id: 'new' }, error: null });
    from.mockReturnValue(b);
    const result = await createProject({
      userId: 'u1',
      name: 'პროექტი',
      companyName: 'კომპანია',
      address: null,
      contactPhone: null,
    });
    expect(b.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      name: 'პროექტი',
      company_name: 'კომპანია',
      address: null,
      contact_phone: null,
      latitude: null,
      longitude: null,
    });
    expect(result).toEqual({ id: 'new' });
  });
});

describe('updateProject / updateProjectLogo', () => {
  it('updateProject applies the patch scoped by id', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await updateProject('p1', { name: 'ახალი' });
    expect(b.update).toHaveBeenCalledWith({ name: 'ახალი' });
    expect(b.eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('updateProjectLogo sets the logo column', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await updateProjectLogo('p1', 'data:image/png;base64,AAA');
    expect(b.update).toHaveBeenCalledWith({ logo: 'data:image/png;base64,AAA' });
    expect(b.eq).toHaveBeenCalledWith('id', 'p1');
  });
});

describe('deleteProject', () => {
  it('removes orphan project-files blobs before deleting the row', async () => {
    const filesBuilder = makeBuilder({
      data: [{ storage_path: 'a' }, { storage_path: '' }, { storage_path: 'b' }],
      error: null,
    });
    const deleteBuilder = makeBuilder({ error: null });
    from.mockReturnValueOnce(filesBuilder).mockReturnValueOnce(deleteBuilder);

    await deleteProject('p1');

    expect(from).toHaveBeenNthCalledWith(1, 'project_files');
    expect(filesBuilder.eq).toHaveBeenCalledWith('project_id', 'p1');
    // falsy paths filtered out
    expect(removeObjects).toHaveBeenCalledWith(STORAGE_BUCKETS.projectFiles, ['a', 'b']);
    expect(from).toHaveBeenNthCalledWith(2, 'projects');
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('skips blob removal when the project has no files', async () => {
    from.mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ error: null }));
    await deleteProject('p1');
    expect(removeObjects).not.toHaveBeenCalled();
  });
});

describe('project signers + crew', () => {
  it('addProjectSigner inserts the signer with null-coalesced optionals', async () => {
    const b = makeBuilder({ data: { id: 's1' }, error: null });
    from.mockReturnValue(b);
    await addProjectSigner({ projectId: 'p1', fullName: 'სახელი' });
    expect(b.insert).toHaveBeenCalledWith({
      project_id: 'p1',
      full_name: 'სახელი',
      position: null,
      phone: null,
    });
  });

  it('listProjectSigners filters by project and orders ascending', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listProjectSigners('p1');
    expect(b.eq).toHaveBeenCalledWith('project_id', 'p1');
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('deleteProjectSigner deletes by id', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await deleteProjectSigner('s1');
    expect(b.eq).toHaveBeenCalledWith('id', 's1');
  });

  it('setProjectCrew writes the crew JSONB scoped by id', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    const crew = [{ id: 'c1', roleKey: 'foreman', name: 'ნ', role: 'ბრიგადირი', signature: null }];
    await setProjectCrew('p1', crew);
    expect(b.update).toHaveBeenCalledWith({ crew });
    expect(b.eq).toHaveBeenCalledWith('id', 'p1');
  });
});
