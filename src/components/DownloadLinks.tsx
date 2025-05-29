import { useState, useEffect } from 'react';
import { Download, Monitor, Apple, Laptop } from 'lucide-react';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  tag_name: string;
  name: string;
  assets: ReleaseAsset[];
  published_at: string;
}

export function DownloadLinks() {
  const [latestRelease, setLatestRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (window.__TAURI__) return;

    fetch('https://api.github.com/repos/jasperdj/websql/releases/latest')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch releases');
        }
        return res.json();
      })
      .then(data => {
        if (data && data.assets) {
          setLatestRelease(data);
        }
        setLoading(false);
      })
      .catch((error) => {
        // This is expected if no releases exist yet or repository is private
        console.log('No releases found or repository is private:', error.message);
        setLoading(false);
      });
  }, []);

  const formatSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const getAssetInfo = (asset: ReleaseAsset) => {
    const name = asset.name.toLowerCase();
    if (name.endsWith('.exe') || name.endsWith('.msi')) {
      return { icon: Monitor, platform: 'Windows', priority: 1 };
    } else if (name.endsWith('.dmg')) {
      return { icon: Apple, platform: 'macOS', priority: 2 };
    } else if (name.endsWith('.appimage') || name.endsWith('.deb')) {
      return { icon: Laptop, platform: 'Linux', priority: 3 };
    }
    return null;
  };

  if (loading || !latestRelease || !latestRelease.assets || window.__TAURI__) return null;

  const desktopAssets = latestRelease.assets
    .map(asset => {
      const info = getAssetInfo(asset);
      return info ? { asset, ...info } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a!.priority - b!.priority);

  if (desktopAssets.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
      >
        <Download className="h-4 w-4" />
        Download Desktop App
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Download WebSQL Desktop
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get the desktop version for offline use and better performance.
            </p>

            <div className="space-y-3">
              {desktopAssets.map((item) => {
                if (!item) return null;
                const { asset, icon: Icon, platform } = item;
                const isExe = asset.name.toLowerCase().endsWith('.exe');
                const isMsi = asset.name.toLowerCase().endsWith('.msi');
                const suffix = isExe ? ' (Installer)' : isMsi ? ' (MSI)' : '';
                
                return (
                  <a
                    key={asset.name}
                    href={asset.browser_download_url}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Icon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {platform}{suffix}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatSize(asset.size)}
                      </div>
                    </div>
                    <Download className="h-5 w-5 text-gray-400" />
                  </a>
                );
              })}
            </div>

            <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Version {latestRelease.tag_name}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}