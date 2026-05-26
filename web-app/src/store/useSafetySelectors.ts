import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from './safetyStore';

export const useSelectedPartId = () => useAppStore((s) => s.selectedPartId);
export const useHoveredPartId = () => useAppStore((s) => s.hoveredPartId);
export const useIsPanelOpen = () => useAppStore((s) => s.isPanelOpen);
export const useCameraTarget = () => useAppStore((s) => s.cameraTarget);
// The action selector returns a fresh object literal on every call, so it needs
// `useShallow` — otherwise `useSyncExternalStore` sees a new snapshot each
// render and infinite-loops ("getSnapshot should be cached"). Bug fix: pre-shallow
// this hook would crash any component that consumed it.
export const useSafetyActions = () =>
  useAppStore(
    useShallow((s) => ({
      setSelectedPart: s.setSelectedPart,
      setHoveredPart: s.setHoveredPart,
      togglePanel: s.togglePanel,
      setPanelOpen: s.setPanelOpen,
      setCameraTarget: s.setCameraTarget,
    })),
  );
