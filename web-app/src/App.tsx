import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
            <Route path="/inspections/:id" element={<Shell><InspectionDetail /></Shell>} />
            <Route path="/certificates" element={<Shell><Certificates /></Shell>} />
            <Route path="/calendar" element={<Shell><Calendar /></Shell>} />
            <Route path="/regulations" element={<Shell><Regulations /></Shell>} />
            <Route path="/account" element={<Shell><Account /></Shell>} />
            <Route path="/briefings" element={<Shell><Briefings /></Shell>} />
            <Route path="/briefings/:id" element={<Shell><BriefingDetail /></Shell>} />
            <Route path="/incidents" element={<Shell><Incidents /></Shell>} />
            <Route path="/incidents/:id" element={<Shell><IncidentDetail /></Shell>} />
            <Route path="/reports" element={<Shell><Reports /></Shell>} />
            <Route path="/reports/:id" element={<Shell><ReportDetail /></Shell>} />
            <Route path="/qualifications" element={<Shell><Qualifications /></Shell>} />
            <Route path="/templates" element={<Shell><Templates /></Shell>} />
            <Route path="/terms" element={<Shell><Terms /></Shell>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
}
