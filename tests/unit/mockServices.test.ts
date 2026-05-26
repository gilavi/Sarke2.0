import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory AsyncStorage so mock services' load/save cycle works in jsdom.
let asyncStorageBacking: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => (k in asyncStorageBacking ? asyncStorageBacking[k] : null),
    setItem: async (k: string, v: string) => { asyncStorageBacking[k] = v; },
    removeItem: async (k: string) => { delete asyncStorageBacking[k]; },
    clear: async () => { asyncStorageBacking = {}; },
  },
}));

const {
  projectsApi,
  projectFilesApi,
  templatesApi,
  inspectionsApi,
  questionnairesApi,
  inspectionAttachmentsApi,
  answersApi,
  qualificationsApi,
  certificatesApi,
  isExpiringSoon,
  projectItemsApi,
  schedulesApi,
  remoteSigningApi,
  storageApi,
  reportsApi,
  incidentsApi,
  paymentRecordsApi,
  resetMockDb,
} = await import('../../lib/services/mock');

beforeEach(async () => {
  asyncStorageBacking = {};
  await resetMockDb();
});

// ── projectsApi ──────────────────────────────────────────────────────────────

describe('mock projectsApi', () => {
  it('seeds two projects ordered newest-first', async () => {
    const list = await projectsApi.list();
    expect(list).toHaveLength(2);
    expect(list[0].name).toContain('ისანის'); // newer seeded project
  });

  it('getById returns the project', async () => {
    const p = await projectsApi.getById('proj-1');
    expect(p?.name).toBe('ვაკე-საბურთალოს ობიექტი');
  });

  it('getById returns null for unknown id', async () => {
    expect(await projectsApi.getById('nope')).toBeNull();
  });

  it('create + update + remove', async () => {
    const p = await projectsApi.create({
      name: 'ახალი',
      companyName: 'New Co',
      address: 'მისამართი',
      latitude: 41,
      longitude: 44,
    });
    expect(p.id).toBeTruthy();
    expect(p.address).toBe('მისამართი');
    expect(p.contact_phone).toBeNull();

    const updated = await projectsApi.update(p.id, { name: 'Updated', crew: null });
    expect(updated.name).toBe('Updated');

    await projectsApi.remove(p.id);
    expect(await projectsApi.getById(p.id)).toBeNull();
  });

  it('create with optional fields omitted', async () => {
    const p = await projectsApi.create({ name: 'N', companyName: 'C' });
    expect(p.address).toBeNull();
    expect(p.latitude).toBeNull();
    expect(p.logo).toBeNull();
  });

  it('update throws on missing id', async () => {
    await expect(projectsApi.update('nope', { name: 'x' })).rejects.toThrow('not found');
  });

  it('signers + upsertSigner (create then update) + saveRosterSignature + deleteSigner', async () => {
    expect(await projectsApi.signers('proj-1')).toEqual([]);
    const s = await projectsApi.upsertSigner({
      project_id: 'proj-1',
      role: 'expert',
      full_name: 'Gio',
    });
    expect(s.id).toBeTruthy();
    expect(s.phone).toBeNull();

    // Same project_id+role+full_name → upsert path (Object.assign branch)
    const s2 = await projectsApi.upsertSigner({
      project_id: 'proj-1',
      role: 'expert',
      full_name: 'gio', // case-insensitive
      phone: '+1',
    });
    expect(s2.id).toBe(s.id);
    expect(s2.phone).toBe('+1');

    const saved = await projectsApi.saveRosterSignature({
      project_id: 'proj-1',
      role: 'expert',
      full_name: 'Gio',
      signature_png_url: 'data:image/png;base64,XX',
    });
    expect(saved.id).toBe(s.id);

    await projectsApi.deleteSigner(s.id);
    expect(await projectsApi.signers('proj-1')).toEqual([]);
  });

  it('stats counts drafts/completed per project', async () => {
    const stats = await projectsApi.stats();
    // proj-1 has insp-1 (completed) + insp-2 (completed); proj-2 has insp-3 (draft)
    expect(stats['proj-1']).toEqual({ drafts: 0, completed: 2 });
    expect(stats['proj-2']).toEqual({ drafts: 1, completed: 0 });
  });
});

