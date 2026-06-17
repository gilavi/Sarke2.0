// features/signatures - public API.
//
// Single-screen signatures management for an inspection. One creator
// signature (captured digitally, never persisted) + N empty hand-sign
// slots rendered into the PDF. See AGENTS.md for the regulatory rule
// that governs this module.

export { SignaturesScreen } from './SignaturesScreen';
export { useSignaturesState, type SignaturesState } from './useSignaturesState';
export type {
  SignatureData,
  AdditionalSignatureRow,
  SignaturesSnapshot,
} from './types';
