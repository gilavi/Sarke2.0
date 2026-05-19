/**
 * Centralized, typed route definitions.
 *
 * Two parallel surfaces:
 *   - `routePattern.*` — the path pattern with `:param` placeholders, used in
 *     <Route path={...} /> declarations.
 *   - `routes.*` — builders that produce concrete URLs, used in <Link to={...}>
 *     and navigate(). Static routes are plain strings; parameterized routes
 *     are functions: routes.projects.detail(id).
 *
 * Adding a route: extend both surfaces in the same block and the type system
 * will guide every callsite.
 */

const project = '/projects';
const inspection = '/inspections';
const bobcat = '/bobcat';
const excavator = '/excavator';
const generalEquipment = '/general-equipment';
const cargoPlatform = '/cargo-platform';
const order = '/orders';
const briefing = '/briefings';
const incident = '/incidents';
const report = '/reports';

function withProject(path: string, projectId?: string | null): string {
  return projectId ? `${path}?project=${encodeURIComponent(projectId)}` : path;
}

export const routePattern = {
  // Auth & public
  landing: '/',
  login: '/login',
  register: '/register',
  forgot: '/forgot',
  reset: '/reset',
  verifyEmail: '/verify-email',
  terms: '/terms',

  // Subscription
  subscribe: '/subscribe',
  subscribeSuccess: '/subscribe/success',
  subscribeFail: '/subscribe/fail',

  // App shell pages
  home: '/home',
  account: '/account',
  calendar: '/calendar',
  certificates: '/certificates',
  regulations: '/regulations',
  qualifications: '/qualifications',
  templates: '/templates',
  history: '/history',
  safety: '/safety',
  safetyStandalone: '/safety-standalone',

  // Projects
  projects: project,
  projectNew: `${project}/new`,
  projectDetail: `${project}/:id`,
  projectEdit: `${project}/:id/edit`,
  projectFiles: '/project-files/:id',

  // Inspections (standard)
  inspections: inspection,
  inspectionDetail: `${inspection}/:id`,
  inspectionPrint: `${inspection}/:id/print`,

  // Equipment inspections
  bobcatNew: `${bobcat}/new`,
  bobcatDetail: `${bobcat}/:id`,
  bobcatPrint: `${bobcat}/:id/print`,
  excavatorNew: `${excavator}/new`,
  excavatorDetail: `${excavator}/:id`,
  excavatorPrint: `${excavator}/:id/print`,
  generalEquipmentNew: `${generalEquipment}/new`,
  generalEquipmentDetail: `${generalEquipment}/:id`,
  generalEquipmentPrint: `${generalEquipment}/:id/print`,
  cargoPlatformNew: `${cargoPlatform}/new`,
  cargoPlatformDetail: `${cargoPlatform}/:id`,
  cargoPlatformPrint: `${cargoPlatform}/:id/print`,

  // Orders
  orders: order,
  orderNew: `${order}/new`,
  orderDetail: `${order}/:id`,

  // Briefings
  briefings: briefing,
  briefingNew: `${briefing}/new`,
  briefingDetail: `${briefing}/:id`,
  briefingPrint: `${briefing}/:id/print`,

  // Incidents
  incidents: incident,
  incidentNew: `${incident}/new`,
  incidentDetail: `${incident}/:id`,
  incidentPrint: `${incident}/:id/print`,

  // Reports
  reports: report,
  reportNew: `${report}/new`,
  reportDetail: `${report}/:id`,
  reportPrint: `${report}/:id/print`,
} as const;

export const routes = {
  landing: '/' as const,
  login: '/login' as const,
  register: '/register' as const,
  forgot: '/forgot' as const,
  reset: '/reset' as const,
  verifyEmail: (email?: string) =>
    email ? `/verify-email?email=${encodeURIComponent(email)}` : '/verify-email',
  terms: '/terms' as const,

  subscribe: {
    index: '/subscribe' as const,
    success: '/subscribe/success' as const,
    fail: '/subscribe/fail' as const,
  },

  home: '/home' as const,
  account: '/account' as const,
  calendar: '/calendar' as const,
  certificates: '/certificates' as const,
  regulations: '/regulations' as const,
  qualifications: '/qualifications' as const,
  templates: '/templates' as const,
  history: '/history' as const,
  safety: '/safety' as const,
  safetyStandalone: '/safety-standalone' as const,

  projects: {
    list: project,
    new: `${project}/new`,
    detail: (id: string) => `${project}/${id}`,
    edit: (id: string) => `${project}/${id}/edit`,
    files: (id: string) => `/project-files/${id}`,
  },

  inspections: {
    list: (projectId?: string | null) => withProject(inspection, projectId),
    detail: (id: string) => `${inspection}/${id}`,
    print: (id: string) => `${inspection}/${id}/print`,
  },

  bobcat: {
    new: `${bobcat}/new`,
    detail: (id: string) => `${bobcat}/${id}`,
    print: (id: string) => `${bobcat}/${id}/print`,
  },
  excavator: {
    new: `${excavator}/new`,
    detail: (id: string) => `${excavator}/${id}`,
    print: (id: string) => `${excavator}/${id}/print`,
  },
  generalEquipment: {
    new: `${generalEquipment}/new`,
    detail: (id: string) => `${generalEquipment}/${id}`,
    print: (id: string) => `${generalEquipment}/${id}/print`,
  },
  cargoPlatform: {
    new: `${cargoPlatform}/new`,
    detail: (id: string) => `${cargoPlatform}/${id}`,
    print: (id: string) => `${cargoPlatform}/${id}/print`,
  },

  orders: {
    list: (projectId?: string | null) => withProject(order, projectId),
    new: (projectId?: string | null) => withProject(`${order}/new`, projectId),
    detail: (id: string) => `${order}/${id}`,
  },

  briefings: {
    list: (projectId?: string | null) => withProject(briefing, projectId),
    new: (projectId?: string | null) => withProject(`${briefing}/new`, projectId),
    detail: (id: string) => `${briefing}/${id}`,
    print: (id: string) => `${briefing}/${id}/print`,
  },

  incidents: {
    list: (projectId?: string | null) => withProject(incident, projectId),
    new: (projectId?: string | null) => withProject(`${incident}/new`, projectId),
    detail: (id: string) => `${incident}/${id}`,
    print: (id: string) => `${incident}/${id}/print`,
  },

  reports: {
    list: (projectId?: string | null) => withProject(report, projectId),
    new: (projectId?: string | null) => withProject(`${report}/new`, projectId),
    detail: (id: string) => `${report}/${id}`,
    print: (id: string) => `${report}/${id}/print`,
  },
} as const;
