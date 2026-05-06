import Scene3D from '../components/Scene3D';
import SidePanel from '../components/SidePanel';

export default function SafetyGuidePage() {
  return (
    <div className="sg-page">
      <main className="sg-page__main">
        <Scene3D />
        <SidePanel />
      </main>
    </div>
  );
}
