import React, { useState, useEffect } from 'react';
import { X, Folder, AlertCircle } from 'lucide-react';
import { dataSourceManager } from '@/lib/dataSourceManager';
import type { DataSource, DataSourceType, LocalDirConfig, PostgresConfig } from '@/types/dataSource';

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSourceAdded?: () => void;
  editingDataSource?: DataSource | null;
}


export function DataSourceModal({ isOpen, onClose, onDataSourceAdded, editingDataSource }: DataSourceModalProps) {
  const [selectedType, setSelectedType] = useState<DataSourceType | null>(null);
  const [shortName, setShortName] = useState('');
  const [localDirConfig, setLocalDirConfig] = useState<LocalDirConfig>({ 
    path: '',
    watchEnabled: true,
    syncEnabled: true,
  });
  const [postgresConfig, setPostgresConfig] = useState<PostgresConfig>({
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: '',
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Initialize form when editing
  useEffect(() => {
    if (editingDataSource) {
      setSelectedType(editingDataSource.type);
      setShortName(editingDataSource.shortName);
      if (editingDataSource.type === 'local_directory') {
        setLocalDirConfig(editingDataSource.config as LocalDirConfig);
      } else if (editingDataSource.type === 'postgres') {
        setPostgresConfig(editingDataSource.config as PostgresConfig);
      }
    } else {
      // Reset form for new data source
      setSelectedType(null);
      setShortName('');
      setLocalDirConfig({ path: '', watchEnabled: true, syncEnabled: true });
      setPostgresConfig({ host: 'localhost', port: 5432, database: '', username: '', password: '' });
    }
    setConnectionTestResult(null);
  }, [editingDataSource, isOpen]);

  if (!isOpen) return null;

  // Check if we're in Tauri - check for multiple possible indicators
  // Tauri v2 uses https://tauri.localhost on Windows and tauri://localhost on other platforms
  const isTauriProtocol = window.location.protocol === 'tauri:' || 
                          window.location.protocol === 'https:' && window.location.hostname === 'tauri.localhost';
  const isTauriDev = window.location.hostname === 'localhost' && window.location.port === '1420';
  const hasTauriGlobal = !!(window.__TAURI__ || window.__TAURI_INTERNALS__ || window.__TAURI_INVOKE__);
  
  // In desktop app, we should either have Tauri global OR be running from tauri:// protocol
  const isTauri = hasTauriGlobal || isTauriProtocol || isTauriDev;
  
  // Debug logging
  if (isOpen) {
    console.log('Tauri detection:', {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      hasTauriGlobal,
      isTauriProtocol,
      isTauriDev,
      isTauri
    });
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      if (!selectedType) throw new Error('Please select a data source type');
      
      // Create a temporary data source for testing
      const testSource = {
        id: 'test',
        type: selectedType,
        name: 'Test Connection',
        shortName: shortName || 'test',
        config: selectedType === 'local_directory' ? localDirConfig : postgresConfig,
        status: 'disconnected' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await dataSourceManager.testConnection(testSource);
      setConnectionTestResult(result);
    } catch (error) {
      setConnectionTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveDataSource = async () => {
    if (!selectedType) return;
    
    try {
      const config = selectedType === 'local_directory' ? localDirConfig : postgresConfig;
      
      if (editingDataSource) {
        // Update existing data source
        const name = selectedType === 'local_directory' 
          ? `Local: ${localDirConfig.path.split('/').pop() || 'Directory'}`
          : `PostgreSQL: ${postgresConfig.database}`;
        
        dataSourceManager.update(editingDataSource.id, {
          name,
          shortName: shortName.trim(),
          config,
          type: selectedType
        });
        
        // Try to reconnect
        await dataSourceManager.connect(editingDataSource.id);
      } else {
        // Add new data source
        const name = selectedType === 'local_directory' 
          ? `Local: ${localDirConfig.path.split('/').pop() || 'Directory'}`
          : `PostgreSQL: ${postgresConfig.database}`;
        
        const dataSource = dataSourceManager.add(selectedType, name, shortName.trim(), config);
        
        // Try to connect immediately
        await dataSourceManager.connect(dataSource.id);
      }
      
      onDataSourceAdded?.();
      onClose();
    } catch (error) {
      console.error('Failed to save data source:', error);
      setConnectionTestResult({
        success: false,
        message: `Failed to save data source: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const isFormValid = () => {
    if (!selectedType || !shortName.trim()) return false;
    
    if (selectedType === 'local_directory') {
      return !!localDirConfig.path;
    }
    
    if (selectedType === 'postgres') {
      return !!postgresConfig.host && !!postgresConfig.database && !!postgresConfig.username;
    }
    
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingDataSource ? 'Edit Data Source' : 'Import Data Source'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          {!isTauri ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Desktop App Required
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Data source connections are only available in the desktop version of WebSQL. 
                    This feature allows you to:
                  </p>
                  <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                    <li>Connect to local directories and sync files</li>
                    <li>Connect to PostgreSQL databases</li>
                    <li>Query across multiple data sources</li>
                    <li>Auto-sync changes with source files</li>
                  </ul>
                  <p className="mt-3 text-sm text-yellow-700 dark:text-yellow-300">
                    Download the desktop app to use these features.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Data source type selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select data source type
                </label>
                <select
                  value={selectedType || ''}
                  onChange={(e) => setSelectedType(e.target.value as DataSourceType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a type...</option>
                  <option value="local_directory">Local Directory</option>
                  <option value="postgres">PostgreSQL Database</option>
                </select>
              </div>

              {/* Short name input */}
              {selectedType && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Short Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="e.g. prod, staging, reports"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Used for table naming: {shortName || 'shortname'}_filename
                  </p>
                </div>
              )}

              {/* Configuration forms */}
              {selectedType === 'local_directory' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Directory Path
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={localDirConfig.path}
                        onChange={(e) => setLocalDirConfig({ ...localDirConfig, path: e.target.value })}
                        placeholder="/path/to/directory"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={async () => {
                          try {
                            const { open } = await import('@tauri-apps/plugin-dialog');
                            const selectedPath = await open({
                              directory: true,
                              multiple: false,
                              title: 'Select Directory'
                            });
                            
                            if (selectedPath && typeof selectedPath === 'string') {
                              setLocalDirConfig({ ...localDirConfig, path: selectedPath });
                            }
                          } catch (error) {
                            console.error('Failed to open directory picker:', error);
                          }
                        }}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm"
                      >
                        <Folder className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      All CSV, Parquet, and XLSX files in this directory will be available
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={localDirConfig.watchEnabled}
                        onChange={(e) => setLocalDirConfig({ ...localDirConfig, watchEnabled: e.target.checked })}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Watch for file changes
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={localDirConfig.syncEnabled}
                        onChange={(e) => setLocalDirConfig({ ...localDirConfig, syncEnabled: e.target.checked })}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Enable two-way sync
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {selectedType === 'postgres' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Host
                    </label>
                    <input
                      type="text"
                      value={postgresConfig.host}
                      onChange={(e) => setPostgresConfig({ ...postgresConfig, host: e.target.value })}
                      placeholder="localhost"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={postgresConfig.port}
                      onChange={(e) => setPostgresConfig({ ...postgresConfig, port: parseInt(e.target.value) || 5432 })}
                      placeholder="5432"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Database <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={postgresConfig.database}
                      onChange={(e) => setPostgresConfig({ ...postgresConfig, database: e.target.value })}
                      placeholder="mydb"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={postgresConfig.username}
                      onChange={(e) => setPostgresConfig({ ...postgresConfig, username: e.target.value })}
                      placeholder="postgres"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={postgresConfig.password}
                      onChange={(e) => setPostgresConfig({ ...postgresConfig, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Connection test result */}
              {connectionTestResult && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${
                  connectionTestResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {connectionTestResult.message}
                </div>
              )}

              {/* Action buttons */}
              {selectedType && (
                <div className="mt-6 flex gap-3 justify-end">
                  {/* Only show test connection for PostgreSQL */}
                  {selectedType === 'postgres' && (
                    <button
                      onClick={handleTestConnection}
                      disabled={!isFormValid() || isTestingConnection}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isTestingConnection ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-300"></div>
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={handleSaveDataSource}
                    disabled={!isFormValid() || (selectedType === 'postgres' && !connectionTestResult?.success)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingDataSource ? 'Update Data Source' : 'Add Data Source'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}