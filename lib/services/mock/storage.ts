import { MOCK_IMAGE_URI } from './_store';

// Storage is entirely stubbed in mock mode. Uploads pretend to succeed and
// return the path; URL helpers return a valid data URI so <Image>
// components render without crashing (shows a blank/transparent placeholder).

export const storageApi = {
  upload: async (
    _bucket: string,
    path: string,
    _body: Blob | ArrayBuffer,
    _contentType: string,
  ) => path,
  uploadFromUri: async (
    _bucket: string,
    path: string,
    _fileUri: string,
    _contentType: string,
    _compression?: string | object,
  ): Promise<string> => path,
  download: async (_bucket: string, _path: string) => {
    // Return an empty Blob-ish object; not consumed in mock flows.
    return new Blob([], { type: 'application/octet-stream' });
  },
  signedUrl: async (_bucket: string, _path: string): Promise<string> =>
    MOCK_IMAGE_URI,
  publicUrl: (_bucket: string, _path: string) =>
    MOCK_IMAGE_URI,
  remove: async (_bucket: string, _path: string): Promise<void> => {
    // No-op in mock - no real blobs to clean up.
  },
};
