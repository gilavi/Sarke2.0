#!/usr/bin/env node
// Fetch the Supabase auto-generated OpenAPI spec for the project
// configured in app.json -> expo.extra and write it to
// website/static/openapi.json so the Swagger UI page can serve it.

import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const appJsonPath = resolve(repoRoot, 'app.json');

const app = JSON.parse(readFileSync(appJsonPath, 'utf8'));
const {supabaseUrl, supabaseAnonKey} = app.expo.extra;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing supabaseUrl or supabaseAnonKey in app.json');
  process.exit(1);
}

const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`;
console.log(`Fetching ${supabaseUrl}/rest/v1/ …`);

const res = await fetch(url, {
  headers: {apikey: supabaseAnonKey},
});
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const spec = await res.json();

const outDir = resolve(__dirname, '..', 'static');
mkdirSync(outDir, {recursive: true});
const outPath = resolve(outDir, 'openapi.json');
writeFileSync(outPath, JSON.stringify(spec, null, 2));
console.log(`Wrote ${outPath}`);
