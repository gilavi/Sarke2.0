// Aggregator for the real (Supabase-backed) services. Domain implementations
// live in sibling files. The top-level dispatcher (`lib/services/index.ts`)
// picks between this aggregator and the mock one based on app.json.

export { projectsApi, projectFilesApi } from './projects';
export { templatesApi } from './templates';
export { inspectionsApi, questionnairesApi, inspectionAttachmentsApi } from './inspections';
export { answersApi } from './answers';
export { qualificationsApi, certificatesApi, isExpiringSoon } from './qualifications';
export { projectItemsApi } from './projectItems';
export { schedulesApi } from './schedules';
export { remoteSigningApi } from './remoteSigning';
export { storageApi } from './storage';
export { reportsApi } from './reports';
export { incidentsApi } from './incidents';
export { paymentRecordsApi } from './payments';
