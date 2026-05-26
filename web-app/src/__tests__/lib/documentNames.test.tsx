import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/data/templates', () => ({ listTemplates: vi.fn() }));
import { listTemplates } from '@/lib/data/templates';
import type { Template } from '@/lib/data/templates';
import { equipmentInspectionName, EQUIPMENT_INSPECTION_NAME, useInspectionName } from '@/lib/documentNames';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const tpl = (over: Partial<Template>): Template => ({
  id: 't1',
  owner_id: null,
  name: 'ფასადის ხარაჩოს შემოწმების აქტი',
  category: null,
  is_system: true,
  required_signer_roles: [],
  created_at: '2026-01-01T00:00:00Z',
  ...over,
});

describe('equipmentInspectionName', () => {
  it('maps each equipment type to its short display name', () => {
    expect(equipmentInspectionName('bobcat')).toBe('ციცხვიანი დამტვირთველი');
    expect(equipmentInspectionName('excavator')).toBe('ექსკავატორი');
    expect(equipmentInspectionName('general')).toBe('ტექნიკური აღჭურვილობა');
    expect(equipmentInspectionName('cargo_platform')).toBe('ტვირთის მიმღები პლატფორმა');
  });

  it('falls back to the generic inspection name for unknown types', () => {
    expect(equipmentInspectionName('???')).toBe('შემოწმების აქტი');
  });

  it('EQUIPMENT_INSPECTION_NAME has the four equipment entries', () => {
    expect(Object.keys(EQUIPMENT_INSPECTION_NAME)).toEqual(['bobcat', 'excavator', 'general', 'cargo_platform']);
  });
});

describe('useInspectionName', () => {
  it('resolves a templateId to its short name once templates load', async () => {
    vi.mocked(listTemplates).mockResolvedValue([tpl({ id: 't1' })]);
    const { result } = renderHook(() => useInspectionName(), { wrapper });
    await waitFor(() => expect(result.current('t1')).toBe('ფასადის ხარაჩო'));
  });

  it('returns the generic fallback for an unknown templateId', () => {
    vi.mocked(listTemplates).mockResolvedValue([]);
    const { result } = renderHook(() => useInspectionName(), { wrapper });
    expect(result.current('zzz')).toBe('შემოწმების აქტი');
  });
});
