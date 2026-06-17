import { describe, it, expect, beforeEach } from 'vitest';
import { useSafetyStore } from '@/store/safetyStore';

const reset = () =>
  useSafetyStore.setState({
    selectedPartId: null,
    hoveredPartId: null,
    isPanelOpen: true,
    cameraTarget: null,
  });

beforeEach(reset);

describe('safetyStore - initial state', () => {
  it('starts with no selected/hovered part, panel open, no cameraTarget', () => {
    const s = useSafetyStore.getState();
    expect(s.selectedPartId).toBeNull();
    expect(s.hoveredPartId).toBeNull();
    expect(s.isPanelOpen).toBe(true);
    expect(s.cameraTarget).toBeNull();
  });
});

describe('safetyStore - setSelectedPart', () => {
  it('sets selectedPartId', () => {
    useSafetyStore.getState().setSelectedPart('crane-boom');
    expect(useSafetyStore.getState().selectedPartId).toBe('crane-boom');
  });

  it('forces isPanelOpen to true when a part is selected', () => {
    useSafetyStore.setState({ isPanelOpen: false });
    useSafetyStore.getState().setSelectedPart('bucket');
    expect(useSafetyStore.getState().isPanelOpen).toBe(true);
  });

  it('does not change isPanelOpen when deselecting (null)', () => {
    useSafetyStore.setState({ isPanelOpen: false, selectedPartId: 'bucket' });
    useSafetyStore.getState().setSelectedPart(null);
    expect(useSafetyStore.getState().isPanelOpen).toBe(false);
  });
});

describe('safetyStore - setHoveredPart', () => {
  it('sets hoveredPartId', () => {
    useSafetyStore.getState().setHoveredPart('arm');
    expect(useSafetyStore.getState().hoveredPartId).toBe('arm');
  });

  it('clears hoveredPartId with null', () => {
    useSafetyStore.getState().setHoveredPart('arm');
    useSafetyStore.getState().setHoveredPart(null);
    expect(useSafetyStore.getState().hoveredPartId).toBeNull();
  });
});

describe('safetyStore - togglePanel', () => {
  it('flips isPanelOpen from true to false', () => {
    useSafetyStore.getState().togglePanel();
    expect(useSafetyStore.getState().isPanelOpen).toBe(false);
  });

  it('flips isPanelOpen from false to true', () => {
    useSafetyStore.setState({ isPanelOpen: false });
    useSafetyStore.getState().togglePanel();
    expect(useSafetyStore.getState().isPanelOpen).toBe(true);
  });
});

describe('safetyStore - setPanelOpen', () => {
  it('sets isPanelOpen to false', () => {
    useSafetyStore.getState().setPanelOpen(false);
    expect(useSafetyStore.getState().isPanelOpen).toBe(false);
  });

  it('sets isPanelOpen to true', () => {
    useSafetyStore.setState({ isPanelOpen: false });
    useSafetyStore.getState().setPanelOpen(true);
    expect(useSafetyStore.getState().isPanelOpen).toBe(true);
  });
});

describe('safetyStore - setCameraTarget', () => {
  it('stores the camera target tuple', () => {
    useSafetyStore.getState().setCameraTarget([1, 2, 3]);
    expect(useSafetyStore.getState().cameraTarget).toEqual([1, 2, 3]);
  });

  it('clears the camera target with null', () => {
    useSafetyStore.getState().setCameraTarget([1, 2, 3]);
    useSafetyStore.getState().setCameraTarget(null);
    expect(useSafetyStore.getState().cameraTarget).toBeNull();
  });
});
