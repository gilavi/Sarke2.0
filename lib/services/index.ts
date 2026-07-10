// Services facade — the single entry point for the data layer.
//
// Historically this dispatched between `./real` (Supabase-backed) and `./mock`
// (an in-memory AsyncStorage fake) at module-load time based on
// `expo.extra.useMockData`. That runtime toggle is retired:
//   * the flag is statically `false` (app.config.ts) and never env-driven, so
//     `./mock` was compiled into every production Hermes bundle (~1,000 lines)
//     but never executed;
//   * the mock only ever covered part of the app — briefings/orders, all nine
//     equipment services, breathalyzer and risk-assessment already bypass it —
//     so flipping the flag produced a half-mocked app that still wrote to prod
//     Supabase for the newest, riskiest domains.
//
// Production always uses `./real`. The mock modules remain under
// `lib/services/mock/` as a **test-only fixture**, imported directly by vitest
// (tests/unit/mockServices.test.ts). Because nothing in the app import graph
// references `./mock` anymore, Metro drops it from the shipped bundle.
//
// `from '../../lib/services'` still resolves here, so existing call sites keep
// working unchanged.

export {
  projectsApi,
  projectFilesApi,
  templatesApi,
  inspectionsApi,
  /** @deprecated alias kept for older imports; identical to `inspectionsApi`. */
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
} from './real';
