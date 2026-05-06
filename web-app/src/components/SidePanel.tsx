import { useEffect } from 'react';
import { useAppStore } from '@/store/safetyStore';
import { safetyTips } from '@/data/safetyTips';

const severityStyles: Record<string, { class: string; label: string }> = {
  critical: { class: 'sg-badge--critical', label: 'Critical' },
  high: { class: 'sg-badge--high', label: 'High' },
  medium: { class: 'sg-badge--medium', label: 'Medium' },
  low: { class: 'sg-badge--low', label: 'Low' },
};

const categoryStyles: Record<string, { class: string; label: string }> = {
  hazard: { class: 'sg-badge--hazard', label: 'Hazard' },
  ppe: { class: 'sg-badge--ppe', label: 'PPE' },
  procedure: { class: 'sg-badge--procedure', label: 'Procedure' },
  compliance: { class: 'sg-badge--compliance', label: 'Compliance' },
};

export default function SidePanel() {
  const { selectedPartId, isPanelOpen, setPanelOpen, setSelectedPart } = useAppStore();
  const tip = selectedPartId ? safetyTips[selectedPartId] : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPart(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedPart]);

  if (!isPanelOpen) {
    return (
      <button
        onClick={() => setPanelOpen(true)}
        className="sg-panel-toggle"
        aria-label="Open safety panel"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    );
  }

  return (
    <div className="sg-panel">
      <div className="sg-panel__header">
        <div className="sg-panel__title">
          <div className="sg-panel__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <div>
            <h2>Safety Guide</h2>
            <p>{tip ? 'Part Selected' : 'Select a construction part'}</p>
          </div>
        </div>
        <button onClick={() => setPanelOpen(false)} className="sg-panel__close" aria-label="Close panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="sg-panel__body">
        {!tip ? (
          <div className="sg-empty">
            <div className="sg-empty__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h3>Interactive 3D Safety Guide</h3>
            <p>Click on any construction element in the 3D scene to view detailed safety instructions, hazard information, and compliance requirements.</p>
            <div className="sg-empty__list">
              {Object.values(safetyTips).slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  onClick={() => useAppStore.getState().setSelectedPart(t.id)}
                  className="sg-empty__item"
                >
                  <span className={`sg-dot sg-dot--${t.severity}`} />
                  <span>{t.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="sg-content">
            <div className="sg-content__header">
              <h3>{tip.title}</h3>
              <div className="sg-badges">
                <span className={`sg-badge ${severityStyles[tip.severity].class}`}>
                  {severityStyles[tip.severity].label} Severity
                </span>
                <span className={`sg-badge ${categoryStyles[tip.category].class}`}>
                  {categoryStyles[tip.category].label}
                </span>
              </div>
            </div>

            <div className="sg-section">
              <h4 className="sg-section__title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Description
              </h4>
              <p className="sg-text sg-text--lead">{tip.shortDescription}</p>
              <p className="sg-text">{tip.fullDescription}</p>
            </div>

            <div className="sg-section">
              <h4 className="sg-section__title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                Safety Checklist
              </h4>
              <ul className="sg-checklist">
                {tip.checklist.map((item, i) => (
                  <li key={i} className="sg-checklist__item">
                    <span className="sg-checklist__box" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sg-section">
              <h4 className="sg-section__title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                Regulatory References
              </h4>
              <div className="sg-regs">
                {tip.regulations.map((reg, i) => (
                  <div key={i} className="sg-reg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <span>{reg}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sg-actions">
              <button
                onClick={() => {
                  const nextIds = Object.keys(safetyTips);
                  const currentIdx = nextIds.indexOf(tip.id);
                  const nextId = nextIds[(currentIdx + 1) % nextIds.length];
                  useAppStore.getState().setSelectedPart(nextId);
                }}
                className="sg-btn sg-btn--primary"
              >
                Next Topic
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <button onClick={() => setSelectedPart(null)} className="sg-btn sg-btn--secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
