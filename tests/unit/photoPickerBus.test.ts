import { describe, it, expect, vi, beforeEach } from 'vitest';

// photoPickerBus is a pure module (no native deps) but it holds module-level
// singleton state: the callback Maps, the lastToken/lastAnnotateToken markers,
// the _lastPhotoFromCapture flag, and a monotonic tokenCounter. To keep every
// test order-independent we vi.resetModules() and re-import a fresh copy of the
// module in beforeEach so the state always starts clean.
type Bus = typeof import('../../lib/photoPickerBus');

let bus: Bus;

beforeEach(async () => {
  vi.resetModules();
  bus = await import('../../lib/photoPickerBus');
});

describe('setPhotoPickerCallback / token issuance', () => {
  it('returns increasing tokens on successive registrations', () => {
    const t1 = bus.setPhotoPickerCallback(() => {});
    const t2 = bus.setPhotoPickerCallback(() => {});
    const t3 = bus.setPhotoPickerCallback(() => {});
    expect(t2).toBeGreaterThan(t1);
    expect(t3).toBeGreaterThan(t2);
  });

  it('starts the counter at 1 for the first picker token', () => {
    const t1 = bus.setPhotoPickerCallback(() => {});
    expect(t1).toBe(1);
  });

  it('shares the same monotonic counter between picker and annotate tokens', () => {
    const p = bus.setPhotoPickerCallback(() => {});
    const a = bus.setPhotoAnnotateCallback(() => {});
    expect(a).toBe(p + 1);
  });
});

describe('resolvePhotoPicker', () => {
  it('invokes the registered callback with the uris array', () => {
    const cb = vi.fn();
    bus.setPhotoPickerCallback(cb);
    bus.resolvePhotoPicker(['a.jpg', 'b.jpg']);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(['a.jpg', 'b.jpg']);
  });

  it('invokes only the LAST registered callback, never the earlier one', () => {
    const first = vi.fn();
    const last = vi.fn();
    bus.setPhotoPickerCallback(first);
    bus.setPhotoPickerCallback(last);
    bus.resolvePhotoPicker(['x.jpg']);
    expect(last).toHaveBeenCalledTimes(1);
    expect(last).toHaveBeenCalledWith(['x.jpg']);
    expect(first).not.toHaveBeenCalled();
  });

  it('passes null through as cancel semantics', () => {
    const cb = vi.fn();
    bus.setPhotoPickerCallback(cb);
    bus.resolvePhotoPicker(null);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(null);
  });

  it('clears after resolving so a second resolve is a no-op (no double-invoke)', () => {
    const cb = vi.fn();
    bus.setPhotoPickerCallback(cb);
    bus.resolvePhotoPicker(['one.jpg']);
    bus.resolvePhotoPicker(['two.jpg']);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(['one.jpg']);
  });

  it('is a no-op when nothing is registered (lastToken === null)', () => {
    expect(() => bus.resolvePhotoPicker(['nope.jpg'])).not.toThrow();
  });

  it('resolves an empty array faithfully', () => {
    const cb = vi.fn();
    bus.setPhotoPickerCallback(cb);
    bus.resolvePhotoPicker([]);
    expect(cb).toHaveBeenCalledWith([]);
  });
});

describe('cancelPhotoPicker(token)', () => {
  it('removes the specific callback so a later resolve does nothing', () => {
    const cb = vi.fn();
    const token = bus.setPhotoPickerCallback(cb);
    bus.cancelPhotoPicker(token);
    bus.resolvePhotoPicker(['gone.jpg']);
    expect(cb).not.toHaveBeenCalled();
  });

  it('clears lastToken when the cancelled token is the current one', () => {
    const cb = vi.fn();
    const token = bus.setPhotoPickerCallback(cb);
    bus.cancelPhotoPicker(token);
    // lastToken is now null → resolve falls to the early return, cb untouched
    bus.resolvePhotoPicker(['gone.jpg']);
    expect(cb).not.toHaveBeenCalled();
  });

  it('does NOT clear lastToken when cancelling a stale (non-current) token', () => {
    const oldCb = vi.fn();
    const newCb = vi.fn();
    const oldToken = bus.setPhotoPickerCallback(oldCb);
    bus.setPhotoPickerCallback(newCb); // newToken becomes lastToken
    // Cancel the OLD token: lastToken stays pointed at the new registration
    bus.cancelPhotoPicker(oldToken);
    bus.resolvePhotoPicker(['still.jpg']);
    expect(newCb).toHaveBeenCalledTimes(1);
    expect(newCb).toHaveBeenCalledWith(['still.jpg']);
    expect(oldCb).not.toHaveBeenCalled();
  });

  it('does not invoke the cancelled callback (cancel != resolve)', () => {
    const cb = vi.fn();
    const token = bus.setPhotoPickerCallback(cb);
    bus.cancelPhotoPicker(token);
    expect(cb).not.toHaveBeenCalled();
  });

  it('is harmless when cancelling an unknown token', () => {
    expect(() => bus.cancelPhotoPicker(99999)).not.toThrow();
  });
});

