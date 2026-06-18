import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import type {
  BreathalizerLog,
  BLEntry,
  BLResponsiblePerson,
  PoolPerson,
} from '../types/breathalyzerLog';
import { resultStatusFromValue } from '../types/breathalyzerLog';

// ── DB ↔ model ─────────────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  user_id: string;
  date: string;
  device_serial_number: string | null;
  entries: BLEntry[];
  responsible_person: BLResponsiblePerson;
  status: string;
  pdf_uri: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): BreathalizerLog {
  return {
    id: row.id,
    projectId: row.project_id,
    date: row.date,
    deviceSerialNumber: row.device_serial_number,
    entries: Array.isArray(row.entries) ? row.entries : [],
    responsiblePerson: row.responsible_person ?? { name: '', signature: null },
    status: row.status as BreathalizerLog['status'],
    pdfUri: row.pdf_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Breathalyzer log API ───────────────────────────────────────────────────────

export const breathalyzerLogApi = {
  create: async (args: {
    projectId: string;
    date: string;
    deviceSerialNumber?: string | null;
  }): Promise<BreathalizerLog> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('breathalyzer_logs')
      .insert({
        project_id: args.projectId,
        user_id: user.id,
        date: args.date,
        device_serial_number: args.deviceSerialNumber ?? null,
        entries: [],
        responsible_person: { name: '', signature: null },
        status: 'open',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  getById: async (id: string): Promise<BreathalizerLog | null> => {
    const { data, error } = await supabase
      .from('breathalyzer_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toModel(data as DbRow);
  },

  getByProjectAndDate: async (
    projectId: string,
    date: string,
  ): Promise<BreathalizerLog | null> => {
    const { data, error } = await supabase
      .from('breathalyzer_logs')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toModel(data as DbRow);
  },

  listByProject: async (projectId: string): Promise<BreathalizerLog[]> => {
    const { data, error } = await supabase
      .from('breathalyzer_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
  },

  patchEntries: async (id: string, entries: BLEntry[]): Promise<void> => {
    const { error } = await supabase
      .from('breathalyzer_logs')
      .update({ entries, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  patchDeviceSerial: async (
    id: string,
    deviceSerialNumber: string | null,
  ): Promise<void> => {
    const { error } = await supabase
      .from('breathalyzer_logs')
      .update({
        device_serial_number: deviceSerialNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  close: async (
    id: string,
    responsiblePerson: BLResponsiblePerson,
    pdfUri?: string | null,
  ): Promise<void> => {
    const { error } = await supabase
      .from('breathalyzer_logs')
      .update({
        status: 'closed',
        responsible_person: responsiblePerson,
        pdf_uri: pdfUri ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ── People pool (AsyncStorage, project-scoped) ─────────────────────────────────

function poolKey(projectId: string) {
  return `people_pool_${projectId}`;
}

export const peoplePoolApi = {
  load: async (projectId: string): Promise<PoolPerson[]> => {
    try {
      const raw = await AsyncStorage.getItem(poolKey(projectId));
      if (!raw) return [];
      return JSON.parse(raw) as PoolPerson[];
    } catch {
      return [];
    }
  },

  upsert: async (
    projectId: string,
    person: { name: string; position: string },
  ): Promise<void> => {
    try {
      const pool = await peoplePoolApi.load(projectId);
      const idx = pool.findIndex(
        p => p.name.toLowerCase() === person.name.trim().toLowerCase(),
      );
      if (idx >= 0) {
        pool[idx] = {
          ...pool[idx],
          position: person.position,
          lastTestedAt: new Date().toISOString(),
          testCount: pool[idx].testCount + 1,
        };
        // Move to front (most recently tested)
        const updated = pool.splice(idx, 1)[0];
        pool.unshift(updated);
      } else {
        pool.unshift({
          name: person.name.trim(),
          position: person.position,
          lastTestedAt: new Date().toISOString(),
          testCount: 1,
        });
      }
      await AsyncStorage.setItem(poolKey(projectId), JSON.stringify(pool));
    } catch {
      // Non-fatal - log quietly
    }
  },
};

/** Creates a new BLEntry with a unique id and computed resultStatus. */
export function makeBLEntry(
  args: Omit<BLEntry, 'id' | 'resultStatus'>,
): BLEntry {
  return {
    ...args,
    id: Crypto.randomUUID(),
    resultStatus: resultStatusFromValue(args.result),
  };
}
