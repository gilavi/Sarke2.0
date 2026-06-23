import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────
// Declared FIRST, then we `await import` the module under test, per the
// established house pattern (see secureSessionStorage.test.ts).

const alertMock = vi.fn();
vi.mock('react-native', () => ({
  Alert: { alert: (...args: unknown[]) => alertMock(...args) },
}));

const requestPermMock = vi.fn();
const launchMock = vi.fn();
vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...a: unknown[]) => requestPermMock(...a),
  launchImageLibraryAsync: (...a: unknown[]) => launchMock(...a),
  MediaTypeOptions: { Images: 'Images' },
}));

const readAsStringMock = vi.fn();
const deleteAsyncMock = vi.fn();
vi.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: (...a: unknown[]) => readAsStringMock(...a),
  deleteAsync: (...a: unknown[]) => deleteAsyncMock(...a),
  EncodingType: { Base64: 'base64' },
}));

const manipulateMock = vi.fn();
vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...a: unknown[]) => manipulateMock(...a),
  SaveFormat: { JPEG: 'jpeg' },
}));

const logErrorMock = vi.fn();
vi.mock('../../lib/logError', () => ({
  logError: (...a: unknown[]) => logErrorMock(...a),
}));

vi.mock('../../lib/i18n', () => ({
  default: { t: (k: string) => k },
}));

const { pickProjectLogo } = await import('../../lib/projectLogo');

// ── Helpers ──────────────────────────────────────────────────────────────

const grantedPerm = { status: 'granted' };

function pickerResult(asset: Record<string, unknown> | null) {
  if (asset === null) return { canceled: false, assets: [] };
  return { canceled: false, assets: [asset] };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Sensible defaults: permission granted, deleteAsync resolves.
  requestPermMock.mockResolvedValue(grantedPerm);
  deleteAsyncMock.mockResolvedValue(undefined);
});

// ── Permission branch ──────────────────────────────────────────────────────

describe('pickProjectLogo — permission', () => {
  it('returns null and Alerts when permission is denied', async () => {
    requestPermMock.mockResolvedValue({ status: 'denied' });

    const result = await pickProjectLogo();

    expect(result).toBeNull();
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(alertMock).toHaveBeenCalledWith('projects.galleryAccessDenied');
    expect(launchMock).not.toHaveBeenCalled();
  });

  it('returns null and Alerts when permission status is undetermined', async () => {
    requestPermMock.mockResolvedValue({ status: 'undetermined' });

    const result = await pickProjectLogo();

    expect(result).toBeNull();
    expect(alertMock).toHaveBeenCalledWith('projects.galleryAccessDenied');
    expect(launchMock).not.toHaveBeenCalled();
  });

  it('passes the expected options to launchImageLibraryAsync when granted', async () => {
    launchMock.mockResolvedValue({ canceled: true });

    await pickProjectLogo();

    expect(launchMock).toHaveBeenCalledTimes(1);
    expect(launchMock).toHaveBeenCalledWith({
      mediaTypes: 'Images',
      allowsEditing: false,
      quality: 0.6,
      base64: true,
      exif: false,
    });
  });
});

// ── Cancellation / no-asset branch ─────────────────────────────────────────

describe('pickProjectLogo — cancel / no asset', () => {
  it('returns null when the picker is canceled', async () => {
    launchMock.mockResolvedValue({ canceled: true, assets: [{ base64: 'abc', uri: 'file://x' }] });

    const result = await pickProjectLogo();

    expect(result).toBeNull();
    expect(manipulateMock).not.toHaveBeenCalled();
  });

  it('returns null when assets array is empty', async () => {
    launchMock.mockResolvedValue(pickerResult(null));

    const result = await pickProjectLogo();

    expect(result).toBeNull();
    expect(manipulateMock).not.toHaveBeenCalled();
  });

  it('returns null when assets is undefined', async () => {
    launchMock.mockResolvedValue({ canceled: false });

    const result = await pickProjectLogo();

    expect(result).toBeNull();
    expect(manipulateMock).not.toHaveBeenCalled();
  });
});

// ── Happy path: asset.base64 present ────────────────────────────────────────

