// entity → create/update dispatch for record_save / pdf_upload replay.
// Payloads are the exact service-call args (JSON-safe), stored verbatim at
// enqueue time. IMPORTANT: because an offline UPDATE coalesces into a
// still-queued CREATE of the same record (storage.ts), every create here MUST
// accept the entity's updatable fields as optional args — that's why the
// service create signatures carry `id?`, `status?`, `slides?`, etc.

import { incidentsApi, reportsApi } from '../services';
import { ordersApi } from '../ordersApi';
import { briefingsApi } from '../briefingsApi';
import { riskAssessmentApi } from '../riskAssessmentService';
import { breathalyzerLogApi } from '../breathalyzerLogService';
import type { BLEntry, BLResponsiblePerson } from '../../types/breathalyzerLog';
import type { OutboxEntity } from './types';

type AnyPayload = Record<string, unknown>;

interface EntityWriter {
  create: (payload: AnyPayload) => Promise<unknown>;
  update: (recordId: string, payload: AnyPayload) => Promise<unknown>;
}

export const outboxRegistry: Record<OutboxEntity, EntityWriter> = {
  order: {
    create: (p) => ordersApi.create(p as never),
    update: (id, p) => ordersApi.update(id, p as never),
  },
  briefing: {
    create: (p) => briefingsApi.create(p as never),
    update: (id, p) => briefingsApi.update(id, p as never),
  },
  incident: {
    create: (p) => incidentsApi.create(p as never),
    update: (id, p) => incidentsApi.update(id, p as never),
  },
  report: {
    create: (p) => reportsApi.create(p as never),
    update: (id, p) => reportsApi.update(id, p as never),
  },
  risk_assessment: {
    create: (p) => riskAssessmentApi.create(p as never),
    update: (id, p) => riskAssessmentApi.patch(id, p as never),
  },
  breathalyzer_log: {
    // A coalesced close-out arrives inside the create payload as `close` —
    // unpack it so a log closed offline replays fully closed.
    create: (p) => {
      const { close, ...rest } = p as {
        close?: { responsiblePerson: BLResponsiblePerson; pdfUri?: string | null };
      } & Record<string, unknown>;
      const args = close
        ? {
            ...rest,
            responsiblePerson: close.responsiblePerson,
            pdfUri: close.pdfUri ?? null,
            status: 'closed',
          }
        : rest;
      return breathalyzerLogApi.create(args as never);
    },
    // The breathalyzer api is method-per-field; dispatch on the payload keys
    // (a coalesced payload may carry several).
    update: async (id, p) => {
      const patch = p as {
        entries?: BLEntry[];
        deviceSerialNumber?: string | null;
        close?: { responsiblePerson: BLResponsiblePerson; pdfUri?: string | null };
      };
      if (patch.entries !== undefined) await breathalyzerLogApi.patchEntries(id, patch.entries);
      if (patch.deviceSerialNumber !== undefined) {
        await breathalyzerLogApi.patchDeviceSerial(id, patch.deviceSerialNumber);
      }
      if (patch.close) {
        await breathalyzerLogApi.close(id, patch.close.responsiblePerson, patch.close.pdfUri);
      }
    },
  },
};
