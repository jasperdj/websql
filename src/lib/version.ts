// Version information for the app
import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;

// Get build number from environment or use timestamp
export const BUILD_NUMBER = import.meta.env.VITE_BUILD_NUMBER || 
  new Date().toISOString().slice(0, 10).replace(/-/g, '');

export const getVersionString = () => {
  return `v${APP_VERSION} (build ${BUILD_NUMBER})`;
};

export const getShortVersionString = () => {
  return `v${APP_VERSION}`;
};

const isTauriApp = () => {
  const isTauriProtocol = window.location.protocol === 'tauri:' ||
    (window.location.protocol === 'https:' && window.location.hostname === 'tauri.localhost');
  const isTauriDev = window.location.hostname === 'localhost' && window.location.port === '1420';
  const tauriWindow = window as Window & {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
    __TAURI_INVOKE__?: unknown;
  };
  const hasTauriGlobal = !!(tauriWindow.__TAURI__ || tauriWindow.__TAURI_INTERNALS__ || tauriWindow.__TAURI_INVOKE__);

  return hasTauriGlobal || isTauriProtocol || isTauriDev;
};

export const getAppVersion = async (): Promise<string> => {
  const prNumber = import.meta.env.VITE_PR_NUMBER;
  if (prNumber) {
    return `PR.${prNumber}`;
  }

  if (!isTauriApp()) {
    return getShortVersionString();
  }

  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    const tauriVersion = await getVersion();
    return `v${tauriVersion}`;
  } catch {
    return getShortVersionString();
  }
};
