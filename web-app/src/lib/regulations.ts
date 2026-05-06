export interface Regulation {
  id: string;
  title: string;
  description: string;
  url: string;
}

export const REGULATIONS: Regulation[] = [
  {
    id: '4486188',
    title: 'შრომის უსაფრთხოების შესახებ (ორგანული კანონი)',
    description: 'ძირითადი ორგანული კანონი შრომის უსაფრთხოების სფეროში.',
    url: 'https://matsne.gov.ge/ka/document/view/4486188',
  },
  {
    id: '4103880',
    title: 'შრომის უსაფრთხოების შესახებ (კანონი)',
    description: 'შრომის უსაფრთხოების ზოგადი ნორმები და ვალდებულებები.',
    url: 'https://matsne.gov.ge/ka/document/view/4103880',
  },
  {
    id: '1155567',
    title: 'საქართველოს შრომის კოდექსი',
    description: 'შრომითი ურთიერთობების მარეგულირებელი კოდექსი.',
    url: 'https://matsne.gov.ge/ka/document/view/1155567',
  },
  {
    id: '5572284',
    title: 'სამუშაო სივრცის უსაფრთხოების ნიშნების ტექნიკური რეგლამენტი',
    description: 'უსაფრთხოების ნიშნების ფორმის, ფერისა და გამოყენების წესები.',
    url: 'https://matsne.gov.ge/ka/document/view/5572284',
  },
  {
    id: '4486188-scaffold',
    title: 'ფასადის ხარაჩოების ტექნიკური რეგლამენტი',
    description: 'ხარაჩოების აწყობის, ექსპლუატაციისა და დემონტაჟის ნორმები.',
    url: 'https://matsne.gov.ge/ka/document/view/4486188',
  },
];

const LAST_FETCH_KEY = 'regulations_last_fetch';
const DOC_DATE_KEY = (id: string) => `regulation_date_${id}`;
const DOC_SEEN_KEY = (id: string) => `regulation_seen_${id}`;
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface RegulationState {
  id: string;
  lastUpdated: string | null;
  isUpdated: boolean;
}

function parseAmendmentDate(html: string): string | null {
  const marker = html.indexOf('ბოლო ცვლილება');
  if (marker !== -1) {
    const window = html.slice(marker, marker + 400);
    const slash = window.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (slash) return `${slash[1]}/${slash[2]}/${slash[3]}`;
  }
  const all = html.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g);
  if (all && all.length) {
    const sorted = [...all].sort((a, b) => {
      const [da, ma, ya] = a.split('/').map(Number);
      const [db, mb, yb] = b.split('/').map(Number);
      return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    });
    return sorted[0];
  }
  return null;
}

async function fetchOne(reg: Regulation, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(reg.url, { signal });
    if (!res.ok) return null;
    return parseAmendmentDate(await res.text());
  } catch {
    return null;
  }
}

export function loadRegulationStates(): RegulationState[] {
  return REGULATIONS.map((r) => {
    const date = localStorage.getItem(DOC_DATE_KEY(r.id));
    const seen = localStorage.getItem(DOC_SEEN_KEY(r.id));
    return { id: r.id, lastUpdated: date, isUpdated: !!date && date !== seen };
  });
}

export function getLastFetchAt(): string | null {
  return localStorage.getItem(LAST_FETCH_KEY);
}

export async function maybeRefreshRegulations(
  force = false,
): Promise<{ states: RegulationState[]; lastFetch: string | null }> {
  const lastFetchRaw = localStorage.getItem(LAST_FETCH_KEY);
  const now = Date.now();
  const lastFetchMs = lastFetchRaw ? Date.parse(lastFetchRaw) : 0;
  const stale = !lastFetchRaw || now - lastFetchMs > REFRESH_INTERVAL_MS;

  if (!force && !stale) {
    return { states: loadRegulationStates(), lastFetch: lastFetchRaw };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const results = await Promise.allSettled(
      REGULATIONS.map((r) => fetchOne(r, controller.signal)),
    );

    let anySuccess = false;
    results.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value) {
        anySuccess = true;
        localStorage.setItem(DOC_DATE_KEY(REGULATIONS[i].id), res.value);
      }
    });

    if (anySuccess) {
      const stamp = new Date().toISOString();
      localStorage.setItem(LAST_FETCH_KEY, stamp);
    }

    return { states: loadRegulationStates(), lastFetch: localStorage.getItem(LAST_FETCH_KEY) };
  } finally {
    clearTimeout(timeout);
  }
}

export function markRegulationSeen(id: string): void {
  const date = localStorage.getItem(DOC_DATE_KEY(id));
  if (date) localStorage.setItem(DOC_SEEN_KEY(id), date);
}
