import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import '@/styles/safety-guide.css';

const Scene3D = lazy(() => import('@/components/Scene3D'));
const SidePanel = lazy(() => import('@/components/SidePanel'));

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
      <div className="sg-spinner" />
      <span className="text-[13px] text-neutral-600 dark:text-neutral-400">Loading 3D Scene...</span>
    </div>
  );
}

export default function SafetyGuidePage({ standalone }: { standalone?: boolean }) {
  return (
    <div className="sg-page">
      {!standalone && (
        <div className="sg-page__topbar">
          <Link to="/" className="sg-page__back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            მთავარი
          </Link>
          <h1 className="sg-page__heading">3D უსაფრთხოების სახელმძღვანელო</h1>
        </div>
      )}
      <main className="sg-page__main">
        <Suspense fallback={<LoadingScreen />}>
          <Scene3D />
          <SidePanel />
        </Suspense>
      </main>
    </div>
  );
}
