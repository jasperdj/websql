import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Database, Folder, AlertCircle, RefreshCw, X, Edit } from 'lucide-react';
import { dataSourceManager } from '@/lib/dataSourceManager';
import { FileTreeView } from './FileTreeView';
import type { DataSource, FileNode, LocalDirConfig } from '@/types/dataSource';
import { cn } from '@/utils/cn';

interface DataSourceListProps {
  onFileOpen?: (dataSourceId: string, file: FileNode) => void;
  onEditDataSource?: (dataSource: DataSource) => void;
}

export function DataSourceList({ onFileOpen, onEditDataSource }: DataSourceListProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Load initial data sources
    setDataSources(dataSourceManager.getAll());
    
    // Subscribe to changes
    const unsubscribe = dataSourceManager.subscribe(() => {
      setDataSources(dataSourceManager.getAll());
    });
    
    return unsubscribe;
  }, []);

  const toggleSource = (id: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRefresh = async (source: DataSource) => {
    try {
      await dataSourceManager.connect(source.id);
    } catch (error) {
      console.error('Failed to refresh data source:', error);
    }
  };

  const handleRemove = (source: DataSource) => {
    if (confirm(`Remove data source "${source.name}"?`)) {
      dataSourceManager.delete(source.id);
    }
  };

  const handleFileSelect = (dataSourceId: string, file: FileNode) => {
    if (file.type === 'file' && onFileOpen) {
      onFileOpen(dataSourceId, file);
    }
  };

  if (dataSources.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-white mb-2 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <span>Data Sources ({dataSources.length})</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {dataSources.map(source => {
            const isSourceExpanded = expandedSources.has(source.id);
            const Icon = source.type === 'local_directory' ? Folder : Database;
            
            return (
              <div 
                key={source.id}
                className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <div className={cn(
                  "flex items-center gap-2 p-2",
                  source.status === 'connected' ? 'bg-green-50 dark:bg-green-900/20' :
                  source.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                  'bg-gray-50 dark:bg-gray-800'
                )}>
                  <button
                    onClick={() => toggleSource(source.id)}
                    className="flex items-center gap-2 flex-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1"
                  >
                    {isSourceExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <Icon className={cn(
                      "h-4 w-4",
                      source.status === 'connected' ? 'text-green-500' :
                      source.status === 'error' ? 'text-red-500' :
                      'text-gray-500'
                    )} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {source.name}
                    </span>
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {source.status === 'error' && (
                      <span title={source.error}>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </span>
                    )}
                    <button
                      onClick={() => onEditDataSource?.(source)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      title="Edit data source"
                    >
                      <Edit className="h-3 w-3 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleRefresh(source)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      title="Refresh connection"
                    >
                      <RefreshCw className="h-3 w-3 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleRemove(source)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      title="Remove data source"
                    >
                      <X className="h-3 w-3 text-gray-500" />
                    </button>
                  </div>
                </div>
                
                {isSourceExpanded && source.status === 'connected' && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    {source.type === 'local_directory' ? (
                      <FileTreeView
                        dataSourceId={source.id}
                        rootPath={(source.config as LocalDirConfig).path}
                        onFileSelect={(file) => handleFileSelect(source.id, file)}
                      />
                    ) : (
                      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                        PostgreSQL schema browser coming soon...
                      </div>
                    )}
                  </div>
                )}
                
                {isSourceExpanded && source.status === 'error' && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {source.error || 'Connection failed'}
                  </div>
                )}
                
                {isSourceExpanded && source.status === 'disconnected' && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                    Click refresh to connect
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}