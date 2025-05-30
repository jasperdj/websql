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