describe('mock projectFilesApi (stub)', () => {
  it('list returns []', async () => {
    expect(await projectFilesApi.list('x')).toEqual([]);
  });
  it('upload/remove/signedUrl throw not-supported errors', async () => {
    await expect(
      projectFilesApi.upload({ projectId: 'x', fileUri: 'x', name: 'x', mimeType: null, sizeBytes: null }),
    ).rejects.toThrow(/not supported/);
    await expect(projectFilesApi.remove({ id: 'x', storage_path: 'x' })).rejects.toThrow();
    await expect(projectFilesApi.signedUrl({ storage_path: 'x' })).rejects.toThrow();
  });
});

// ── templatesApi ─────────────────────────────────────────────────────────────

describe('mock templatesApi', () => {
  it('list returns the two seeded templates', async () => {
    const list = await templatesApi.list();
    expect(list.length).toBe(2);
  });

  it('getById returns null for unknown id', async () => {
    expect(await templatesApi.getById('nope')).toBeNull();
    expect(await templatesApi.getById('tpl-xaracho')).not.toBeNull();
  });

  it('questions returns ordered questions for a template', async () => {
    const qs = await templatesApi.questions('tpl-xaracho');
    expect(qs.length).toBe(2);
    expect(qs[0].order).toBe(1);
    expect(qs[1].order).toBe(2);
  });
});

// ── inspectionsApi ───────────────────────────────────────────────────────────

describe('mock inspectionsApi', () => {
  it('recent + getById + listByProject', async () => {
    const recent = await inspectionsApi.recent();
    expect(recent.length).toBe(3);
    expect(await inspectionsApi.getById('insp-1')).not.toBeNull();
    expect(await inspectionsApi.getById('nope')).toBeNull();
    expect(await inspectionsApi.listByProject('proj-1')).toHaveLength(2);
  });

  it('create + update + finish + remove cascades', async () => {
    const created = await inspectionsApi.create({
      projectId: 'proj-1',
      templateId: 'tpl-xaracho',
      harnessName: 'Foo',
    });
    expect(created.status).toBe('draft');
    expect(created.harness_name).toBe('Foo');

    const updated = await inspectionsApi.update({ id: created.id, conclusion_text: 'ok' });
    expect(updated.conclusion_text).toBe('ok');

    await inspectionsApi.finish(created.id);
    const finished = await inspectionsApi.getById(created.id);
    expect(finished?.status).toBe('completed');
    expect(finished?.completed_at).toBeTruthy();

    await inspectionsApi.remove(created.id);
    expect(await inspectionsApi.getById(created.id)).toBeNull();
  });

  it('update + finish throw on missing id', async () => {
    await expect(inspectionsApi.update({ id: 'nope' })).rejects.toThrow('not found');
    await expect(inspectionsApi.finish('nope')).rejects.toThrow('not found');
  });

  it('counts aggregates draft/completed', async () => {
    const c = await inspectionsApi.counts();
    expect(c.total).toBe(3);
    expect(c.completed).toBe(2);
    expect(c.drafts).toBe(1);
    expect(c.latestCreatedAt).toBeTruthy();
  });

  it('listByTemplateIds filters by template set', async () => {
    const out = await inspectionsApi.listByTemplateIds(['tpl-xaracho']);
    expect(out.every(i => i.template_id === 'tpl-xaracho')).toBe(true);
  });

  it('listAll returns only completed inspections', async () => {
    const out = await inspectionsApi.listAll();
    expect(out.every(i => i.status === 'completed')).toBe(true);
  });

  it('questionnairesApi is the same object', () => {
    expect(questionnairesApi).toBe(inspectionsApi);
  });
});

