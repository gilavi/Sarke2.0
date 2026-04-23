// Services dispatcher.
//
// Reads `expo.extra.useMockData` from app.json. When true, all API surfaces
// are served by the in-memory mock in `services.mock.ts`; when false, the
// real Supabase-backed implementation in `services.real.ts` is used.
//
// Rationale: on `gio-experiment` the DB schema (inspections / qualifications
// / certificates-as-PDFs) isn't applied to the live Supabase yet — main
// needs the old schema to keep working. Flipping `useMockData: true` lets
// us iterate on the new UX against a local AsyncStorage-backed fake DB.
import Constants from 'expo-constants';
import * as real from './services.real';
import * as mock from './services.mock';

const useMock = Constants.expoConfig?.extra?.useMockData === true;

// Emitted once so it's obvious in Metro logs which mode is active.
if (useMock) {
  // eslint-disable-next-line no-console
  console.log('[services] MOCK mode — using in-memory AsyncStorage store.');
}

const src: typeof real = useMock ? (mock as unknown as typeof real) : real;

export const projectsApi = src.projectsApi;
export const templatesApi = src.templatesApi;
export const inspectionsApi = src.inspectionsApi;
/** @deprecated alias kept for older imports. */
export const questionnairesApi = src.questionnairesApi;
export const answersApi = src.answersApi;
export const signaturesApi = src.signaturesApi;
export const qualificationsApi = src.qualificationsApi;
export const certificatesApi = src.certificatesApi;
export const projectItemsApi = src.projectItemsApi;
export const schedulesApi = src.schedulesApi;
export const storageApi = src.storageApi;
export const isExpiringSoon = src.isExpiringSoon;