describe('cancelPhotoPicker() legacy no-arg', () => {
  it('resolves the last registered callback with null', () => {
    const cb = vi.fn();
    bus.setPhotoPickerCallback(cb);
    bus.cancelPhotoPicker();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(null);
  });

  it('resolves only the LAST callback with null, leaving earlier ones untouched', () => {
    const first = vi.fn();
    const last = vi.fn();
    bus.setPhotoPickerCallback(first);
    bus.setPhotoPickerCallback(last);
    bus.cancelPhotoPicker();
    expect(last).toHaveBeenCalledWith(null);
    expect(first).not.toHaveBeenCalled();
  });

  it('clears after a no-arg cancel so a follow-up resolve is a no-op', () => {
    const cb = vi.fn();
    bus.setPhotoPickerCallback(cb);
    bus.cancelPhotoPicker();
    bus.resolvePhotoPicker(['after.jpg']);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(null);
  });

  it('is a no-op when nothing is registered', () => {
    const cb = vi.fn();
    expect(() => bus.cancelPhotoPicker()).not.toThrow();
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('setLastPhotoFromCapture / getLastPhotoFromCapture', () => {
  it('defaults to false on a fresh module', () => {
    expect(bus.getLastPhotoFromCapture()).toBe(false);
  });

  it('round-trips true', () => {
    bus.setLastPhotoFromCapture(true);
    expect(bus.getLastPhotoFromCapture()).toBe(true);
  });

  it('round-trips back to false', () => {
    bus.setLastPhotoFromCapture(true);
    bus.setLastPhotoFromCapture(false);
    expect(bus.getLastPhotoFromCapture()).toBe(false);
  });
});

describe('setPhotoAnnotateCallback / resolvePhotoAnnotate', () => {
  it('returns increasing tokens', () => {
    const a1 = bus.setPhotoAnnotateCallback(() => {});
    const a2 = bus.setPhotoAnnotateCallback(() => {});
    expect(a2).toBeGreaterThan(a1);
  });

  it('invokes the registered callback with a single uri', () => {
    const cb = vi.fn();
    bus.setPhotoAnnotateCallback(cb);
    bus.resolvePhotoAnnotate('annotated.jpg');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('annotated.jpg');
  });

  it('invokes only the LAST registered annotate callback', () => {
    const first = vi.fn();
    const last = vi.fn();
    bus.setPhotoAnnotateCallback(first);
    bus.setPhotoAnnotateCallback(last);
    bus.resolvePhotoAnnotate('z.jpg');
    expect(last).toHaveBeenCalledWith('z.jpg');
    expect(first).not.toHaveBeenCalled();
  });

  it('passes null through as cancel semantics', () => {
    const cb = vi.fn();
    bus.setPhotoAnnotateCallback(cb);
    bus.resolvePhotoAnnotate(null);
    expect(cb).toHaveBeenCalledWith(null);
  });

  it('clears after resolving so a second resolve is a no-op', () => {
    const cb = vi.fn();
    bus.setPhotoAnnotateCallback(cb);
    bus.resolvePhotoAnnotate('first.jpg');
    bus.resolvePhotoAnnotate('second.jpg');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('first.jpg');
  });

  it('is a no-op when nothing is registered (lastAnnotateToken === null)', () => {
    expect(() => bus.resolvePhotoAnnotate('nope.jpg')).not.toThrow();
  });
});

describe('cancelPhotoAnnotate', () => {
  it('removes the specific callback so a later resolve does nothing', () => {
    const cb = vi.fn();
    const token = bus.setPhotoAnnotateCallback(cb);
    bus.cancelPhotoAnnotate(token);
    bus.resolvePhotoAnnotate('gone.jpg');
    expect(cb).not.toHaveBeenCalled();
  });

  it('does NOT clear lastAnnotateToken when cancelling a stale token', () => {
    const oldCb = vi.fn();
    const newCb = vi.fn();
    const oldToken = bus.setPhotoAnnotateCallback(oldCb);
    bus.setPhotoAnnotateCallback(newCb);
    bus.cancelPhotoAnnotate(oldToken);
    bus.resolvePhotoAnnotate('still.jpg');
    expect(newCb).toHaveBeenCalledWith('still.jpg');
    expect(oldCb).not.toHaveBeenCalled();
  });

  it('no-arg resolves the last annotate callback with null', () => {
    const cb = vi.fn();
    bus.setPhotoAnnotateCallback(cb);
    bus.cancelPhotoAnnotate();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(null);
  });

  it('no-arg resolves only the LAST callback, leaving earlier untouched', () => {
    const first = vi.fn();
    const last = vi.fn();
    bus.setPhotoAnnotateCallback(first);
    bus.setPhotoAnnotateCallback(last);
    bus.cancelPhotoAnnotate();
    expect(last).toHaveBeenCalledWith(null);
    expect(first).not.toHaveBeenCalled();
  });

  it('no-arg clears so a follow-up resolve is a no-op', () => {
    const cb = vi.fn();
    bus.setPhotoAnnotateCallback(cb);
    bus.cancelPhotoAnnotate();
    bus.resolvePhotoAnnotate('after.jpg');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(null);
  });

  it('no-arg is a no-op when nothing is registered', () => {
    expect(() => bus.cancelPhotoAnnotate()).not.toThrow();
  });

  it('is harmless when cancelling an unknown token', () => {
    expect(() => bus.cancelPhotoAnnotate(424242)).not.toThrow();
  });
});

describe('picker and annotate buses are independent', () => {
  it('resolving the picker does not fire an annotate callback', () => {
    const picker = vi.fn();
    const annotate = vi.fn();
    bus.setPhotoPickerCallback(picker);
    bus.setPhotoAnnotateCallback(annotate);
    bus.resolvePhotoPicker(['p.jpg']);
    expect(picker).toHaveBeenCalledWith(['p.jpg']);
    expect(annotate).not.toHaveBeenCalled();
  });

  it('resolving the annotate does not fire a picker callback', () => {
    const picker = vi.fn();
    const annotate = vi.fn();
    bus.setPhotoPickerCallback(picker);
    bus.setPhotoAnnotateCallback(annotate);
    bus.resolvePhotoAnnotate('a.jpg');
    expect(annotate).toHaveBeenCalledWith('a.jpg');
    expect(picker).not.toHaveBeenCalled();
  });
});