describe('mock inspectionAttachmentsApi', () => {
  it('listByInspection returns [] then includes created rows; update + remove', async () => {
    expect(await inspectionAttachmentsApi.listByInspection('insp-1')).toEqual([]);
    const att = await inspectionAttachmentsApi.create({
      inspectionId: 'insp-1',
      certType: 'cert',
      certNumber: 'N-1',
      photoPath: 'p',
    });
    expect(att.cert_type).toBe('cert');

    const upd = await inspectionAttachmentsApi.update(att.id, {
      certType: 'cert2',
      certNumber: null,
      photoPath: null,
    });
    expect(upd.cert_type).toBe('cert2');
    expect(upd.cert_number).toBeNull();

    await inspectionAttachmentsApi.remove(att.id);
    expect(await inspectionAttachmentsApi.listByInspection('insp-1')).toEqual([]);
  });

  it('update throws on missing attachment', async () => {
    await expect(inspectionAttachmentsApi.update('nope', { certType: 'x' })).rejects.toThrow();
  });

  it('uploadPhoto echoes the file URI', async () => {
    expect(await inspectionAttachmentsApi.uploadPhoto({ inspectionId: 'i', fileUri: 'file://x' })).toBe('file://x');
  });
});

// ── answersApi ───────────────────────────────────────────────────────────────

describe('mock answersApi', () => {
  it('list + upsert (insert path then update path)', async () => {
    expect(await answersApi.list('insp-1')).toEqual([]);
    const a = await answersApi.upsert({
      inspection_id: 'insp-1',
      question_id: 'q-a-1',
      value_bool: true,
    });
    expect(a.value_bool).toBe(true);

    const a2 = await answersApi.upsert({
      inspection_id: 'insp-1',
      question_id: 'q-a-1',
      value_bool: false,
      comment: 'no',
    });
    expect(a2.id).toBe(a.id);
    expect(a2.value_bool).toBe(false);
    expect(a2.comment).toBe('no');

    expect((await answersApi.list('insp-1')).length).toBe(1);
  });

  it('photos + addPhoto + photosByAnswerIds + removePhoto', async () => {
    const a = await answersApi.upsert({
      inspection_id: 'insp-1',
      question_id: 'q-a-1',
      value_text: 'x',
    });
    expect(await answersApi.photos(a.id)).toEqual([]);
    const photo = await answersApi.addPhoto(a.id, 'storage/path.jpg', {
      caption: 'cap',
      latitude: 1,
      longitude: 2,
      address: 'addr',
    });
    expect(photo.storage_path).toBe('storage/path.jpg');
    expect(photo.address).toBe('addr');

    const grouped = await answersApi.photosByAnswerIds([a.id, 'nope']);
    expect(grouped[a.id]).toHaveLength(1);
    expect(grouped.nope).toBeUndefined();

    await answersApi.removePhoto(photo.id);
    expect(await answersApi.photos(a.id)).toEqual([]);
  });
});

// ── signaturesApi removed by the 2026-05-26 inspection signatures redesign;
//    the test block that exercised it was dropped during merge integration.

// ── qualifications + certificates ────────────────────────────────────────────

