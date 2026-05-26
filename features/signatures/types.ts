// features/signatures/types.ts
//
// Lightweight types for the unified signatures flow. See AGENTS.md for the
// no-persistence rule that governs how these values are allowed to flow.

/**
 * The creator's captured signature.
 * `pngBase64` is the raw base64 (no `data:` prefix) returned from the
 * react-native-signature-canvas WebView.
 * `capturedAt` is the moment the user tapped "შენახვა" on the canvas.
 *
 * REGULATORY: This object lives only in wizard state and the in-flight PDF
 * HTML payload. It MUST NOT be persisted to Supabase storage, any DB table,
 * AsyncStorage, MMKV, SecureStore, or the file system. After PDF generation
 * the wizard clears it.
 */
export interface SignatureData {
  pngBase64: string;
  capturedAt: Date;
}

/**
 * An empty additional signing slot, rendered as a labeled blank block in the
 * PDF so a second/third/etc. signer can sign the printed page by hand.
 *
 * These rows intentionally hold NO user-entered data — the row only exists
 * to tell the PDF generator to render another empty slot. The `id` is a
 * client-side identifier used for React keying and removal.
 */
export interface AdditionalSignatureRow {
  id: string;
}

/**
 * Snapshot of the signatures state at PDF-build time. The result view
 * (which owns `useSignaturesState`) passes one of these to the parent's
 * download callback so the PDF builder can render the unified signatures
 * section. Per the no-persistence rule, this object lives only in memory
 * — it's constructed at download time and never persisted.
 */
export interface SignaturesSnapshot {
  creatorSignature: SignatureData | null;
  additionalRowsCount: number;
}
