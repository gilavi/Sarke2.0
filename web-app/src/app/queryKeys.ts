/**
 * Centralized React Query key factories.
 *
 * The shapes here MATCH the existing raw-string keys used in pages so that
 * adopting the factories is a drop-in change with no cache invalidation
 * impact. The convention these mirror:
 *
 *   - Plural prefix for list/collection keys:   ['projects']
 *   - Singular prefix for single-entity keys:   ['project', id]
 *
 * Why factories at all: raw `['inspection', id]` strings were duplicated
 * across ~50 callsites; a typo silently breaks cache invalidation. With
 * `inspectionKeys.detail(id)` a typo is a compile error and refactoring
 * a key shape is one edit instead of fifty.
 *
 * Usage:
 *   useQuery({ queryKey: projectKeys.detail(id), queryFn: () => getProject(id) })
 *   qc.invalidateQueries({ queryKey: projectKeys.lists() })   // every list-shape key
 *   qc.invalidateQueries({ queryKey: projectKeys.detail(id) })
 */

function listKey<P extends string>(prefix: P, projectId?: string | null) {
  return (projectId ? [prefix, projectId] : [prefix]) as readonly unknown[];
}

export const projectKeys = {
  lists: () => ['projects'] as const,
  list: () => ['projects'] as const,
  detail: (id: string | null | undefined) => ['project', id] as const,
  signers: (projectId: string | null | undefined) => ['projectSigners', projectId] as const,
  files: (projectId: string | null | undefined) => ['projectFiles', projectId] as const,
} as const;

export const inspectionKeys = {
  lists: () => ['inspections'] as const,
  list: (projectId?: string | null) => listKey('inspections', projectId),
  detail: (id: string | null | undefined) => ['inspection', id] as const,
  questions: (templateId: string | null | undefined) => ['questions', templateId] as const,
  answers: (inspectionId: string | null | undefined) => ['answers', inspectionId] as const,
  answerPhotos: (answerId: string | null | undefined) => ['answerPhotos', answerId] as const,
  pdfs: (inspectionId: string | null | undefined) => ['inspectionPdfs', inspectionId] as const,
} as const;

export const bobcatKeys = {
  lists: () => ['bobcatInspections'] as const,
  list: (projectId?: string | null) => listKey('bobcatInspections', projectId),
  detail: (id: string | null | undefined) => ['bobcatInspection', id] as const,
} as const;

export const excavatorKeys = {
  lists: () => ['excavatorInspections'] as const,
  list: (projectId?: string | null) => listKey('excavatorInspections', projectId),
  detail: (id: string | null | undefined) => ['excavatorInspection', id] as const,
} as const;

export const generalEquipmentKeys = {
  lists: () => ['generalEquipmentInspections'] as const,
  list: (projectId?: string | null) => listKey('generalEquipmentInspections', projectId),
  detail: (id: string | null | undefined) => ['generalEquipmentInspection', id] as const,
} as const;

export const cargoPlatformKeys = {
  lists: () => ['cargoPlatformInspections'] as const,
  list: (projectId?: string | null) => listKey('cargoPlatformInspections', projectId),
  detail: (id: string | null | undefined) => ['cargoPlatformInspection', id] as const,
} as const;

export const safetyNetKeys = {
  lists: () => ['safetyNetInspections'] as const,
  list: (projectId?: string | null) => listKey('safetyNetInspections', projectId),
  detail: (id: string | null | undefined) => ['safetyNetInspection', id] as const,
} as const;

export const briefingKeys = {
  lists: () => ['briefings'] as const,
  list: (projectId?: string | null) => listKey('briefings', projectId),
  detail: (id: string | null | undefined) => ['briefing', id] as const,
} as const;

export const incidentKeys = {
  lists: () => ['incidents'] as const,
  list: (projectId?: string | null) => listKey('incidents', projectId),
  detail: (id: string | null | undefined) => ['incident', id] as const,
} as const;

export const reportKeys = {
  lists: () => ['reports'] as const,
  list: (projectId?: string | null) => listKey('reports', projectId),
  detail: (id: string | null | undefined) => ['report', id] as const,
} as const;

export const orderKeys = {
  lists: () => ['orders'] as const,
  list: (projectId?: string | null) => listKey('orders', projectId),
  detail: (id: string | null | undefined) => ['order', id] as const,
} as const;

export const certificateKeys = {
  lists: () => ['certificates'] as const,
} as const;

export const qualificationKeys = {
  lists: () => ['qualifications'] as const,
} as const;

export const templateKeys = {
  lists: () => ['templates'] as const,
} as const;

export const accountKeys = {
  user: (userId: string | null | undefined) => ['users', userId] as const,
  pdfUsage: (userId?: string) =>
    (userId ? ['pdf-usage', userId] : ['pdf-usage']) as readonly unknown[],
  paymentHistory: (userId?: string) =>
    (userId ? ['payment-history', userId] : ['payment-history']) as readonly unknown[],
} as const;