describe('mock qualifications + certificates', () => {
  it('qualificationsApi list/upsert/remove', async () => {
    const list = await qualificationsApi.list();
    expect(list.length).toBe(2);

    const newQual = await qualificationsApi.upsert({
      id: 'qual-new',
      user_id: list[0].user_id,
      type: 'new_qual',
      number: null,
      issued_at: null,
      expires_at: null,
      file_url: null,
    });
    expect(newQual.id).toBe('qual-new');

    const updated = await qualificationsApi.upsert({
      id: 'qual-new',
      user_id: list[0].user_id,
      type: 'updated_qual',
      number: null,
      issued_at: null,
      expires_at: null,
      file_url: null,
    });
    expect(updated.type).toBe('updated_qual');

    await qualificationsApi.remove('qual-new');
    expect((await qualificationsApi.list()).find(q => q.id === 'qual-new')).toBeUndefined();
  });

  it('certificatesApi list/getById/listByInspection/countsByInspection/create/remove', async () => {
    const all = await certificatesApi.list();
    expect(all.length).toBe(3);

    expect(await certificatesApi.getById('cert-1')).not.toBeNull();
    expect(await certificatesApi.getById('nope')).toBeNull();

    const insp2Certs = await certificatesApi.listByInspection('insp-2');
    expect(insp2Certs.length).toBe(2);

    const counts = await certificatesApi.countsByInspection(['insp-1', 'insp-2', 'nope']);
    expect(counts['insp-1']).toBe(1);
    expect(counts['insp-2']).toBe(2);
    expect(counts.nope).toBeUndefined();

    const created = await certificatesApi.create({
      inspectionId: 'insp-1',
      templateId: 'tpl-xaracho',
      pdfUrl: 'mock/x.pdf',
      isSafeForUse: true,
      conclusionText: 'ok',
    });
    expect(created.id).toBeTruthy();
    expect(created.params).toEqual({});

    await certificatesApi.remove(created.id);
    expect(await certificatesApi.getById(created.id)).toBeNull();
  });

  it('isExpiringSoon: true within 30d, false beyond, false for null', () => {
    expect(isExpiringSoon({ expires_at: null } as any)).toBe(false);
    expect(
      isExpiringSoon({ expires_at: new Date(Date.now() + 10 * 864e5).toISOString() } as any),
    ).toBe(true);
    expect(
      isExpiringSoon({ expires_at: new Date(Date.now() + 100 * 864e5).toISOString() } as any),
    ).toBe(false);
  });
});

// ── projectItems + schedules ─────────────────────────────────────────────────

describe('mock projectItemsApi', () => {
  it('listByProject + create + remove', async () => {
    expect(await projectItemsApi.listByProject('proj-1')).toEqual([]);
    const item = await projectItemsApi.create({
      projectId: 'proj-1',
      name: 'ხარაჩო N1',
      category: 'scaffold',
    });
    expect(item.category).toBe('scaffold');
    expect((await projectItemsApi.listByProject('proj-1')).length).toBe(1);
    await projectItemsApi.remove(item.id);
    expect(await projectItemsApi.listByProject('proj-1')).toEqual([]);
  });
});

describe('mock schedulesApi', () => {
  it('upsertForItem creates a schedule; list joins to project_items + projects', async () => {
    const item = await projectItemsApi.create({ projectId: 'proj-1', name: 'X' });
    const s = await schedulesApi.upsertForItem(item.id, 7);
    expect(s.interval_days).toBe(7);

    // Idempotent — second call returns the existing row
    const s2 = await schedulesApi.upsertForItem(item.id, 99);
    expect(s2.id).toBe(s.id);
    expect(s2.interval_days).toBe(7);

    const list = await schedulesApi.list();
    expect(list.length).toBe(1);
    expect(list[0].project_items?.id).toBe(item.id);
    expect(list[0].project_items?.projects?.id).toBe('proj-1');
  });

  it('upcoming filters by date range', async () => {
    const item = await projectItemsApi.create({ projectId: 'proj-1', name: 'X' });
    await schedulesApi.upsertForItem(item.id, 10);
    const future = new Date(Date.now() + 365 * 864e5).toISOString();
    const past = new Date(Date.now() - 365 * 864e5).toISOString();
    const inRange = await schedulesApi.upcoming(past, future);
    expect(inRange.length).toBe(1);
    const noneInRange = await schedulesApi.upcoming(past, past);
    expect(noneInRange.length).toBe(0);
  });

  it('markInspected updates last_inspected_at + next_due_at', async () => {
    const item = await projectItemsApi.create({ projectId: 'proj-1', name: 'X' });
    const s = await schedulesApi.upsertForItem(item.id, 5);
    const iso = '2026-05-20T00:00:00.000Z';
    const updated = await schedulesApi.markInspected(s.id, iso);
    expect(updated.last_inspected_at).toBe(iso);
    expect(updated.next_due_at).toBeTruthy();
  });

  it('markInspected throws on missing id', async () => {
    await expect(schedulesApi.markInspected('nope', new Date().toISOString())).rejects.toThrow('not found');
  });

  it('setGoogleEventId is a no-op for missing schedule', async () => {
    await expect(schedulesApi.setGoogleEventId('nope', 'gid')).resolves.toBeUndefined();
  });

  it('setGoogleEventId sets the id on an existing schedule', async () => {
    const item = await projectItemsApi.create({ projectId: 'proj-1', name: 'X' });
    const s = await schedulesApi.upsertForItem(item.id);
    await schedulesApi.setGoogleEventId(s.id, 'gid-1');
    const list = await schedulesApi.list();
    expect(list.find(x => x.id === s.id)?.google_event_id).toBe('gid-1');
  });
});

