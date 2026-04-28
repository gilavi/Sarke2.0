import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Forgot from '@/pages/auth/Forgot';
import Reset from '@/pages/auth/Reset';
import Home from '@/pages/Home';

const BASE = '/Sarke2.0/app';

// Pairs with public/404.html — when GitHub Pages 404-redirects a deep link
// it puts the original path in `?/path`. Restore it to the URL bar.
function GhPagesRedirectFix() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const match = location.search.match(/^\?\/([^&]*)(.*)/);
    if (!match) return;
    const path = match[1].replace(/~and~/g, '&');
    const search = match[2] ? '?' + match[2].slice(1).replace(/~and~/g, '&') : '';
    navigate(`/${path}${search}${location.hash}`, { replace: true });
  }, [location, navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename={BASE}>
      <AuthProvider>
        <GhPagesRedirectFix />
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
    </BrowserRouter>
  );
}
