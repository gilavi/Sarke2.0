import { makeInspectionService } from './inspection/service';
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

function coerceDeviceData(devices: FPDeviceRow[], raw: unknown): FPDeviceData[] {
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

type FallProtectionPatch = Partial<{
  company: string;
  address: string;
  inspectionDate: string;
  safetyLeaderName: string;
  safetyLeaderPhone: string;
  inspectionType: FallProtectionInspection['inspectionType'];
  nextInspectionDate: string | null;
  devices: FPDeviceRow[];
  deviceData: FPDeviceData[];
}>;

function toDb(patch: FallProtectionPatch): Record<string, unknown> {
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
  return db;
}

// ── API ───────────────────────────────────────────────────────────────────────
// Note: this table has no inspector_name column (uses safety_leader_name), so
// createColumns intentionally omits it.

const base = makeInspectionService<FallProtectionInspection, FallProtectionPatch>({
  table: 'fall_protection_inspections',
  pathPrefix: 'fall-protection',
  toModel,
  toDb,
  createColumns: () => {
    const defaultDevices = [0, 1, 2].map(i => buildDefaultFPDeviceRow(i));
    return {
      devices: defaultDevices,
      device_data: defaultDevices.map(d => buildDefaultFPDeviceData(d.id)),
    };
  },
});

export const fallProtectionApi = {
  create: base.create,
  getById: base.getById,
  listByProject: base.listByProject,
  patch: base.patch,
  complete: base.complete,
  deletePhoto: base.deletePhoto,
  uploadPhoto: (inspectionId: string, deviceIdx: number, itemId: number, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/device-${deviceIdx}/${itemId}`, photoUri),
  uploadDevicePhoto: (inspectionId: string, deviceIdx: number, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/device-${deviceIdx}/summary`, photoUri),
};
