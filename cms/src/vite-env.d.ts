/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CMS_FN_URL?: string;
  readonly VITE_CMS_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
