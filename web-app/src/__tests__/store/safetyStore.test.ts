import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/safetyStore';

const reset = () =>
  useAppStore.setState({
    selectedPartId: null,
    hoveredPartId: null,
    isPanelOpen: true,
    cameraTarget: null,
  });

beforeEach(reset);

describe('safetyStore — initial state', () => {
  it('starts with no selected/hovered part, panel open, no cameraTarget', () => {
    const s = useAppStore.getState();
    expect(s.selectedPartId).toBeNull();
    expect(s.hoveredPartId).toBeNull();
    expect(s.isPanelOpen).toBe(true);
    expect(s.cameraTarget).toBeNull();
  });
});

describe('safetyStore — setSelectedPart', () => {
  it('sets selectedPartId', () => {
    useAppStore.getState().setSelectedPart('crane-boom');
    expect(useAppStore.getState().selectedPartId).toBe('crane-boom');
  });

  it('forces isPanelOpen to true when a part is selected', () => {
    useAppStore.setState({ isPanelOpen: false });
    useAppStore.getState().setSelectedPart('bucket');
    expect(useAppStore.getState().isPanelOpen).toBe(true);
  });

  it('does not change isPanelOpen when deselecting (null)', () => {
    useAppStore.setState({ isPanelOpen: false, selectedPartId: 'bucket' });
    useAppStore.getState().setSelectedPart(null);
    expect(useAppStore.getState().isPanelOpen).toBe(false);
  });
});

describe('safetyStore — setHoveredPart', () => {
  it('sets hoveredPartId', () => {
    useAppStore.getState().setHoveredPart('arm');
    expect(useAppStore.getState().hoveredPartId).toBe('arm');
  });

  it('clears hoveredPartId with null', () => {
    useAppStore.getState().setHoveredPart('arm');
    useAppStore.getState().setHoveredPart(null);
    expect(useAppStore.getState().hoveredPartId).toBeNull();
  });
});

describe('safetyStore — togglePanel', () => {
  it('flips isPanelOpen from true to false', () => {
    useAppStore.getState().togglePanel();
    expect(useAppStore.getState().isPanelOpen).toBe(false);
  });

  it('flips isPanelOpen from false to true', () => {
    useAppStore.setState({ isPanelOpen: false });
    useAppStore.getState().togglePanel();
    expect(useAppStore.getState().isPanelOpen).toBe(true);
  });
});

describe('safetyStore — setPanelOpen', () => {
  it('sets isPanelOpen to false', () => {
    useAppStore.getState().setPanelOpen(false);
    expect(useAppStore.getState().isPanelOpen).toBe(false);
  });

  it('sets isPanelOpen to true', () => {
    useAppStore.setState({ isPanelOpen: false });
    useAppStore.getState().setPanelOpen(true);
    expect(useAppStore.getState().isPanelOpen).toBe(true);
  });
});

describe('safetyStore — setCameraTarget', () => {
  it('stores the camera target tuple', () => {
    useAppStore.getState().setCameraTarget([1, 2, 3]);
    expect(useAppStore.getState().cameraTarget).toEqual([1, 2, 3]);
  });

  it('clears the camera target with null', () => {
    useAppStore.getState().setCameraTarget([1, 2, 3]);
    useAppStore.getState().setCameraTarget(null);
    expect(useAppStore.getState().cameraTarget).toBeNull();
  });
});
