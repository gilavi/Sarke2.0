import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

import { supabase } from '@/lib/supabase';
import {
  listBriefings,
  getBriefing,
  TOPIC_LABELS,
  TOPIC_KEYS,
  topicLabel,
  deleteBriefing,
  updateBriefing,
  createBriefing,
} from '@/lib/data/briefings';
import { makeBuilder, authedUser, anonUser } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;
const getUser = supabase.auth.getUser as unknown as Mock;

const dbRow = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  project_id: 'p1',
  date_time: '2026-05-01T09:00:00Z',
  topics: ['ppe'],
  participants: [{ fullName: 'ნ. ნოზაძე' }],
  inspector_name: 'ინსპექტორი',
  status: 'draft',
  created_at: '2026-05-01T09:00:00Z',
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('topic labels', () => {
  it('exposes the known topic keys', () => {
    expect(TOPIC_KEYS).toEqual(Object.keys(TOPIC_LABELS));
    expect(TOPIC_LABELS.ppe).toBe('დამცავი აღჭურვილობა');
  });

  it('topicLabel resolves known, custom, and unknown topics', () => {
    expect(topicLabel('ppe')).toBe('დამცავი აღჭურვილობა');
    expect(topicLabel('custom:ჩემი თემა')).toBe('ჩემი თემა');
    expect(topicLabel('unknown_key')).toBe('unknown_key');
  });
});

describe('listBriefings', () => {
  it('maps rows and orders by date_time desc, limit 50', async () => {
    const b = makeBuilder({ data: [dbRow()], error: null });
    from.mockReturnValue(b);
    const [briefing] = await listBriefings('p1');
    expect(briefing).toEqual({
      id: 'b1',
      projectId: 'p1',
      dateTime: '2026-05-01T09:00:00Z',
      topics: ['ppe'],
      participants: [{ fullName: 'ნ. ნოზაძე' }],
      inspectorName: 'ინსპექტორი',
      status: 'draft',
      createdAt: '2026-05-01T09:00:00Z',
    });
    expect(b.order).toHaveBeenCalledWith('date_time', { ascending: false });
    expect(b.limit).toHaveBeenCalledWith(50);
    expect(b.eq).toHaveBeenCalledWith('project_id', 'p1');
  });

  it('defaults null topics/participants/inspector to empty values', async () => {
    from.mockReturnValue(makeBuilder({
      data: [dbRow({ topics: null, participants: null, inspector_name: null })],
      error: null,
    }));
    const [briefing] = await listBriefings();
    expect(briefing.topics).toEqual([]);
    expect(briefing.participants).toEqual([]);
    expect(briefing.inspectorName).toBe('');
  });
});

describe('getBriefing', () => {
  it('returns the mapped model or null', async () => {
    from.mockReturnValueOnce(makeBuilder({ data: dbRow(), error: null }));
    expect((await getBriefing('b1'))?.id).toBe('b1');
    from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    expect(await getBriefing('nope')).toBeNull();
  });
});

describe('updateBriefing', () => {
  it('maps only the provided keys to snake_case', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await updateBriefing('b1', { dateTime: 't', inspectorName: 'ი', status: 'completed' });
    expect(b.update).toHaveBeenCalledWith({ date_time: 't', inspector_name: 'ი', status: 'completed' });
    expect(b.eq).toHaveBeenCalledWith('id', 'b1');
  });

  it('issues an empty update for an empty patch', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await updateBriefing('b1', {});
    expect(b.update).toHaveBeenCalledWith({});
  });
});

describe('deleteBriefing', () => {
  it('deletes by id', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await deleteBriefing('b1');
    expect(b.eq).toHaveBeenCalledWith('id', 'b1');
  });
});

describe('createBriefing', () => {
  it('inserts a draft for the authenticated user and returns the model', async () => {
    getUser.mockResolvedValue(authedUser('u9'));
    const b = makeBuilder({ data: dbRow({ id: 'new' }), error: null });
    from.mockReturnValue(b);
    const result = await createBriefing({
      projectId: 'p1',
      dateTime: 't',
      topics: ['ppe'],
      participants: [],
      inspectorName: 'ი',
    });
    expect(b.insert).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: 'p1', user_id: 'u9', status: 'draft', inspector_name: 'ი' }),
    );
    expect(result.id).toBe('new');
  });

  it('throws when not signed in', async () => {
    getUser.mockResolvedValue(anonUser());
    await expect(
      createBriefing({ projectId: 'p1', dateTime: 't', topics: [], participants: [], inspectorName: 'ი' }),
    ).rejects.toThrow('არაავტორიზებული');
  });
});
