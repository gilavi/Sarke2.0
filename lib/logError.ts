import AsyncStorage from '@react-native-async-storage/async-storage';

const BUFFER_KEY = '@errors:ring';
const MAX_ENTRIES = 50;

export type LoggedError = {
  ts: string;
  context: string;
  message: string;
  stack?: string;
};

/**
 * Convert anything thrown — Error, Supabase PostgrestError, OAuth error,
 * nested wrapper, plain string, unknown — into a stable message string.
 * Pass `fallback` to override the default Georgian "unknown error" string.
 */
export function toErrorMessage(e: unknown, fallback = 'უცნობი შეცდომა'): string {
  if (e == null) return fallback;
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === 'object') {
    const anyE = e as {
      message?: unknown;
      error_description?: unknown;
      details?: unknown;
      error?: unknown;
    };
    if (typeof anyE.message === 'string') return anyE.message;
    if (typeof anyE.error_description === 'string') return anyE.error_description;
    if (typeof anyE.details === 'string') return anyE.details;
    if (anyE.error != null) return toErrorMessage(anyE.error, fallback);
  }
  try {
    return JSON.stringify(e);
  } catch {
    return fallback;
  }
}

/**
 * Log an error: console.warn for the dev console + AsyncStorage ring buffer
 * for post-mortem inspection on user devices. Never throws.
 */
export function logError(err: unknown, context: string): void {
  const message = toErrorMessage(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.warn(`[${context}]`, message, stack ?? '');
  void appendToRing({ ts: new Date().toISOString(), context, message, stack });
}

async function appendToRing(entry: LoggedError): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    const list: LoggedError[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    while (list.length > MAX_ENTRIES) list.shift();
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(list));
  } catch {
    // Storage failure is itself non-fatal — don't recurse.
  }
}

export async function readErrorLog(): Promise<LoggedError[]> {
  try {
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    return raw ? (JSON.parse(raw) as LoggedError[]) : [];
  } catch {
    return [];
  }
}

export async function clearErrorLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BUFFER_KEY);
  } catch {
    /* noop */
  }
}
