// features/signatures/SignatureCanvasModal.tsx
//
// Modal for capturing a single signature, wrapping the canonical
// components/SignatureCanvas (which owns the react-native-signature-canvas
// WebView + capture buttons). This thin wrapper exists so the no-persistence
// rule travels with the new signatures module — callers should import this
// file, not the bare SignatureCanvas.
//
// REGULATORY — IMPORTANT: the base64 PNG passed to `onConfirm` MUST NOT be
// persisted. The only allowed downstream is wizard component state (cleared
// after PDF generation) and the in-flight HTML payload sent to expo-print.
// Do NOT upload to Supabase storage, write to a DB, cache in AsyncStorage /
// MMKV / SecureStore, or save to the file system from this code path.

import { SignatureCanvas } from '../../components/SignatureCanvas';

interface Props {
  visible: boolean;
  /** Shown above the canvas as the person about to sign. The new module
   *  pulls this from the creator's profile and does not let the user edit it
   *  on the screen. */
  personName: string;
  onCancel: () => void;
  /** Receives the raw base64-encoded PNG (no `data:` prefix). Caller is
   *  responsible for keeping this value in volatile wizard state only. */
  onConfirm: (pngBase64: string) => void;
}

export function SignatureCanvasModal({ visible, personName, onCancel, onConfirm }: Props) {
  return (
    <SignatureCanvas
      visible={visible}
      personName={personName}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
