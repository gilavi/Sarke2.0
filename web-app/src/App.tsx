import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Forgot from '@/pages/auth/Forgot';
import Reset from '@/pages/auth/Reset';
import Home from '@/pages/Home';

// HashRouter — GitHub Pages only honors 404.html at the site root, not in
// subdirectories like /Sarke2.0/app/, so deep BrowserRouter links 404 in
// production. Hash routing sidesteps this entirely (everything after `#` is
// client-side). Same pattern as web/sarke-sign.
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Home />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
