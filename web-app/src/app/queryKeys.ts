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
  detail: (id: string) => ['project', id] as const,
  signers: (projectId: string) => ['projectSigners', projectId] as const,
  files: (projectId: string) => ['projectFiles', projectId] as const,
} as const;

export const inspectionKeys = {
  lists: () => ['inspections'] as const,
  list: (projectId?: string | null) => listKey('inspections', projectId),
  detail: (id: string) => ['inspection', id] as const,
  questions: (templateId: string) => ['questions', templateId] as const,
  answers: (inspectionId: string) => ['answers', inspectionId] as const,
  answerPhotos: (answerId: string) => ['answerPhotos', answerId] as const,
  pdfs: (inspectionId: string) => ['inspectionPdfs', inspectionId] as const,
} as const;

export const bobcatKeys = {
  lists: () => ['bobcatInspections'] as const,
  list: (projectId?: string | null) => listKey('bobcatInspections', projectId),
  detail: (id: string) => ['bobcatInspection', id] as const,
} as const;

export const excavatorKeys = {
  lists: () => ['excavatorInspections'] as const,
  list: (projectId?: string | null) => listKey('excavatorInspections', projectId),
  detail: (id: string) => ['excavatorInspection', id] as const,
} as const;

export const generalEquipmentKeys = {
  lists: () => ['generalEquipmentInspections'] as const,
  list: (projectId?: string | null) => listKey('generalEquipmentInspections', projectId),
  detail: (id: string) => ['generalEquipmentInspection', id] as const,
} as const;

export const cargoPlatformKeys = {
  lists: () => ['cargoPlatformInspections'] as const,
  list: (projectId?: string | null) => listKey('cargoPlatformInspections', projectId),
  detail: (id: string) => ['cargoPlatformInspection', id] as const,
} as const;

export const briefingKeys = {
  lists: () => ['briefings'] as const,
  list: (projectId?: string | null) => listKey('briefings', projectId),
  detail: (id: string) => ['briefing', id] as const,
} as const;

export const incidentKeys = {
  lists: () => ['incidents'] as const,
  list: (projectId?: string | null) => listKey('incidents', projectId),
  detail: (id: string) => ['incident', id] as const,
} as const;

export const reportKeys = {
  lists: () => ['reports'] as const,
  list: (projectId?: string | null) => listKey('reports', projectId),
  detail: (id: string) => ['report', id] as const,
} as const;

export const orderKeys = {
  lists: () => ['orders'] as const,
  list: (projectId?: string | null) => listKey('orders', projectId),
  detail: (id: string) => ['order', id] as const,
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
  pdfUsage: (userId?: string) =>
    (userId ? ['pdf-usage', userId] : ['pdf-usage']) as readonly unknown[],
  paymentHistory: (userId?: string) =>
    (userId ? ['payment-history', userId] : ['payment-history']) as readonly unknown[],
} as const;
