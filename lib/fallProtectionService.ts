import { supabase, STORAGE_BUCKETS } from './supabase';
import { storageApi } from './services';
import { logError } from './logError';
import * as Crypto from 'expo-crypto';
import type {
  FallProtectionInspection,
  FPDeviceRow,
  FPDeviceData,
} from '../types/fallProtection';
import {
  buildDefaultFPItems,
  buildDefaultFPCustomItem,
  buildDefaultFPSignatory,
  buildDefaultFPDeviceRow,
  buildDefaultFPDeviceData,
  syncDeviceData,
} from '../types/fallProtection';

// ── DB ↔ model mapping ────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: string;
  company: string | null;
  address: string | null;
  inspection_date: string;
  safety_leader_name: string | null;
  safety_leader_phone: string | null;
  inspection_type: string | null;
  next_inspection_date: string | null;
  devices: FPDeviceRow[];
  device_data: FPDeviceData[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function coerceDeviceData(
  devices: FPDeviceRow[],
  raw: unknown,
): FPDeviceData[] {
  const arr = Array.isArray(raw) ? raw : [];
  return syncDeviceData(
    devices,
    arr.map((d: any) => ({
      deviceId: d.deviceId ?? 'N1',
      items:
        Array.isArray(d.items) && d.items.length === 12
          ? d.items
          : buildDefaultFPItems(),
      customItem:
        d.customItem && typeof d.customItem === 'object'
          ? {
              label: d.customItem.label ?? 'სხვა',
              result: d.customItem.result ?? null,
              comment: d.customItem.comment ?? null,
              photo_paths: Array.isArray(d.customItem.photo_paths)
                ? d.customItem.photo_paths
                : [],
            }
          : buildDefaultFPCustomItem(),
      verdict: d.verdict ?? null,
      verdictComment: d.verdictComment ?? '',
      photoPaths: Array.isArray(d.photoPaths) ? d.photoPaths : [],
    })),
  );
}

function toModel(row: DbRow): FallProtectionInspection {
  const devices: FPDeviceRow[] = Array.isArray(row.devices)
    ? row.devices
    : [0, 1, 2].map(i => buildDefaultFPDeviceRow(i));

  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    userId: row.user_id,
    status: row.status as FallProtectionInspection['status'],
    company: row.company ?? '',
    address: row.address ?? '',
    inspectionDate: row.inspection_date,
    safetyLeaderName: row.safety_leader_name ?? '',
    safetyLeaderPhone: row.safety_leader_phone ?? '',
    inspectionType:
      (row.inspection_type as FallProtectionInspection['inspectionType']) ?? null,
    nextInspectionDate: row.next_inspection_date,
    devices,
    deviceData: coerceDeviceData(devices, row.device_data),
    signature: buildDefaultFPSignatory(),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const fallProtectionApi = {
  create: async (args: {
    projectId: string;
    templateId: string;
  }): Promise<FallProtectionInspection> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const defaultDevices = [0, 1, 2].map(i => buildDefaultFPDeviceRow(i));

    const { data, error } = await supabase
      .from('fall_protection_inspections')
      .insert({
        project_id: args.projectId,
        template_id: args.templateId,
        user_id: user.id,
        inspection_date: new Date().toISOString().slice(0, 10),
        devices: defaultDevices,
        device_data: defaultDevices.map(d => buildDefaultFPDeviceData(d.id)),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  getById: async (id: string): Promise<FallProtectionInspection | null> => {
    const { data, error } = await supabase
      .from('fall_protection_inspections')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toModel(data as DbRow);
  },

  patch: async (
    id: string,
    patch: Partial<{
      company: string;
      address: string;
      inspectionDate: string;
      safetyLeaderName: string;
      safetyLeaderPhone: string;
      inspectionType: FallProtectionInspection['inspectionType'];
      nextInspectionDate: string | null;
      devices: FPDeviceRow[];
      deviceData: FPDeviceData[];
    }>,
  ): Promise<void> => {
    const db: Record<string, unknown> = {};
    if ('company'             in patch) db.company              = patch.company;
    if ('address'             in patch) db.address              = patch.address;
    if ('inspectionDate'      in patch) db.inspection_date      = patch.inspectionDate;
    if ('safetyLeaderName'    in patch) db.safety_leader_name   = patch.safetyLeaderName;
    if ('safetyLeaderPhone'   in patch) db.safety_leader_phone  = patch.safetyLeaderPhone;
    if ('inspectionType'      in patch) db.inspection_type      = patch.inspectionType;
    if ('nextInspectionDate'  in patch) db.next_inspection_date = patch.nextInspectionDate;
    if ('devices'             in patch) db.devices              = patch.devices;
    if ('deviceData'          in patch) db.device_data          = patch.deviceData;

    if (Object.keys(db).length === 0) return;
    const { error } = await supabase
      .from('fall_protection_inspections')
      .update(db)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  complete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('fall_protection_inspections')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  listByProject: async (
    projectId: string,
  ): Promise<FallProtectionInspection[]> => {
    const { data, error } = await supabase
      .from('fall_protection_inspections')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
  },

  /**
   * Uploads a checklist item photo for a device.
   * @param deviceIdx  0-based index of the device in the devices array
   * @param itemId     checklist item id (1–12) or 0 for the custom item
   * @returns storage path in the answer-photos bucket
   */
  uploadPhoto: async (
    inspectionId: string,
    deviceIdx: number,
    itemId: number,
    photoUri: string,
  ): Promise<string> => {
    const uuid = Crypto.randomUUID();
    const path = `fall-protection/${inspectionId}/device-${deviceIdx}/${itemId}/${uuid}.jpg`;
    await storageApi.uploadFromUri(
      STORAGE_BUCKETS.answerPhotos,
      path,
      photoUri,
      'image/jpeg',
      'inspection',
    );
    return path;
  },

  /**
   * Uploads a device-level summary photo.
   * @param deviceIdx  0-based index of the device
   */
  uploadDevicePhoto: async (
    inspectionId: string,
    deviceIdx: number,
    photoUri: string,
  ): Promise<string> => {
    const uuid = Crypto.randomUUID();
    const path = `fall-protection/${inspectionId}/device-${deviceIdx}/summary/${uuid}.jpg`;
    await storageApi.uploadFromUri(
      STORAGE_BUCKETS.answerPhotos,
      path,
      photoUri,
      'image/jpeg',
      'inspection',
    );
    return path;
  },

  deletePhoto: async (path: string): Promise<void> => {
    await storageApi
      .remove(STORAGE_BUCKETS.answerPhotos, path)
      .catch(e => logError(e, 'fallProtection.deletePhoto'));
  },
};
