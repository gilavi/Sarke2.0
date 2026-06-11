#!/usr/bin/env node
/**
 * seed-demo-account.mjs — App Store review demo account
 *
 * Creates an email-confirmed demo user and seeds realistic Georgian-language
 * data so the reviewer sees a living app: 2 projects (with crew), 4
 * inspections across states (completed + draft, generic harness + bobcat
 * equipment type via the create_equipment_inspection RPC), and 1 briefing.
 *
 * Usage:
 *   SUPABASE_URL="https://<project>.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
 *   node scripts/seed-demo-account.mjs
 *
 * - Refuses to run unless both env vars are set (never hardcode keys).
 * - Idempotent: fixed UUIDs + upserts; safe to re-run. The password is
 *   generated and printed ONCE on first creation — on re-runs the existing
 *   password is kept (pass --reset-password to rotate and print a new one).
 * - Regulatory note: NO signature fields are ever seeded (inspection
 *   signatures are never persisted in this product — see
 *   features/signatures/AGENTS.md).
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Refusing to run: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.\n' +
    'Example:\n' +
    '  SUPABASE_URL="https://xyz.supabase.co" SUPABASE_SERVICE_ROLE_KEY="..." node scripts/seed-demo-account.mjs',
  );
  process.exit(1);
}

const RESET_PASSWORD = process.argv.includes('--reset-password');

const DEMO_EMAIL = 'appreview@hubble.ge';
// Matches lib/terms.ts TERMS_VERSION so the reviewer skips the terms gate.
const TERMS_VERSION = '2026-04-22';

// Fixed ids → idempotent re-runs (upsert by primary key).
const IDS = {
  projectA: 'de300000-0000-4000-8000-000000000001',
  projectB: 'de300000-0000-4000-8000-000000000002',
  harnessCompleted: 'de300000-0000-4000-8000-000000000011',
  harnessDraft: 'de300000-0000-4000-8000-000000000012',
  bobcatCompleted: 'de300000-0000-4000-8000-000000000021',
  bobcatDraft: 'de300000-0000-4000-8000-000000000022',
  briefing: 'de300000-0000-4000-8000-000000000031',
};

// System template UUIDs (fixed in migrations 0001/0024).
const TEMPLATE_HARNESS = '22222222-2222-2222-2222-222222222222';
const TEMPLATE_BOBCAT = '33333333-3333-3333-3333-333333333333';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function strongPassword() {
  // 20 chars from a 64-symbol alphabet (~120 bits) incl. required classes.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^';
  const bytes = randomBytes(20);
  let pw = '';
  for (const b of bytes) pw += alphabet[b % alphabet.length];
  return `Rv!${pw}`;
}

async function findUserByEmail(email) {
  // Admin listUsers is paginated; the demo project is small, one page is plenty.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => (u.email ?? '').toLowerCase() === email) ?? null;
}

async function ensureUser() {
  let user = await findUserByEmail(DEMO_EMAIL);
  let password = null;

  if (!user) {
    password = strongPassword();
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { first_name: 'Hubble', last_name: 'Demo' },
    });
    if (error) throw error;
    user = data.user;
    console.log(`Created demo user ${DEMO_EMAIL}`);
  } else if (RESET_PASSWORD) {
    password = strongPassword();
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (error) throw error;
    console.log(`Reset password for existing user ${DEMO_EMAIL}`);
  } else {
    console.log(`User ${DEMO_EMAIL} already exists — keeping password (use --reset-password to rotate).`);
  }

  // The handle_new_user trigger inserts the public.users row; patch the
  // profile + accept the current terms so the reviewer lands straight on Home.
  const { error: upErr } = await supabase.from('users').upsert({
    id: user.id,
    email: DEMO_EMAIL,
    first_name: 'Hubble',
    last_name: 'Demo',
    tc_accepted_version: TERMS_VERSION,
    tc_accepted_at: new Date().toISOString(),
  });
  if (upErr) throw upErr;

  return { user, password };
}

function crew(...names) {
  const roles = ['site_manager', 'safety_officer', 'foreman'];
  return names.map((name, i) => ({
    id: randomUUID(),
    roleKey: roles[i % roles.length] ?? 'other',
    name,
  }));
}

async function seedProjects(userId) {
  const { error } = await supabase.from('projects').upsert([
    {
      id: IDS.projectA,
      user_id: userId,
      name: 'საბურთალოს საცხოვრებელი კომპლექსი',
      company_name: 'შპს მთამშენი',
      address: 'ალ. ყაზბეგის გამზ. 47, თბილისი',
      contact_phone: '+995 555 12 34 56',
      crew: crew('გიორგი ბერიძე', 'ნინო კაპანაძე', 'ლევან წიკლაური'),
    },
    {
      id: IDS.projectB,
      user_id: userId,
      name: 'გლდანის სავაჭრო ცენტრი',
      company_name: 'შპს კაპიტალ ბილდინგი',
      address: 'ხიზანიშვილის ქ. 12, თბილისი',
      contact_phone: '+995 555 98 76 54',
      crew: crew('თამარ გელაშვილი', 'დავით მახარაძე'),
    },
  ]);
  if (error) throw error;
  console.log('Seeded 2 projects');
}

async function seedHarnessInspections(userId) {
  const completedAt = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  const { error } = await supabase.from('inspections').upsert([
    {
      id: IDS.harnessCompleted,
      project_id: IDS.projectA,
      template_id: TEMPLATE_HARNESS,
      user_id: userId,
      status: 'completed',
      harness_name: 'დამცავი ქამარი #H-07',
      is_safe_for_use: true,
      safety_verdict: 'safe',
      conclusion_text:
        'ქამარი ვიზუალურად გამართულია: ლენტები, ნაკერები და კარაბინები დაზიანების გარეშე. ვარგისია სამუშაოდ.',
      conclusion_photo_paths: [],
      created_at: completedAt,
      completed_at: completedAt,
    },
    {
      id: IDS.harnessDraft,
      project_id: IDS.projectB,
      template_id: TEMPLATE_HARNESS,
      user_id: userId,
      status: 'draft',
      harness_name: 'დამცავი ქამარი #H-12',
      conclusion_photo_paths: [],
      created_at: new Date().toISOString(),
    },
  ]);
  if (error) throw error;
  console.log('Seeded 2 harness inspections (completed + draft)');
}

// Realistic bobcat checklist: 30 items, mostly good, two findings.
function bobcatItems({ withFindings }) {
  const items = [];
  for (let id = 1; id <= 30; id++) {
    let result = 'good';
    let comment = null;
    if (withFindings && id === 7) {
      result = 'deficient';
      comment = 'ციცხვის ფირფიტის ცვეთა ~40% — მონიტორინგი შემდეგ შემოწმებაზე.';
    }
    if (withFindings && id === 21) {
      result = 'deficient';
      comment = 'მარჯვენა მინაზე ზედაპირული ბზარი — შეცვლა რეკომენდებულია.';
    }
    items.push({ id, result, comment, photo_paths: [] });
  }
  return items;
}

async function seedBobcatInspections(userId) {
  const completedAt = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // Parent rows via the production RPC (idempotent ON CONFLICT DO NOTHING).
  for (const id of [IDS.bobcatCompleted, IDS.bobcatDraft]) {
    const { error } = await supabase.rpc('create_equipment_inspection', {
      p_type: 'bobcat',
      p_id: id,
      p_project_id: id === IDS.bobcatCompleted ? IDS.projectA : IDS.projectB,
      p_user_id: userId,
      p_template_id: TEMPLATE_BOBCAT,
    });
    if (error) throw error;
  }
  // Keep the parent's status in sync for the completed one.
  const { error: parentErr } = await supabase
    .from('inspections')
    .update({ status: 'completed', completed_at: completedAt })
    .eq('id', IDS.bobcatCompleted);
  if (parentErr) throw parentErr;

  const { error } = await supabase.from('bobcat_inspections').upsert([
    {
      id: IDS.bobcatCompleted,
      project_id: IDS.projectA,
      template_id: TEMPLATE_BOBCAT,
      user_id: userId,
      status: 'completed',
      company: 'შპს მთამშენი',
      address: 'ალ. ყაზბეგის გამზ. 47, თბილისი',
      equipment_model: 'Bobcat S70',
      registration_number: 'BC-2214',
      inspection_date: completedAt.slice(0, 10),
      inspection_type: 'scheduled',
      inspector_name: 'Hubble Demo',
      items: bobcatItems({ withFindings: true }),
      verdict: 'approved',
      notes: 'ტექნიკა ვარგისია სამუშაოდ. ორი მცირე ნაკლოვანება — იხ. კომენტარები.',
      completed_at: completedAt,
    },
    {
      id: IDS.bobcatDraft,
      project_id: IDS.projectB,
      template_id: TEMPLATE_BOBCAT,
      user_id: userId,
      status: 'draft',
      company: 'შპს კაპიტალ ბილდინგი',
      equipment_model: 'Bobcat S450',
      registration_number: 'BC-3107',
      inspection_date: new Date().toISOString().slice(0, 10),
      inspection_type: 'pre_work',
      inspector_name: 'Hubble Demo',
      items: bobcatItems({ withFindings: false }).map((it) => (it.id <= 12 ? it : { ...it, result: null })),
    },
  ]);
  if (error) throw error;
  console.log('Seeded 2 bobcat inspections via create_equipment_inspection RPC (completed + draft)');
}

async function seedBriefing(userId) {
  const { error } = await supabase.from('briefings').upsert([
    {
      id: IDS.briefing,
      project_id: IDS.projectA,
      user_id: userId,
      date_time: new Date().toISOString(),
      topics: ['სიმაღლეზე მუშაობის უსაფრთხოება', 'ინდივიდუალური დაცვის საშუალებები'],
      participants: [
        { name: 'გიორგი ბერიძე', signature: null },
        { name: 'ნინო კაპანაძე', signature: null },
        { name: 'ლევან წიკლაური', signature: null },
      ],
      inspector_name: 'Hubble Demo',
      status: 'draft',
    },
  ]);
  if (error) throw error;
  console.log('Seeded 1 briefing (draft, today)');
}

try {
  const { user, password } = await ensureUser();
  await seedProjects(user.id);
  await seedHarnessInspections(user.id);
  await seedBobcatInspections(user.id);
  await seedBriefing(user.id);

  console.log('\n──────────────────────────────────────────────');
  console.log('Demo account ready for App Review:');
  console.log(`  email:    ${DEMO_EMAIL}`);
  if (password) {
    console.log(`  password: ${password}`);
    console.log('  (printed once — store it in the App Store Connect review notes now)');
  } else {
    console.log('  password: unchanged (re-run with --reset-password to rotate)');
  }
  console.log('──────────────────────────────────────────────');
} catch (e) {
  console.error('Seed failed:', e?.message ?? e);
  process.exit(1);
}
