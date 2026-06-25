/**
 * Unit tests for useSignaturesState — the result-screen-scope signing state the
 * FlowSuccessScreen edit mode drives. Confirms: capturing the creator signature,
 * adding/removing blank co-signer slots (the "add person" / delete behavior),
 * and the post-PDF clear. No persistence here — pure in-memory state.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSignaturesState } from '../../features/signatures/useSignaturesState';

describe('useSignaturesState', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useSignaturesState());
    expect(result.current.creatorSignature).toBeNull();
    expect(result.current.additionalRows).toEqual([]);
  });

  it('captures and clears the creator signature', () => {
    const { result } = renderHook(() => useSignaturesState());
    act(() => result.current.setCreatorSignature('BASE64'));
    expect(result.current.creatorSignature?.pngBase64).toBe('BASE64');
    expect(result.current.creatorSignature?.capturedAt).toBeInstanceOf(Date);
    act(() => result.current.clearCreatorSignature());
    expect(result.current.creatorSignature).toBeNull();
  });

  it('adds and removes blank signing slots', () => {
    const { result } = renderHook(() => useSignaturesState());
    act(() => result.current.addRow());
    act(() => result.current.addRow());
    expect(result.current.additionalRows).toHaveLength(2);
    const removeId = result.current.additionalRows[0].id;
    act(() => result.current.removeRow(removeId));
    expect(result.current.additionalRows).toHaveLength(1);
    expect(result.current.additionalRows.find((r) => r.id === removeId)).toBeUndefined();
  });

  it('clear() wipes both the signature and the rows', () => {
    const { result } = renderHook(() => useSignaturesState());
    act(() => {
      result.current.setCreatorSignature('X');
      result.current.addRow();
    });
    act(() => result.current.clear());
    expect(result.current.creatorSignature).toBeNull();
    expect(result.current.additionalRows).toEqual([]);
  });
});
