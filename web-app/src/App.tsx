import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Forgot from '@/pages/auth/Forgot';
import Reset from '@/pages/auth/Reset';
import Home from '@/pages/Home';
import Subscribe from '@/pages/Subscribe';
import SubscribeSuccess from '@/pages/SubscribeSuccess';
import SubscribeFail from '@/pages/SubscribeFail';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Inspections from '@/pages/Inspections';
import InspectionDetail from '@/pages/InspectionDetail';
import Certificates from '@/pages/Certificates';

// HashRouter — GitHub Pages only honors 404.html at the site root, not in
// subdirectories like /Sarke2.0/app/, so deep BrowserRouter links 404 in
// production. Hash routing sidesteps this entirely (everything after `#` is
// client-side). Same pattern as web/sarke-sign.
function Shell({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/subscribe/success" element={<SubscribeSuccess />} />
          <Route path="/subscribe/fail" element={<SubscribeFail />} />
          <Route path="/" element={<Shell><Home /></Shell>} />
          <Route path="/projects" element={<Shell><Projects /></Shell>} />
          <Route path="/projects/:id" element={<Shell><ProjectDetail /></Shell>} />
          <Route path="/inspections" element={<Shell><Inspections /></Shell>} />
          <Route path="/inspections/:id" element={<Shell><InspectionDetail /></Shell>} />
          <Route path="/certificates" element={<Shell><Certificates /></Shell>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
