import { makeRepository } from '@/lib/db/repository';

export {
  FALL_PROTECTION_TEMPLATE_ID,
  FP_CHECKLIST_ITEMS,
  FP_RESULT_TO_CHIP,
  FP_VERDICT_LABELS,
  buildDefaultFPItems,
  type FPResult,
  type FPVerdict,
  type FPItemState,
  type FallProtectionInspection,
} from '@/lib/types/fallProtection';

import {
  FALL_PROTECTION_TEMPLATE_ID,
  buildDefaultFPItems,
  type FPItemState,
  type FPVerdict,
  type FallProtectionInspection,
} from '@/lib/types/fallProtection';

/**
 * The `fall_protection_inspections` table stores a variable `devices` jsonb array
 * + parallel `device_data` jsonb array (one entry per device, each carrying its
 * own checklist/verdict). The web wizard works with a SINGLE device, so this
 * layer packs/unpacks `device_data[0]`. Mobile reads the same shape.
 *
 * Regulatory: signatures are never persisted; the table has no signature column
 * we write to here.
 */
interface FPDeviceRow {
  id: string;
  type: string;
  location: string;
  floor: string;
  purpose: string;
  comment: string;
}
interface FPDeviceData {
  deviceId: string;
  items: FPItemState[];
  customItem: { label: string; result: FPResult | null; comment: string | null; photo_paths: string[] };
  verdict: FPVerdict | null;
  verdictComment: string;
  photoPaths: string[];
}
type FPResult = FPItemState['result'];

interface DbRow {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: 'draft' | 'completed';
  company: string | null;
  address: string | null;
  inspection_date: string;
  safety_leader_name: string | null;
  safety_leader_phone: string | null;
  devices: FPDeviceRow[] | null;
  device_data: FPDeviceData[] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, company, address, inspection_date, safety_leader_name, safety_leader_phone, devices, device_data, completed_at, created_at, updated_at';

function newDevice(): FPDeviceRow {
  return { id: 'N1', type: '', location: '', floor: '', purpose: '', comment: '' };
}
function newDeviceData(): FPDeviceData {
  return {
    deviceId: 'N1',
    items: buildDefaultFPItems(),
    customItem: { label: 'სხვა', result: null, comment: null, photo_paths: [] },
    verdict: null,
    verdictComment: '',
    photoPaths: [],
  };
}

function toModel(r: DbRow): FallProtectionInspection {
  const dev = r.devices?.[0];
  const data = r.device_data?.[0];
  return {
    id: r.id,
    projectId: r.project_id,
    templateId: r.template_id,
    userId: r.user_id,
    status: r.status,
    company: r.company ?? '',
    address: r.address ?? '',
    inspectionDate: r.inspection_date,
    safetyLeaderName: r.safety_leader_name ?? '',
    safetyLeaderPhone: r.safety_leader_phone ?? '',
    deviceType: dev?.type ?? '',
    deviceLocation: dev?.location ?? '',
    items: data?.items ?? buildDefaultFPItems(),
    verdict: data?.verdict ?? null,
    verdictComment: data?.verdictComment ?? '',
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface CreateFallProtectionArgs {
  projectId: string;
  templateId?: string;
  company?: string | null;
  address?: string | null;
  safetyLeaderName?: string | null;
  inspectionDate?: string | null;
}

export type FallProtectionPatch = Partial<{
  company: string | null;
  address: string | null;
  safetyLeaderName: string | null;
  safetyLeaderPhone: string | null;
  inspectionDate: string | null;
  deviceType: string | null;
  deviceLocation: string | null;
  items: FPItemState[];
  verdict: FPVerdict | null;
  verdictComment: string | null;
  status: 'draft' | 'completed';
}>;

/**
 * Build the update payload, packing single-device fields back into the
 * `devices` / `device_data` jsonb arrays. Reads `current` (last toModel) is not
 * available here, so item/verdict patches rebuild a full single-element array.
 */
function toUpdate(patch: FallProtectionPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.company !== undefined) row.company = patch.company;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.safetyLeaderName !== undefined) row.safety_leader_name = patch.safetyLeaderName;
  if (patch.safetyLeaderPhone !== undefined) row.safety_leader_phone = patch.safetyLeaderPhone;
  if (patch.inspectionDate !== undefined) row.inspection_date = patch.inspectionDate;

  if (patch.deviceType !== undefined || patch.deviceLocation !== undefined) {
    const dev = newDevice();
    if (patch.deviceType !== undefined) dev.type = patch.deviceType ?? '';
    if (patch.deviceLocation !== undefined) dev.location = patch.deviceLocation ?? '';
    row.devices = [dev];
  }
  if (patch.items !== undefined || patch.verdict !== undefined || patch.verdictComment !== undefined) {
    const data = newDeviceData();
    if (patch.items !== undefined) data.items = patch.items;
    if (patch.verdict !== undefined) data.verdict = patch.verdict;
    if (patch.verdictComment !== undefined) data.verdictComment = patch.verdictComment ?? '';
    row.device_data = [data];
  }
  if (patch.status !== undefined) {
    row.status = patch.status;
    if (patch.status === 'completed') row.completed_at = new Date().toISOString();
  }
  return row;
}

const repo = makeRepository<FallProtectionInspection, DbRow, CreateFallProtectionArgs, FallProtectionPatch>({
  table: 'fall_protection_inspections',
  columns: COLS,
  parentInspection: { type: 'fall_protection_inspection' },
  toModel,
  toInsert: (args, userId) => ({
    project_id: args.projectId,
    template_id: args.templateId ?? FALL_PROTECTION_TEMPLATE_ID,
    user_id: userId,
    status: 'draft',
    company: args.company ?? null,
    address: args.address ?? null,
    safety_leader_name: args.safetyLeaderName ?? null,
    ...(args.inspectionDate ? { inspection_date: args.inspectionDate } : {}),
    devices: [newDevice()],
    device_data: [newDeviceData()],
  }),
  toUpdate,
});

export const listFallProtectionInspections = (projectId?: string): Promise<FallProtectionInspection[]> =>
  repo.list(projectId);
export const getFallProtectionInspection = (id: string): Promise<FallProtectionInspection | null> =>
  repo.get(id);
export const createFallProtectionInspection = (
  args: CreateFallProtectionArgs,
): Promise<FallProtectionInspection> => repo.create(args);
export const updateFallProtectionInspection = (id: string, patch: FallProtectionPatch): Promise<void> =>
  repo.update(id, patch);
export const deleteFallProtectionInspection = (id: string): Promise<void> => repo.remove(id);
