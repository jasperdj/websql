/// <reference types="vite/client" />

declare global {
  interface Window {
    __TAURI__?: {
      [key: string]: unknown;
    };
    __TAURI_INTERNALS__?: unknown;
    __TAURI_INVOKE__?: unknown;
  }
}

export {};