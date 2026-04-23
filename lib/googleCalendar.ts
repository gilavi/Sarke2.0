// Google Calendar integration — OAuth via expo-auth-session, tokens in SecureStore.
// Independent of Supabase auth; uses the Calendar events scope directly.
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { schedulesApi } from './services';
import type { ScheduleWithItem } from '../types/models';

const TOKEN_KEY = 'sarke.google.accessToken';
const REFRESH_KEY = 'sarke.google.refreshToken';
const EXPIRY_KEY = 'sarke.google.expiresAt';
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function getClientId(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  if (Platform.OS === 'ios') return (extra.googleIosClientId as string) ?? null;
  if (Platform.OS === 'android') return (extra.googleAndroidClientId as string) ?? null;
  return (extra.googleWebClientId as string) ?? null;
}

const redirectUri = AuthSession.makeRedirectUri({ scheme: 'sarke', path: 'auth/google' });

async function saveTokens(access: string, refresh: string | null, expiresInSec: number) {
  await SecureStore.setItemAsync(TOKEN_KEY, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  const expiresAt = Date.now() + (expiresInSec - 60) * 1000;
  await SecureStore.setItemAsync(EXPIRY_KEY, String(expiresAt));
}

async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(EXPIRY_KEY),
  ]);
}

async function refreshAccessToken(): Promise<string | null> {
  const clientId = getClientId();
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!clientId || !refresh) return null;
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refresh,
    grant_type: 'refresh_token',
  }).toString();
  const res = await fetch(discovery.tokenEndpoint!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    await clearTokens();
    return null;
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  await saveTokens(json.access_token, json.refresh_token ?? null, json.expires_in);
  return json.access_token;
}

async function getValidAccessToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const expiresAtStr = await SecureStore.getItemAsync(EXPIRY_KEY);
  if (token && expiresAtStr && Date.now() < Number(expiresAtStr)) return token;
  return refreshAccessToken();
}

async function authed<T>(path: string, init: RequestInit): Promise<T> {
  let token = await getValidAccessToken();
  if (!token) throw new Error('Google კალენდართან კავშირი არ არის');
  const doFetch = async (bearer: string) =>
    fetch(`https://www.googleapis.com/calendar/v3${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
    });
  let res = await doFetch(token);
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) throw new Error('Google სესია ამოიწურა — შეაერთე თავიდან');
    res = await doFetch(refreshed);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Google API: ${res.status} ${txt.slice(0, 120)}`);
  }
  // DELETE returns 204 with empty body
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

function allDayIsoDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export const googleCalendar = {
  async isConnected(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return !!token;
  },

  async connect(): Promise<void> {
    const clientId = getClientId();
    if (!clientId) {
      throw new Error('Google Client ID არ არის კონფიგურირებული');
    }
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: { access_type: 'offline', prompt: 'consent' },
    });
    const result = await request.promptAsync(discovery);
    if (result.type !== 'success' || !result.params.code) {
      throw new Error('Google-ის შეერთება გაუქმდა');
    }
    const tokenRes = await AuthSession.exchangeCodeAsync(
      {
        clientId,
        code: result.params.code,
        redirectUri,
        extraParams: {
          code_verifier: request.codeVerifier ?? '',
        },
      },
      discovery,
    );
    await saveTokens(
      tokenRes.accessToken,
      tokenRes.refreshToken ?? null,
      tokenRes.expiresIn ?? 3600,
    );
  },

  async disconnect(): Promise<void> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      try {
        await fetch(`${discovery.revocationEndpoint}?token=${encodeURIComponent(token)}`, {
          method: 'POST',
        });
      } catch {
        // non-fatal
      }
    }
    await clearTokens();
  },

  /** Create (or update) an all-day reminder event for a schedule. Returns the event id. */
  async pushDueDate(schedule: ScheduleWithItem): Promise<string | null> {
    if (!schedule.next_due_at) return null;
    const itemName = schedule.project_items?.name ?? 'შემოწმება';
    const projectName = schedule.project_items?.projects?.name ?? '';
    const summary = `შემოწმება: ${projectName} — ${itemName}`;
    const startYmd = allDayIsoDate(schedule.next_due_at);
    const endYmd = addDaysYmd(startYmd, 1);
    const body = {
      summary,
      start: { date: startYmd },
      end: { date: endYmd },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 24 * 60 }],
      },
    };
    // Upsert: if we already have an event id, PATCH; else POST.
    let eventId = schedule.google_event_id;
    try {
      if (eventId) {
        await authed<unknown>(`/calendars/primary/events/${encodeURIComponent(eventId)}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        const created = await authed<{ id: string }>(`/calendars/primary/events`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        eventId = created.id;
        await schedulesApi.setGoogleEventId(schedule.id, eventId);
      }
    } catch (e) {
      // If the event was deleted on Google's side, retry with POST
      if (eventId) {
        const created = await authed<{ id: string }>(`/calendars/primary/events`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        eventId = created.id;
        await schedulesApi.setGoogleEventId(schedule.id, eventId);
      } else {
        throw e;
      }
    }
    return eventId;
  },

  async removeDueDate(schedule: ScheduleWithItem): Promise<void> {
    if (!schedule.google_event_id) return;
    try {
      await authed<unknown>(
        `/calendars/primary/events/${encodeURIComponent(schedule.google_event_id)}`,
        { method: 'DELETE' },
      );
    } catch {
      // non-fatal
    }
    await schedulesApi.setGoogleEventId(schedule.id, null);
  },

  /** Push every upcoming schedule missing a google_event_id. Returns the count pushed. */
  async pushAll(schedules: ScheduleWithItem[]): Promise<number> {
    const now = Date.now();
    const upcoming = schedules.filter(
      s => s.next_due_at && new Date(s.next_due_at).getTime() >= now - 24 * 60 * 60 * 1000,
    );
    let pushed = 0;
    for (const s of upcoming) {
      try {
        await googleCalendar.pushDueDate(s);
        pushed += 1;
        // polite throttle
        await new Promise(r => setTimeout(r, 120));
      } catch {
        // skip on per-event failure
      }
    }
    return pushed;
  },
};
