import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import '@/styles/safety-guide.css';

const Scene3D = lazy(() => import('@/components/Scene3D'));
const SidePanel = lazy(() => import('@/components/SidePanel'));

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
      <div className="sg-spinner" />
      <span style={{ fontSize: 13, color: '#4a4a4a' }}>Loading 3D Scene...</span>
    </div>
  );
}

export default function SafetyGuidePage() {
  return (
    <div className="sg-page">
      <div className="sg-page__topbar">
        <Link to="/" className="sg-page__back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Dashboard
        </Link>
        <h1 className="sg-page__heading">3D Safety Guide</h1>
      </div>
      <main className="sg-page__main">
        <Suspense fallback={<LoadingScreen />}>
          <Scene3D />
          <SidePanel />
        </Suspense>
      </main>
    </div>
  );
}
