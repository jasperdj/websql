import { useEffect, useState } from 'react';
import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!window.__TAURI__) return;

    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update?.available) {
          setUpdateAvailable(true);
          setUpdateInfo(update);
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 1000 * 60 * 60 * 4);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = async () => {
    if (!updateInfo) return;
    
    setUpdating(true);
    try {
      let downloaded = 0;
      let contentLength = 0;
      
      await updateInfo.downloadAndInstall((event: DownloadEvent) => {
        if ('event' in event && event.event === 'Started' && 'data' in event) {
          contentLength = event.data.contentLength || 0;
        } else if ('event' in event && event.event === 'Progress' && 'data' in event) {
          downloaded += event.data.chunkLength || 0;
          console.log(`Downloaded ${downloaded} / ${contentLength}`);
        } else if ('event' in event && event.event === 'Finished') {
          console.log('Download finished');
        }
      });

      await relaunch();
    } catch (error) {
      console.error('Failed to update:', error);
      setUpdating(false);
    }
  };

  if (!updateAvailable || !window.__TAURI__) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center gap-3">
        <div>
          <p className="font-semibold">Update Available!</p>
          <p className="text-sm opacity-90">Version {updateInfo?.version} is ready to install</p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          {updating ? 'Updating...' : 'Update Now'}
        </button>
      </div>
    </div>
  );
}