// ── remoteSigningApi ─────────────────────────────────────────────────────────

describe('mock remoteSigningApi', () => {
  it('create + list + sendSMS + cancel', async () => {
    const created = await remoteSigningApi.create({
      inspectionId: 'insp-1',
      signerName: 'Signer',
      signerPhone: '+1',
      signerRole: 'expert',
    });
    expect(created.status).toBe('pending');

    const list = await remoteSigningApi.listByInspection('insp-1');
    expect(list.find(r => r.id === created.id)?.signer_name).toBe('Signer');

    await remoteSigningApi.sendSMS(created.id);
    const afterSend = await remoteSigningApi.listByInspection('insp-1');
    expect(afterSend.find(r => r.id === created.id)?.status).toBe('sent');

    await remoteSigningApi.cancel(created.id);
    expect((await remoteSigningApi.listByInspection('insp-1')).find(r => r.id === created.id)).toBeUndefined();
  });

  it('sendSMS and cancel are no-ops for missing id', async () => {
    await expect(remoteSigningApi.sendSMS('nope')).resolves.toBeUndefined();
    await expect(remoteSigningApi.cancel('nope')).resolves.toBeUndefined();
  });

  it('signedSignatureUrl returns the mock image URI', async () => {
    expect(await remoteSigningApi.signedSignatureUrl('p')).toContain('data:image/png;base64,');
  });
});

// ── storageApi (stub) ────────────────────────────────────────────────────────

describe('mock storageApi', () => {
  it('upload/uploadFromUri echo the path', async () => {
    expect(await storageApi.upload('b', 'p', new Blob(), 'application/octet-stream')).toBe('p');
    expect(await storageApi.uploadFromUri('b', 'p', 'file:///x', 'image/jpeg')).toBe('p');
  });
  it('signedUrl/publicUrl return data URI; download returns empty blob; remove no-ops', async () => {
    expect(await storageApi.signedUrl('b', 'p')).toContain('data:image/png');
    expect(storageApi.publicUrl('b', 'p')).toContain('data:image/png');
    const b = await storageApi.download('b', 'p');
    expect(b.size).toBe(0);
    await expect(storageApi.remove('b', 'p')).resolves.toBeUndefined();
  });
});

// ── reports / incidents / payments (mostly stubs) ────────────────────────────

describe('mock reports/incidents/payments', () => {
  it('reportsApi is an object (stub coverage)', () => {
    expect(typeof reportsApi).toBe('object');
  });
  it('incidentsApi is an object (stub coverage)', () => {
    expect(typeof incidentsApi).toBe('object');
  });
  it('paymentRecordsApi is an object (stub coverage)', () => {
    expect(typeof paymentRecordsApi).toBe('object');
  });
});
