import type { Change, Row } from './types';

const FN_URL =
  import.meta.env.VITE_CMS_FN_URL ??
  'https://seskuthiopywrgntsgfw.supabase.co/functions/v1/cms-texts';

const MOCK = import.meta.env.VITE_CMS_MOCK === '1';

export class AuthError extends Error {}
export class StaleError extends Error {} // unknown keys → the table changed under us

// ---- Mock backend (VITE_CMS_MOCK=1) — lets the UI be developed without the edge fn.
const mockRows: Row[] = [
  { key: 'common.save', en: 'Save', ka: 'შენახვა' },
  { key: 'common.cancel', en: 'Cancel', ka: 'გაუქმება' },
  { key: 'common.delete', en: 'Delete', ka: 'წაშლა' },
  { key: 'auth.login', en: 'Sign in', ka: 'შესვლა' },
  { key: 'auth.brand', en: 'Hubble', ka: 'Hubble' },
  { key: 'tabs.home', en: 'Home', ka: 'მთავარი' },
  { key: 'tabs.projects', en: 'Projects', ka: 'პროექტები' },
  { key: 'calendar.monthLabels.0', en: 'January', ka: 'იანვარი' },
  { key: 'calendar.monthLabels.1', en: 'February', ka: 'თებერვალი' },
  { key: 'errors.network', en: 'Network error. Try again.', ka: 'ქსელის შეცდომა. სცადეთ თავიდან.' },
  { key: 'pdf.limitReached', en: 'You have used {{used}} of {{limit}} PDFs', ka: 'გამოყენებულია {{used}} / {{limit}} PDF' },
  { key: 'home.greeting', en: 'Hello, {{name}}', ka: 'გამარჯობა, {{name}}' },
];

async function post(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthError('wrong password');
  if (res.status === 400 && (data as { error?: string }).error === 'unknown_keys') {
    throw new StaleError('keys changed');
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data;
}

/** Validate the password and return all rows. Throws AuthError on a bad password. */
export async function load(password: string): Promise<Row[]> {
  if (MOCK) {
    if (password !== 'test') throw new AuthError('wrong password');
    return structuredClone(mockRows);
  }
  const data = (await post({ action: 'load', password })) as { rows: Row[] };
  return data.rows;
}

/** Persist changed rows. Returns the number saved. */
export async function save(password: string, editor: string, changes: Change[]): Promise<number> {
  if (MOCK) {
    for (const c of changes) {
      const r = mockRows.find((m) => m.key === c.key);
      if (r) {
        r.en = c.en;
        r.ka = c.ka;
      }
    }
    return changes.length;
  }
  const data = (await post({ action: 'save', password, editor, changes })) as { saved: number };
  return data.saved;
}
