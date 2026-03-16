/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_E2E_TEST_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
