import { HashRouter, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DURATION, EASE } from '@/lib/animations';
import { useQueryClient } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth';
import { listProjects } from '@/lib/data/projects';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { SkeletonList } from '@/components/SkeletonCard';
import { CommandPalette } from '@/components/cmdk';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { projectKeys } from '@/app/queryKeys';
import { routePattern } from '@/app/routes';

// Eager: auth screens + landing + the highest-traffic shell pages.
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Forgot from '@/pages/auth/Forgot';
import Reset from '@/pages/auth/Reset';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import Landing from '@/pages/Landing';
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';

const NewProject = lazy(() => import('@/pages/NewProject'));
const EditProject = lazy(() => import('@/pages/EditProject'));
const Certificates = lazy(() => import('@/pages/Certificates'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Regulations = lazy(() => import('@/pages/Regulations'));
const Account = lazy(() => import('@/pages/Account'));
const Qualifications = lazy(() => import('@/pages/Qualifications'));
const Templates = lazy(() => import('@/pages/Templates'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const SafetyGuidePage = lazy(() => import('@/pages/SafetyGuidePage'));
const History = lazy(() => import('@/pages/History'));
const ProjectFiles = lazy(() => import('@/pages/ProjectFiles'));
const InspectionPrint = lazy(() => import('@/pages/print/InspectionPrint'));

// Public marketing pages (the landing is multi-page). Landing stays eager
// (first paint); the rest are lazy under MarketingLayout's Suspense boundary.
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const PricingPage = lazy(() => import('@/pages/Pricing'));
const Legislation = lazy(() => import('@/pages/Legislation'));

const DesignSystemCheck = lazy(() => import('@/pages/DesignSystemCheck'));
const Subscribe = lazy(() => import('@/pages/Subscribe'));
const SubscribeSuccess = lazy(() => import('@/pages/SubscribeSuccess'));
const SubscribeFail = lazy(() => import('@/pages/SubscribeFail'));

function PageFallback() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse h-8 w-48 rounded bg-neutral-200" />
      <SkeletonList count={3} />
    </div>
  );
}

/**
 * Layout for protected pages inside the AppShell. Mounted once; child routes
 * render into <Outlet />. Replaces ~30 inline <Shell><Page/></Shell> wrappers.
 */
function ProtectedShellLayout() {
  const { pathname } = useLocation();
  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense fallback={<PageFallback />}>
          {/* Crossfade between pages. Keyed on pathname so each navigation re-mounts
              and fades/slides in. MotionConfig reducedMotion="user" reduces this to a
              plain opacity fade for users who ask for reduced motion. */}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.normal, ease: EASE.easeOut }}
          >
            <Outlet />
          </motion.div>
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}

/** Public layout with a lazy <Suspense> boundary. */
function PublicLazyLayout() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Outlet />
    </Suspense>
  );
}

/** Eagerly-loaded shell pages - Home, Projects, ProjectDetail render
 *  immediately without their own Suspense boundary. */
function PrefetchProjects() {
  const qc = useQueryClient();
  useLocation();
  useEffect(() => {
    const t = setTimeout(() => {
      qc.prefetchQuery({
        queryKey: projectKeys.lists(),
        queryFn: listProjects,
        staleTime: 5 * 60 * 1000,
      });
    }, 2000);
    return () => clearTimeout(t);
  }, [qc]);
  return null;
}

/**
 * Top-level router. All routing logic lives here so App.tsx can stay
 * focused on providers (QueryClient, Toaster).
 */
export function AppRouter() {
  return (
    <HashRouter>
      <AuthProvider>
        <PrefetchProjects />
        <CommandPalette />
        <WelcomeModal />
        <Routes>
          {/* Public marketing - shared MarketingLayout (navbar/footer/overlays).
              Landing is eager; About/Contact/Pricing/Legislation lazy-load via
              the layout's own Suspense boundary. */}
          <Route element={<MarketingLayout />}>
            <Route path={routePattern.landing} element={<Landing />} />
            <Route path={routePattern.about} element={<About />} />
            <Route path={routePattern.contact} element={<Contact />} />
            <Route path={routePattern.pricing} element={<PricingPage />} />
            <Route path={routePattern.legislation} element={<Legislation />} />
          </Route>

          {/* Public - eager (auth shells are small) */}
          <Route path={routePattern.login} element={<Login />} />
          <Route path={routePattern.register} element={<Register />} />
          <Route path={routePattern.forgot} element={<Forgot />} />
          <Route path={routePattern.reset} element={<Reset />} />
          <Route path={routePattern.verifyEmail} element={<VerifyEmail />} />

          {/* Public - lazy. Terms + Privacy must stay reachable logged-OUT
              (App Store Connect links the privacy policy URL directly) and
              logged-IN (Account links /terms), so they live here rather than
              under MarketingLayout (which bounces sessions to /home) or the
              protected shell. */}
          <Route element={<PublicLazyLayout />}>
            <Route path="/ds" element={<DesignSystemCheck />} />
            <Route path={routePattern.subscribe} element={<Subscribe />} />
            <Route path={routePattern.subscribeSuccess} element={<SubscribeSuccess />} />
            <Route path={routePattern.subscribeFail} element={<SubscribeFail />} />
            <Route path={routePattern.safetyStandalone} element={<SafetyGuidePage standalone />} />
            <Route path={routePattern.terms} element={<Terms />} />
            <Route path={routePattern.privacy} element={<Privacy />} />
          </Route>

          {/* Protected - full app shell */}
          <Route element={<ProtectedShellLayout />}>
            <Route path={routePattern.home} element={<Home />} />
            <Route path={routePattern.account} element={<Account />} />
            <Route path={routePattern.calendar} element={<Calendar />} />
            <Route path={routePattern.certificates} element={<Certificates />} />
            <Route path={routePattern.regulations} element={<Regulations />} />
            <Route path={routePattern.qualifications} element={<Qualifications />} />
            <Route path={routePattern.templates} element={<Templates />} />
            <Route path={routePattern.history} element={<History />} />
            <Route path={routePattern.safety} element={<SafetyGuidePage />} />

            <Route path={routePattern.projects} element={<Projects />} />
            <Route path={routePattern.projectNew} element={<NewProject />} />
            <Route path={routePattern.projectEdit} element={<EditProject />} />
            <Route path={routePattern.projectDetail} element={<ProjectDetail />} />
            <Route path={routePattern.projectFiles} element={<ProjectFiles />} />
            <Route path={routePattern.inspectionPrint} element={<InspectionPrint />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
