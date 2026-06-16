import type { ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config (replaces the former static app.json).
 *
 * The environment is selected by `APP_ENV` (development | staging | production),
 * defaulting to production. This file is the single source of truth for
 * per-environment app identity + backend wiring.
 *
 * NOTE: this file must be self-contained. Expo's config loader transpiles
 * app.config.ts itself but resolves nested `require()`s through Node, which
 * cannot load a sibling `.ts` module — so the env table is inlined here rather
 * than imported from `config/env.ts`.
 *
 * Everything not parameterized by `env` below is byte-identical to the
 * pre-refactor app.json — verified with `npx expo config --type public --json`.
 *
 * The resolved values flow into `extra` and are read at runtime via
 * `Constants.expoConfig.extra` (see `lib/supabase.ts`, `lib/crashReporting.ts`).
 */

type AppEnv = 'development' | 'staging' | 'production';

interface EnvConfig {
  appEnv: AppEnv;
  /** Display name (Home screen / App Store). */
  name: string;
  /** iOS `bundleIdentifier` and Android `package` (kept in lockstep). */
  bundleId: string;
  /** Deep-link scheme. Distinct per variant so side-by-side installs route correctly. */
  scheme: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** EAS Update channel this variant listens on. `null` for the dev client. */
  channel: string | null;
  /** Sentry `environment` tag. */
  sentryEnv: string;
}

/** Resolve APP_ENV, defaulting to production for any unset/unknown value (fail-safe). */
function resolveAppEnv(): AppEnv {
  const raw = process.env.APP_ENV;
  if (raw === 'staging' || raw === 'development') return raw;
  return 'production';
}

// --- Production (the live App Store app) ------------------------------------
// MUST stay byte-identical to the pre-refactor app.json so the production build
// keeps its Apple identity and EAS Update continuity.
const PRODUCTION: EnvConfig = {
  appEnv: 'production',
  name: 'Hubble',
  bundleId: 'ge.sarke2.app',
  scheme: 'sarke2',
  supabaseUrl: 'https://seskuthiopywrgntsgfw.supabase.co',
  supabaseAnonKey: 'sb_publishable_OF_L2E27-Uv8MMw87fWfSA_znD7moYY',
  channel: 'production',
  sentryEnv: 'production',
};

// --- Staging (separate installable app, internal distribution) --------------
// The staging Supabase project does not exist yet (plan Phase 0.B). Its URL +
// anon key are read from env vars so they can be supplied the moment the
// project is created — no code change needed. The guard below fails the build
// if a staging/dev build is attempted before these are set.
const STAGING: EnvConfig = {
  appEnv: 'staging',
  name: 'Hubble (Staging)',
  bundleId: 'ge.sarke2.app.staging',
  scheme: 'sarke2staging',
  supabaseUrl: process.env.STAGING_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.STAGING_SUPABASE_ANON_KEY ?? '',
  channel: 'staging',
  sentryEnv: 'staging',
};

// --- Local development (dev client) -----------------------------------------
// Defaults to the staging backend (or a local Supabase stack via DEV_* vars).
const DEVELOPMENT: EnvConfig = {
  appEnv: 'development',
  name: 'Hubble (Dev)',
  bundleId: 'ge.sarke2.app.dev',
  scheme: 'sarke2dev',
  supabaseUrl: process.env.DEV_SUPABASE_URL ?? process.env.STAGING_SUPABASE_URL ?? '',
  supabaseAnonKey:
    process.env.DEV_SUPABASE_ANON_KEY ?? process.env.STAGING_SUPABASE_ANON_KEY ?? '',
  channel: null,
  sentryEnv: 'development',
};

const ENV_TABLE: Record<AppEnv, EnvConfig> = {
  production: PRODUCTION,
  staging: STAGING,
  development: DEVELOPMENT,
};

const env = ENV_TABLE[resolveAppEnv()];

// --- Guardrails (plan risk R1) ----------------------------------------------
// 1) Fail closed if the EAS build profile and APP_ENV disagree. EAS sets
//    EAS_BUILD_PROFILE during `eas build`; a mismatch would otherwise ship a
//    binary pointing at the wrong backend / wrong channel.
const profile = process.env.EAS_BUILD_PROFILE;
if (profile === 'production' || profile === 'staging' || profile === 'development') {
  if (profile !== env.appEnv) {
    throw new Error(
      `[app.config] EAS build profile "${profile}" does not match APP_ENV "${env.appEnv}". ` +
        'Refusing to build to avoid pointing the app at the wrong environment. ' +
        'Use the env-pinned npm scripts (build:staging / build:production).',
    );
  }
}
// 2) Non-production builds must have real Supabase credentials wired (Phase 0.B).
if (env.appEnv !== 'production' && (!env.supabaseUrl || !env.supabaseAnonKey)) {
  const prefix = env.appEnv.toUpperCase();
  throw new Error(
    `[app.config] Missing Supabase credentials for APP_ENV="${env.appEnv}". ` +
      `Set ${prefix}_SUPABASE_URL and ${prefix}_SUPABASE_ANON_KEY (or STAGING_* fallback).`,
  );
}

const config: ExpoConfig = {
  name: env.name,
  slug: 'sarke2',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: env.scheme,
  newArchEnabled: true,
  updates: {
    url: 'https://u.expo.dev/ab800403-36c4-4673-8dd8-dfc75b66d14b',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#F6F2EA',
  },
  assetBundlePatterns: ['assets/**/*'],
  ios: {
    supportsTablet: false,
    requireFullScreen: true,
    bundleIdentifier: env.bundleId,
    buildNumber: '1',
    usesAppleSignIn: true,
    infoPlist: {
      NSCameraUsageDescription:
        'კამერა გამოიყენება ხარაჩოს და ქამრების ფოტოების ატვირთვისთვის.',
      NSPhotoLibraryUsageDescription: 'ფოტოების არჩევა სისტემის ბიბლიოთეკიდან.',
      NSPhotoLibraryAddUsageDescription: 'საჭიროა ფოტოების შესანახად',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F6F2EA',
    },
    package: env.bundleId,
    versionCode: 1,
    edgeToEdgeEnabled: true,
    softwareKeyboardLayoutMode: 'resize',
    permissions: [],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-image-picker',
      {
        photosPermission: 'აპი ითხოვს წვდომას გალერეაზე ფოტოების ასატვირთად.',
        cameraPermission: 'კამერა გამოიყენება ფოტოების გადასაღებად.',
      },
    ],
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#147A4F',
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        // Overridable per environment via SENTRY_ORG / SENTRY_PROJECT env vars.
        organization: process.env.SENTRY_ORG ?? 'hubble-pk',
        project: process.env.SENTRY_PROJECT ?? 'hubble-mobile',
        url: 'https://sentry.io/',
      },
    ],
    'expo-font',
    'expo-web-browser',
    'expo-apple-authentication',
  ],
  extra: {
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
    appEnv: env.appEnv,
    googleIosClientId: '',
    googleAndroidClientId: '',
    googleWebClientId: '',
    useMockData: false,
    router: {},
    eas: {
      projectId: 'ab800403-36c4-4673-8dd8-dfc75b66d14b',
    },
  },
  experiments: {
    typedRoutes: false,
  },
  owner: 'x4ylee',
};

export default config;
