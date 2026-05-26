import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSafetyStore } from '@/store/safetyStore';
import {
  useSelectedPartId,
  useHoveredPartId,
  useIsPanelOpen,
  useCameraTarget,
  useSafetyActions,
} from '@/store/useSafetySelectors';

beforeEach(() => {
  useSafetyStore.setState({ selectedPartId: null, hoveredPartId: null, isPanelOpen: true, cameraTarget: null });
});

describe('safety selectors', () => {
  it('expose the current store slices', () => {
    expect(renderHook(() => useSelectedPartId()).result.current).toBeNull();
    expect(renderHook(() => useHoveredPartId()).result.current).toBeNull();
    expect(renderHook(() => useIsPanelOpen()).result.current).toBe(true);
    expect(renderHook(() => useCameraTarget()).result.current).toBeNull();
  });

  it('useSafetyActions returns memoized action functions (no infinite loop)', () => {
    const { result } = renderHook(() => useSafetyActions());
    expect(typeof result.current.setSelectedPart).toBe('function');
    expect(typeof result.current.togglePanel).toBe('function');
    expect(typeof result.current.setCameraTarget).toBe('function');
  });

  it('selectors react to store updates', () => {
    const { result } = renderHook(() => useSelectedPartId());
    act(() => useSafetyStore.getState().setSelectedPart('crane-boom'));
    expect(result.current).toBe('crane-boom');
  });
});
