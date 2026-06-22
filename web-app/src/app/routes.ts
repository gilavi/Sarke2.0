/**
 * Centralized, typed route definitions.
 *
 * Two parallel surfaces:
 *   - `routePattern.*` - the path pattern with `:param` placeholders, used in
 *     <Route path={...} /> declarations.
 *   - `routes.*` - builders that produce concrete URLs, used in <Link to={...}>
 *     and navigate(). Static routes are plain strings; parameterized routes
 *     are functions: routes.projects.detail(id).
 *
 * Adding a route: extend both surfaces in the same block and the type system
 * will guide every callsite.
 */

const project = '/projects';

export const routePattern = {
  // Auth & public
  landing: '/',
  login: '/login',
  register: '/register',
  forgot: '/forgot',
  reset: '/reset',
  verifyEmail: '/verify-email',
  terms: '/terms',
  privacy: '/privacy',

  // Public marketing pages (multi-page landing). `legislation` is the PUBLIC
  // regulations/blog page - distinct from the protected `/regulations` dashboard.
  about: '/about',
  contact: '/contact',
  pricing: '/pricing',
  legislation: '/legislation',

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
  privacy: '/privacy' as const,

  about: '/about' as const,
  contact: '/contact' as const,
  pricing: '/pricing' as const,
  legislation: '/legislation' as const,

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
} as const;
