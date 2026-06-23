import { describe, it, expect, vi, beforeEach } from 'vitest';

// NetInfo is a native module; under jsdom we mock it with an in-memory state
// that `fetch()` resolves to, plus an `addEventListener` spy that records the
// listener and hands back a stable unsubscribe handle.
type NetState = {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
};

let fetchState: NetState = {};
let lastListener: ((state: NetState) => void) | null = null;
const unsubscribe = vi.fn();

const fetchMock = vi.fn(async () => fetchState);
const addEventListenerMock = vi.fn((listener: (state: NetState) => void) => {
  lastListener = listener;
  return unsubscribe;
});

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: fetchMock,
    addEventListener: addEventListenerMock,
  },
}));

const { isOnline, watchNetwork } = await import('../../lib/network');

beforeEach(() => {
  fetchState = {};
  lastListener = null;
  fetchMock.mockClear();
  addEventListenerMock.mockClear();
  unsubscribe.mockClear();
});

describe('isOnline', () => {
  it('returns true when connected AND internet reachable', async () => {
    fetchState = { isConnected: true, isInternetReachable: true };
    expect(await isOnline()).toBe(true);
  });

  it('returns false when connected but internet explicitly NOT reachable', async () => {
    fetchState = { isConnected: true, isInternetReachable: false };
    expect(await isOnline()).toBe(false);
  });

  it('returns true when connected and reachability is null (not strictly false)', async () => {
    fetchState = { isConnected: true, isInternetReachable: null };
    expect(await isOnline()).toBe(true);
  });

  it('returns true when connected and reachability is undefined (not strictly false)', async () => {
    fetchState = { isConnected: true, isInternetReachable: undefined };
    expect(await isOnline()).toBe(true);
  });

  it('returns false when not connected (isConnected false) even if reachable', async () => {
    fetchState = { isConnected: false, isInternetReachable: true };
    expect(await isOnline()).toBe(false);
  });

  it('returns false when not connected and not reachable', async () => {
    fetchState = { isConnected: false, isInternetReachable: false };
    expect(await isOnline()).toBe(false);
  });

  it('returns false when isConnected is null (=== true check is strict)', async () => {
    fetchState = { isConnected: null, isInternetReachable: true };
    expect(await isOnline()).toBe(false);
  });

  it('returns false when isConnected is undefined (=== true check is strict)', async () => {
    fetchState = { isConnected: undefined, isInternetReachable: true };
    expect(await isOnline()).toBe(false);
  });

  it('returns false for a fully empty state object', async () => {
    fetchState = {};
    expect(await isOnline()).toBe(false);
  });

  it('calls NetInfo.fetch exactly once per invocation', async () => {
    fetchState = { isConnected: true, isInternetReachable: true };
    await isOnline();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('watchNetwork', () => {
  it('wires NetInfo.addEventListener exactly once', () => {
    watchNetwork(() => {});
    expect(addEventListenerMock).toHaveBeenCalledTimes(1);
    expect(typeof lastListener).toBe('function');
  });

  it('returns the unsubscribe handle from addEventListener', () => {
    const handle = watchNetwork(() => {});
    expect(handle).toBe(unsubscribe);
  });

  it('maps connected + reachable to true', () => {
    const cb = vi.fn();
    watchNetwork(cb);
    lastListener!({ isConnected: true, isInternetReachable: true });
    expect(cb).toHaveBeenCalledWith(true);
  });

  it('maps connected + explicitly-not-reachable to false', () => {
    const cb = vi.fn();
    watchNetwork(cb);
    lastListener!({ isConnected: true, isInternetReachable: false });
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('maps connected + null reachability to true (not strictly false)', () => {
    const cb = vi.fn();
    watchNetwork(cb);
    lastListener!({ isConnected: true, isInternetReachable: null });
    expect(cb).toHaveBeenCalledWith(true);
  });

  it('maps connected + undefined reachability to true (not strictly false)', () => {
    const cb = vi.fn();
    watchNetwork(cb);
    lastListener!({ isConnected: true, isInternetReachable: undefined });
    expect(cb).toHaveBeenCalledWith(true);
  });

  it('maps not-connected to false regardless of reachability', () => {
    const cb = vi.fn();
    watchNetwork(cb);
    lastListener!({ isConnected: false, isInternetReachable: true });
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('maps null isConnected to false (strict === true)', () => {
    const cb = vi.fn();
    watchNetwork(cb);
    lastListener!({ isConnected: null, isInternetReachable: true });
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('maps an empty state object to false', () => {
    const cb = vi.fn();
    watchNetwork(cb);
    lastListener!({});
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('invokes the callback once per network state event', () => {
    const cb = vi.fn();
    watchNetwork(cb);
    lastListener!({ isConnected: true, isInternetReachable: true });
    lastListener!({ isConnected: false, isInternetReachable: false });
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenNthCalledWith(1, true);
    expect(cb).toHaveBeenNthCalledWith(2, false);
  });

  it('does not invoke the callback before any state event fires', () => {
    const cb = vi.fn();
    watchNetwork(cb);
    expect(cb).not.toHaveBeenCalled();
  });
});
