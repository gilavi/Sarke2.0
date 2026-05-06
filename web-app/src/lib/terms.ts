// Re-export of mobile lib/terms.ts so the web-app uses the same single source
// of truth. If the relative path ever breaks (e.g. web-app moves), copy the
// constants inline — content rarely changes (bumped on TERMS_VERSION change).
export {
  TERMS_VERSION,
  TERMS_PUBLIC_URL,
  termsKa,
  termsEn,
  type TermsBody,
} from '../../../lib/terms';
