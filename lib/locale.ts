const KA = 'ka-GE';

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ახლა';
  if (m < 60) return `${m} წთ. წინ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} სთ. წინ`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} დღის წინ`;
  return formatShortDate(d);
}

export function formatDate(input: Date | string): string {
  const d = toDate(input);
  if (!d) return '';
  try {
    return d.toLocaleDateString(KA, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export function formatShortDate(input: Date | string): string {
  const d = toDate(input);
  if (!d) return '';
  try {
    return d.toLocaleDateString(KA, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function formatDateTime(input: Date | string): string {
  const d = toDate(input);
  if (!d) return '';
  try {
    return d.toLocaleString(KA, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function formatWeekdayLong(input: Date | string): string {
  const d = toDate(input);
  if (!d) return '';
  try {
    return d.toLocaleDateString(KA, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toDate(input: Date | string): Date | null {
  const d = typeof input === 'string' ? new Date(input) : input;
  return Number.isNaN(d.getTime()) ? null : d;
}
