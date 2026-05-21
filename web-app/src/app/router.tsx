import { HashRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth';
import { listProjects } from '@/lib/data/projects';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { SkeletonList } from '@/components/SkeletonCard';
import { CommandPalette } from '@/components/cmdk';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { projectKeys } from '@/app/queryKeys';
import { routePattern, routes } from '@/app/routes';

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
const NewIncident = lazy(() => import('@/pages/NewIncident'));
const NewBriefing = lazy(() => import('@/pages/NewBriefing'));
const NewReport = lazy(() => import('@/pages/NewReport'));
const NewBobcatInspection = lazy(() => import('@/pages/NewBobcatInspection'));
const BobcatInspectionDetail = lazy(() => import('@/features/inspections/equipment/BobcatDetail'));
const NewGeneralEquipmentInspection = lazy(() => import('@/pages/NewGeneralEquipmentInspection'));
const GeneralEquipmentInspectionDetail = lazy(() => import('@/features/inspections/equipment/GeneralEquipmentDetail'));
const NewExcavatorInspection = lazy(() => import('@/pages/NewExcavatorInspection'));
const ExcavatorInspectionDetail = lazy(() => import('@/features/inspections/equipment/ExcavatorDetail'));
const NewCargoPlatformInspection = lazy(() => import('@/pages/NewCargoPlatformInspection'));
const CargoPlatformInspectionDetail = lazy(() => import('@/features/inspections/equipment/CargoPlatformDetail'));
const HarnessInspectionDetail = lazy(() => import('@/pages/HarnessInspectionDetail'));
const CargoPlatformPrint = lazy(() => import('@/pages/print/CargoPlatformPrint'));
const NewOrder = lazy(() => import('@/pages/NewOrder'));
const OrderDetail = lazy(() => import('@/pages/OrderDetail'));
const IncidentPrint = lazy(() => import('@/pages/print/IncidentPrint'));
const BriefingPrint = lazy(() => import('@/pages/print/BriefingPrint'));
const ReportPrint = lazy(() => import('@/pages/print/ReportPrint'));
const InspectionPrint = lazy(() => import('@/pages/print/InspectionPrint'));
const BobcatPrint = lazy(() => import('@/pages/print/BobcatPrint'));
const GeneralEquipmentPrint = lazy(() => import('@/pages/print/GeneralEquipmentPrint'));
const ExcavatorPrint = lazy(() => import('@/pages/print/ExcavatorPrint'));

const Subscribe = lazy(() => import('@/pages/Subscribe'));
const SubscribeSuccess = lazy(() => import('@/pages/SubscribeSuccess'));
const SubscribeFail = lazy(() => import('@/pages/SubscribeFail'));
const Inspections = lazy(() => import('@/pages/Inspections'));
const InspectionDetail = lazy(() => import('@/pages/InspectionDetail'));
const Certificates = lazy(() => import('@/pages/Certificates'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Regulations = lazy(() => import('@/pages/Regulations'));
const Account = lazy(() => import('@/pages/Account'));
const Briefings = lazy(() => import('@/pages/Briefings'));
const BriefingDetail = lazy(() => import('@/pages/BriefingDetail'));
const Incidents = lazy(() => import('@/pages/Incidents'));
const IncidentDetail = lazy(() => import('@/pages/IncidentDetail'));
const Reports = lazy(() => import('@/pages/Reports'));
const ReportDetail = lazy(() => import('@/pages/ReportDetail'));
const Qualifications = lazy(() => import('@/pages/Qualifications'));
const Templates = lazy(() => import('@/pages/Templates'));
const Terms = lazy(() => import('@/pages/Terms'));
const SafetyGuidePage = lazy(() => import('@/pages/SafetyGuidePage'));
const History = lazy(() => import('@/pages/History'));
const Orders = lazy(() => import('@/pages/Orders'));
const ProjectFiles = lazy(() => import('@/pages/ProjectFiles'));

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
  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}

/** Protected layout WITHOUT the AppShell — for print views. */
function ProtectedBareLayout() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
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

/** Eagerly-loaded shell pages — Home, Projects, ProjectDetail render
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
          {/* Public — eager (auth shells are small) */}
          <Route path={routePattern.landing} element={<Landing />} />
          <Route path={routePattern.login} element={<Login />} />
          <Route path={routePattern.register} element={<Register />} />
          <Route path={routePattern.forgot} element={<Forgot />} />
          <Route path={routePattern.reset} element={<Reset />} />
          <Route path={routePattern.verifyEmail} element={<VerifyEmail />} />

          {/* Public — lazy */}
          <Route element={<PublicLazyLayout />}>
            <Route path={routePattern.subscribe} element={<Subscribe />} />
            <Route path={routePattern.subscribeSuccess} element={<SubscribeSuccess />} />
            <Route path={routePattern.subscribeFail} element={<SubscribeFail />} />
            <Route path={routePattern.safetyStandalone} element={<SafetyGuidePage standalone />} />
          </Route>

          {/* Protected — full app shell */}
          <Route element={<ProtectedShellLayout />}>
            <Route path={routePattern.home} element={<Home />} />
            <Route path={routePattern.account} element={<Account />} />
            <Route path={routePattern.calendar} element={<Calendar />} />
            <Route path={routePattern.certificates} element={<Certificates />} />
            <Route path={routePattern.regulations} element={<Regulations />} />
            <Route path={routePattern.qualifications} element={<Qualifications />} />
            <Route path={routePattern.templates} element={<Templates />} />
            <Route path={routePattern.terms} element={<Terms />} />
            <Route path={routePattern.history} element={<History />} />
            <Route path={routePattern.safety} element={<SafetyGuidePage />} />

            <Route path={routePattern.projects} element={<Projects />} />
            <Route path={routePattern.projectNew} element={<NewProject />} />
            <Route path={routePattern.projectEdit} element={<EditProject />} />
            <Route path={routePattern.projectDetail} element={<ProjectDetail />} />
            <Route path={routePattern.projectFiles} element={<ProjectFiles />} />

            <Route path={routePattern.inspections} element={<Inspections />} />
            <Route path="/inspections/new" element={<Navigate to={routes.inspections.list()} replace />} />
            <Route path="/inspections/draft" element={<Navigate to={routes.inspections.list()} replace />} />
            <Route path={routePattern.inspectionDetail} element={<InspectionDetail />} />

            <Route path={routePattern.bobcatNew} element={<NewBobcatInspection />} />
            <Route path="/bobcat/draft" element={<Navigate to={routes.inspections.list()} replace />} />
            <Route path={routePattern.bobcatDetail} element={<BobcatInspectionDetail />} />

            <Route path={routePattern.generalEquipmentNew} element={<NewGeneralEquipmentInspection />} />
            <Route path="/general-equipment/draft" element={<Navigate to={routes.inspections.list()} replace />} />
            <Route path={routePattern.generalEquipmentDetail} element={<GeneralEquipmentInspectionDetail />} />

            <Route path={routePattern.excavatorNew} element={<NewExcavatorInspection />} />
            <Route path="/excavator/draft" element={<Navigate to={routes.inspections.list()} replace />} />
            <Route path={routePattern.excavatorDetail} element={<ExcavatorInspectionDetail />} />

            <Route path={routePattern.cargoPlatformNew} element={<NewCargoPlatformInspection />} />
            <Route path="/cargo-platform/draft" element={<Navigate to={routes.inspections.list()} replace />} />
            <Route path={routePattern.cargoPlatformDetail} element={<CargoPlatformInspectionDetail />} />

            <Route path="/harness/draft" element={<Navigate to={routes.inspections.list()} replace />} />
            <Route path={routePattern.harnessDetail} element={<HarnessInspectionDetail />} />

            <Route path={routePattern.orders} element={<Orders />} />
            <Route path={routePattern.orderNew} element={<NewOrder />} />
            <Route path={routePattern.orderDetail} element={<OrderDetail />} />

            <Route path={routePattern.briefings} element={<Briefings />} />
            <Route path={routePattern.briefingNew} element={<NewBriefing />} />
            <Route path={routePattern.briefingDetail} element={<BriefingDetail />} />

            <Route path={routePattern.incidents} element={<Incidents />} />
            <Route path={routePattern.incidentNew} element={<NewIncident />} />
            <Route path={routePattern.incidentDetail} element={<IncidentDetail />} />

            <Route path={routePattern.reports} element={<Reports />} />
            <Route path={routePattern.reportNew} element={<NewReport />} />
            <Route path={routePattern.reportDetail} element={<ReportDetail />} />
          </Route>

          {/* Protected — bare (print views, no shell chrome) */}
          <Route element={<ProtectedBareLayout />}>
            <Route path={routePattern.incidentPrint} element={<IncidentPrint />} />
            <Route path={routePattern.briefingPrint} element={<BriefingPrint />} />
            <Route path={routePattern.reportPrint} element={<ReportPrint />} />
            <Route path={routePattern.inspectionPrint} element={<InspectionPrint />} />
            <Route path={routePattern.bobcatPrint} element={<BobcatPrint />} />
            <Route path={routePattern.generalEquipmentPrint} element={<GeneralEquipmentPrint />} />
            <Route path={routePattern.excavatorPrint} element={<ExcavatorPrint />} />
            <Route path={routePattern.cargoPlatformPrint} element={<CargoPlatformPrint />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