describe('pickProjectLogo — happy path with asset.base64', () => {
  it('resizes via manipulateAsync and returns the resized data URL', async () => {
    launchMock.mockResolvedValue(
      pickerResult({ base64: 'RAWPICKER', uri: 'file://orig.jpg' }),
    );
    manipulateMock.mockResolvedValue({ base64: 'RESIZED', uri: 'file://out.jpg' });

    const result = await pickProjectLogo();

    expect(result).toBe('data:image/jpeg;base64,RESIZED');
    // Reads the picker base64 directly — no FileSystem fallback read.
    expect(readAsStringMock).not.toHaveBeenCalled();
    // Manipulator fed a data URL of the raw picker base64.
    expect(manipulateMock).toHaveBeenCalledTimes(1);
    expect(manipulateMock).toHaveBeenCalledWith(
      'data:image/jpeg;base64,RAWPICKER',
      [{ resize: { width: 240 } }],
      { compress: 0.6, format: 'jpeg', base64: true },
    );
    // Cleanup attempted on the manipulator output uri.
    expect(deleteAsyncMock).toHaveBeenCalledTimes(1);
    expect(deleteAsyncMock).toHaveBeenCalledWith('file://out.jpg', { idempotent: true });
    expect(logErrorMock).not.toHaveBeenCalled();
  });
});

// ── FileSystem fallback when asset.base64 missing/empty ─────────────────────

describe('pickProjectLogo — FileSystem fallback for base64', () => {
  it('reads the file via FileSystem when asset.base64 is empty, then resizes', async () => {
    launchMock.mockResolvedValue(pickerResult({ base64: '', uri: 'file://cached.jpg' }));
    readAsStringMock.mockResolvedValue('FILEBASE64');
    manipulateMock.mockResolvedValue({ base64: 'RESIZED', uri: 'file://out.jpg' });

    const result = await pickProjectLogo();

    expect(readAsStringMock).toHaveBeenCalledTimes(1);
    expect(readAsStringMock).toHaveBeenCalledWith('file://cached.jpg', { encoding: 'base64' });
    expect(manipulateMock).toHaveBeenCalledWith(
      'data:image/jpeg;base64,FILEBASE64',
      [{ resize: { width: 240 } }],
      { compress: 0.6, format: 'jpeg', base64: true },
    );
    expect(result).toBe('data:image/jpeg;base64,RESIZED');
  });

  it('reads the file via FileSystem when asset.base64 is undefined', async () => {
    launchMock.mockResolvedValue(pickerResult({ uri: 'file://cached.jpg' }));
    readAsStringMock.mockResolvedValue('FILEBASE64');
    manipulateMock.mockResolvedValue({ base64: 'RESIZED', uri: 'file://out.jpg' });

    const result = await pickProjectLogo();

    expect(readAsStringMock).toHaveBeenCalledWith('file://cached.jpg', { encoding: 'base64' });
    expect(result).toBe('data:image/jpeg;base64,RESIZED');
  });

  it('returns null, Alerts, and logs when the FileSystem read throws', async () => {
    launchMock.mockResolvedValue(pickerResult({ base64: '', uri: 'file://bad.jpg' }));
    const err = new Error('read boom');
    readAsStringMock.mockRejectedValue(err);

    const result = await pickProjectLogo();

    expect(result).toBeNull();
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    expect(logErrorMock).toHaveBeenCalledWith(err, 'projectLogo.readBase64');
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(alertMock).toHaveBeenCalledWith('errors.imageReadFailed', 'read boom');
    expect(manipulateMock).not.toHaveBeenCalled();
  });

  it('stringifies a non-Error throw value in the read-failure Alert', async () => {
    launchMock.mockResolvedValue(pickerResult({ base64: '', uri: 'file://bad.jpg' }));
    // A thrown value with no .message — String(e) is used (e as Error)?.message is undefined.
    readAsStringMock.mockRejectedValue('plain string error');

    const result = await pickProjectLogo();

    expect(result).toBeNull();
    expect(alertMock).toHaveBeenCalledWith('errors.imageReadFailed', 'plain string error');
  });
});

// ── pickerBase64 empty after gathering ──────────────────────────────────────

describe('pickProjectLogo — empty base64 after gathering', () => {
  it('returns null when the FileSystem read resolves to an empty string', async () => {
    launchMock.mockResolvedValue(pickerResult({ base64: '', uri: 'file://cached.jpg' }));
    readAsStringMock.mockResolvedValue('');

    const result = await pickProjectLogo();

    expect(result).toBeNull();
    expect(manipulateMock).not.toHaveBeenCalled();
    expect(logErrorMock).not.toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
  });
});

