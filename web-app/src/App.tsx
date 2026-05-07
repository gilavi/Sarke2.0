import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';

// Eager: auth + home + the two highest-traffic pages.
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Forgot from '@/pages/auth/Forgot';
import Reset from '@/pages/auth/Reset';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import Home from '@/pages/Home';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
const NewProject = lazy(() => import('@/pages/NewProject'));
const NewIncident = lazy(() => import('@/pages/NewIncident'));
const NewBriefing = lazy(() => import('@/pages/NewBriefing'));
const NewReport = lazy(() => import('@/pages/NewReport'));
const NewInspection = lazy(() => import('@/pages/NewInspection'));
const NewBobcatInspection = lazy(() => import('@/pages/NewBobcatInspection'));
const BobcatInspectionDetail = lazy(() => import('@/pages/BobcatInspectionDetail'));
const NewGeneralEquipmentInspection = lazy(() => import('@/pages/NewGeneralEquipmentInspection'));
const GeneralEquipmentInspectionDetail = lazy(() => import('@/pages/GeneralEquipmentInspectionDetail'));
const NewExcavatorInspection = lazy(() => import('@/pages/NewExcavatorInspection'));
const ExcavatorInspectionDetail = lazy(() => import('@/pages/ExcavatorInspectionDetail'));
const IncidentPrint = lazy(() => import('@/pages/print/IncidentPrint'));
const BriefingPrint = lazy(() => import('@/pages/print/BriefingPrint'));
const ReportPrint = lazy(() => import('@/pages/print/ReportPrint'));
const InspectionPrint = lazy(() => import('@/pages/print/InspectionPrint'));
const BobcatPrint = lazy(() => import('@/pages/print/BobcatPrint'));
const GeneralEquipmentPrint = lazy(() => import('@/pages/print/GeneralEquipmentPrint'));
const ExcavatorPrint = lazy(() => import('@/pages/print/ExcavatorPrint'));

// Lazy: everything else. Smaller initial bundle = faster first paint.
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

// HashRouter — GitHub Pages only honors 404.html at the site root, not in
// subdirectories like /Sarke2.0/app/, so deep BrowserRouter links 404 in
// production. Hash routing sidesteps this entirely (everything after `#` is
// client-side). Same pattern as web/sarke-sign.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      placeholderData: (prev: unknown) => prev,
    },
  },
});

function PageFallback() {
  return <p className="text-sm text-neutral-500">იტვირთება…</p>;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="bottom-right" richColors />
      <HashRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/reset" element={<Reset />} />
            <Route
              path="/verify-email"
              element={<VerifyEmail />}
            />
            <Route
              path="/subscribe"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Subscribe />
                </Suspense>
              }
            />
            <Route
              path="/subscribe/success"
              element={
                <Suspense fallback={<PageFallback />}>
                  <SubscribeSuccess />
                </Suspense>
              }
            />
            <Route
              path="/subscribe/fail"
              element={
                <Suspense fallback={<PageFallback />}>
                  <SubscribeFail />
                </Suspense>
              }
            />
            <Route path="/" element={<Shell><Home /></Shell>} />
            <Route path="/projects" element={<Shell><Projects /></Shell>} />
            <Route path="/projects/new" element={<Shell><NewProject /></Shell>} />
            <Route path="/projects/:id" element={<Shell><ProjectDetail /></Shell>} />
            <Route path="/inspections" element={<Shell><Inspections /></Shell>} />
            <Route path="/inspections/new" element={<Shell><NewInspection /></Shell>} />
            <Route path="/inspections/:id" element={<Shell><InspectionDetail /></Shell>} />
            <Route path="/bobcat/new" element={<Shell><NewBobcatInspection /></Shell>} />
            <Route path="/bobcat/:id" element={<Shell><BobcatInspectionDetail /></Shell>} />
            <Route path="/general-equipment/new" element={<Shell><NewGeneralEquipmentInspection /></Shell>} />
            <Route path="/general-equipment/:id" element={<Shell><GeneralEquipmentInspectionDetail /></Shell>} />
            <Route path="/excavator/new" element={<Shell><NewExcavatorInspection /></Shell>} />
            <Route path="/excavator/:id" element={<Shell><ExcavatorInspectionDetail /></Shell>} />
            <Route
              path="/incidents/:id/print"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageFallback />}>
                    <IncidentPrint />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/briefings/:id/print"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageFallback />}>
                    <BriefingPrint />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/:id/print"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageFallback />}>
                    <ReportPrint />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/:id/print"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageFallback />}>
                    <InspectionPrint />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bobcat/:id/print"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageFallback />}>
                    <BobcatPrint />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/general-equipment/:id/print"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageFallback />}>
                    <GeneralEquipmentPrint />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/excavator/:id/print"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageFallback />}>
                    <ExcavatorPrint />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route path="/certificates" element={<Shell><Certificates /></Shell>} />
            <Route path="/calendar" element={<Shell><Calendar /></Shell>} />
            <Route path="/regulations" element={<Shell><Regulations /></Shell>} />
            <Route path="/account" element={<Shell><Account /></Shell>} />
            <Route path="/briefings" element={<Shell><Briefings /></Shell>} />
            <Route path="/briefings/new" element={<Shell><NewBriefing /></Shell>} />
            <Route path="/briefings/:id" element={<Shell><BriefingDetail /></Shell>} />
            <Route path="/incidents" element={<Shell><Incidents /></Shell>} />
            <Route path="/incidents/new" element={<Shell><NewIncident /></Shell>} />
            <Route path="/incidents/:id" element={<Shell><IncidentDetail /></Shell>} />
            <Route path="/reports" element={<Shell><Reports /></Shell>} />
            <Route path="/reports/new" element={<Shell><NewReport /></Shell>} />
            <Route path="/reports/:id" element={<Shell><ReportDetail /></Shell>} />
            <Route path="/qualifications" element={<Shell><Qualifications /></Shell>} />
            <Route path="/templates" element={<Shell><Templates /></Shell>} />
            <Route path="/terms" element={<Shell><Terms /></Shell>} />
            <Route
              path="/safety"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageFallback />}>
                    <SafetyGuidePage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
}
