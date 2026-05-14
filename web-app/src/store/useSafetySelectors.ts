import { useAppStore } from './safetyStore';

export const useSelectedPartId = () => useAppStore((s) => s.selectedPartId);
export const useHoveredPartId = () => useAppStore((s) => s.hoveredPartId);
export const useIsPanelOpen = () => useAppStore((s) => s.isPanelOpen);
export const useCameraTarget = () => useAppStore((s) => s.cameraTarget);
export const useSafetyActions = () =>
  useAppStore((s) => ({
    setSelectedPart: s.setSelectedPart,
    setHoveredPart: s.setHoveredPart,
    togglePanel: s.togglePanel,
    setPanelOpen: s.setPanelOpen,
    setCameraTarget: s.setCameraTarget,
  }));
