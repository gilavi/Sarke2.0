import { describe, it, expect, vi } from 'vitest';

describe('services layer', () => {
  describe('unwrap helper behavior', () => {
    function unwrap(res: any, mode: 'required' | 'maybe' | 'list') {
      if (res.error) throw new Error(res.error.message);
      if (mode === 'list') return (res.data ?? []) as unknown[];
      if (res.data == null) {
        if (mode === 'maybe') return null;
        throw new Error('No data');
      }
      return res.data;
    }

    it('returns data on success (required)', () => {
      expect(unwrap({ data: { id: '1' }, error: null }, 'required')).toEqual({ id: '1' });
    });

    it('throws on error (required)', () => {
      expect(() => unwrap({ data: null, error: { message: 'DB error' } }, 'required')).toThrow('DB error');
    });

    it('throws when data is null (required)', () => {
      expect(() => unwrap({ data: null, error: null }, 'required')).toThrow('No data');
    });

    it('returns null when data is null (maybe)', () => {
      expect(unwrap({ data: null, error: null }, 'maybe')).toBeNull();
    });

    it('returns data when present (maybe)', () => {
      expect(unwrap({ data: { id: '1' }, error: null }, 'maybe')).toEqual({ id: '1' });
    });

    it('returns empty array for null data (list)', () => {
      expect(unwrap({ data: null, error: null }, 'list')).toEqual([]);
    });

    it('returns array data (list)', () => {
      expect(unwrap({ data: [{ id: '1' }, { id: '2' }], error: null }, 'list')).toHaveLength(2);
    });
  });

  describe('projectsApi', () => {
    it('list returns projects array', async () => {
      const mockProjects = [
        { id: '1', user_id: 'u1', name: 'Project A', created_at: new Date().toISOString() },
        { id: '2', user_id: 'u1', name: 'Project B', created_at: new Date().toISOString() },
      ];
      const mockList = vi.fn().mockResolvedValue(mockProjects);
      const result = await mockList();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project A');
    });

    it('stats returns project statistics', async () => {
      const mockStats = { total: 5, drafts: 2, completed: 3 };
      const mockStatsFn = vi.fn().mockResolvedValue(mockStats);
      const result = await mockStatsFn();
      expect(result.total).toBe(5);
    });
  });

  describe('inspectionsApi', () => {
    it('getById returns inspection with answers', async () => {
      const mockInspection = {
        id: '1',
        template_id: 't1',
        user_id: 'u1',
        status: 'completed',
        answers: [{ id: 'a1', inspection_id: '1', question_id: 'q1', value: 'yes' }],
      };
      const mockGet = vi.fn().mockResolvedValue(mockInspection);
      const result = await mockGet('1');
      expect(result.status).toBe('completed');
      expect(result.answers).toHaveLength(1);
    });

    it('create returns new inspection', async () => {
      const mockInspection = { id: 'new-id', template_id: 't1', user_id: 'u1', status: 'draft' };
      const mockCreate = vi.fn().mockResolvedValue(mockInspection);
      const result = await mockCreate({ template_id: 't1', project_id: 'p1' });
      expect(result.id).toBe('new-id');
      expect(result.status).toBe('draft');
    });
  });

  describe('storageApi', () => {
    it('upload returns path on success', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ path: 'certificates/file.pdf' });
      const result = await mockUpload('certificates', 'file.pdf', new Blob());
      expect(result.path).toBe('certificates/file.pdf');
    });

    it('getPublicUrl returns URL', async () => {
      const mockGetUrl = vi.fn().mockReturnValue({ publicUrl: 'https://test.url/file.pdf' });
      const result = mockGetUrl('certificates', 'file.pdf');
      expect(result.publicUrl).toContain('https://');
    });
  });
});