// ── Manipulator throw → raw picker base64 fallback ──────────────────────────

describe('pickProjectLogo — manipulateAsync throws', () => {
  it('falls back to the raw picker base64 data URL and logs the error', async () => {
    launchMock.mockResolvedValue(pickerResult({ base64: 'RAWPICKER', uri: 'file://orig.jpg' }));
    const err = new Error('manipulate boom');
    manipulateMock.mockRejectedValue(err);

    const result = await pickProjectLogo();

    expect(result).toBe('data:image/jpeg;base64,RAWPICKER');
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    expect(logErrorMock).toHaveBeenCalledWith(err, 'projectLogo.resize');
    // No Alert on the resize-fallback path — it's a silent degrade.
    expect(alertMock).not.toHaveBeenCalled();
    // deleteAsync never reached (threw before producing an out.uri).
    expect(deleteAsyncMock).not.toHaveBeenCalled();
  });
});

// ── Manipulator returns uri but no base64 → read the uri ────────────────────

describe('pickProjectLogo — manipulator returns uri without base64', () => {
  it('reads the manipulator output uri for base64 and returns it', async () => {
    launchMock.mockResolvedValue(pickerResult({ base64: 'RAWPICKER', uri: 'file://orig.jpg' }));
    manipulateMock.mockResolvedValue({ base64: undefined, uri: 'file://out.jpg' });
    readAsStringMock.mockResolvedValue('READFROMURI');

    const result = await pickProjectLogo();

    expect(readAsStringMock).toHaveBeenCalledTimes(1);
    expect(readAsStringMock).toHaveBeenCalledWith('file://out.jpg', { encoding: 'base64' });
    expect(result).toBe('data:image/jpeg;base64,READFROMURI');
    // Cleanup still attempted on the output uri.
    expect(deleteAsyncMock).toHaveBeenCalledWith('file://out.jpg', { idempotent: true });
  });

  it('falls back to raw picker base64 when manipulator yields neither base64 nor uri', async () => {
    launchMock.mockResolvedValue(pickerResult({ base64: 'RAWPICKER', uri: 'file://orig.jpg' }));
    manipulateMock.mockResolvedValue({ base64: undefined, uri: undefined });

    const result = await pickProjectLogo();

    // No uri to read or delete.
    expect(readAsStringMock).not.toHaveBeenCalled();
    expect(deleteAsyncMock).not.toHaveBeenCalled();
    // finalBase64 stays empty → returns the raw picker fallback.
    expect(result).toBe('data:image/jpeg;base64,RAWPICKER');
  });

  it('falls back to raw picker base64 when manipulator base64 is an empty string and no uri', async () => {
    launchMock.mockResolvedValue(pickerResult({ base64: 'RAWPICKER', uri: 'file://orig.jpg' }));
    manipulateMock.mockResolvedValue({ base64: '', uri: undefined });

    const result = await pickProjectLogo();

    expect(result).toBe('data:image/jpeg;base64,RAWPICKER');
    expect(deleteAsyncMock).not.toHaveBeenCalled();
  });
});

// ── deleteAsync cleanup is fire-and-forget ──────────────────────────────────

describe('pickProjectLogo — cleanup resilience', () => {
  it('still returns the resized result even if deleteAsync rejects', async () => {
    launchMock.mockResolvedValue(pickerResult({ base64: 'RAWPICKER', uri: 'file://orig.jpg' }));
    manipulateMock.mockResolvedValue({ base64: 'RESIZED', uri: 'file://out.jpg' });
    deleteAsyncMock.mockRejectedValue(new Error('delete boom'));

    const result = await pickProjectLogo();

    expect(result).toBe('data:image/jpeg;base64,RESIZED');
    expect(deleteAsyncMock).toHaveBeenCalledWith('file://out.jpg', { idempotent: true });
  });

  it('attempts cleanup on out.uri even when reading that uri for base64', async () => {
    launchMock.mockResolvedValue(pickerResult({ base64: 'RAWPICKER', uri: 'file://orig.jpg' }));
    manipulateMock.mockResolvedValue({ base64: undefined, uri: 'file://out.jpg' });
    readAsStringMock.mockResolvedValue('READFROMURI');

    await pickProjectLogo();

    expect(deleteAsyncMock).toHaveBeenCalledTimes(1);
    expect(deleteAsyncMock).toHaveBeenCalledWith('file://out.jpg', { idempotent: true });
  });
});
