import { create } from 'zustand';

interface AppState {
  selectedPartId: string | null;
  hoveredPartId: string | null;
  isPanelOpen: boolean;
  cameraTarget: [number, number, number] | null;
  setSelectedPart: (id: string | null) => void;
  setHoveredPart: (id: string | null) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setCameraTarget: (target: [number, number, number] | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedPartId: null,
  hoveredPartId: null,
  isPanelOpen: true,
  cameraTarget: null,
  setSelectedPart: (id) =>
    set((state) => ({
      selectedPartId: id,
      isPanelOpen: id !== null ? true : state.isPanelOpen,
      cameraTarget: id !== null ? null : state.cameraTarget,
    })),
  setHoveredPart: (id) => set({ hoveredPartId: id }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setPanelOpen: (open) => set({ isPanelOpen: open }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
}));
