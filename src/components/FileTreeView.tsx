import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, FileText, FileCode, Database, Folder, FolderOpen } from 'lucide-react';
import type { FileNode } from '@/types/dataSource';
import { cn } from '@/utils/cn';

interface FileTreeViewProps {
  dataSourceId: string;
  rootPath: string;
  onFileSelect: (file: FileNode) => void;
}


// Helper function to get appropriate icon
function getFileIcon(node: FileNode) {
  if (node.type === 'directory') {
    return node.children ? FolderOpen : Folder;
  }
  
  switch (node.fileType) {
    case 'columnar':
      return Database;
    case 'sql':
      return FileCode;
    case 'text':
      return FileText;
    default:
      return File;
  }
}

interface TreeNodeProps {
  node: FileNode;
  level: number;
  onSelect: (node: FileNode) => void;
}

function TreeNode({ node, level, onSelect }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = getFileIcon(node);
  
  const handleClick = () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
      // TODO: Load directory contents if not already loaded
    } else {
      onSelect(node);
    }
  };
  
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded",
          "text-sm text-gray-700 dark:text-gray-300"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'directory' && (
          <span className="flex-shrink-0 w-4 h-4">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
        <Icon className={cn(
          "w-4 h-4 flex-shrink-0",
          node.type === 'directory' ? 'text-blue-500' : 
          node.fileType === 'columnar' ? 'text-green-500' :
          node.fileType === 'sql' ? 'text-purple-500' :
          'text-gray-500'
        )} />
        <span className="truncate flex-1">{node.name}</span>
        {node.size && node.type === 'file' && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
      
      {isExpanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode
              key={child.path || index}
              node={child}
              level={level + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function FileTreeView({ dataSourceId, rootPath, onFileSelect }: FileTreeViewProps) {
  const [rootNode, setRootNode] = useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadDirectoryContents = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if we're in Tauri using multiple methods
        const isTauriProtocol = window.location.protocol === 'tauri:' || 
                                window.location.protocol === 'https:' && window.location.hostname === 'tauri.localhost';
        const isTauriDev = window.location.hostname === 'localhost' && window.location.port === '1420';
        const hasTauriGlobal = !!(window.__TAURI__ || window.__TAURI_INTERNALS__ || window.__TAURI_INVOKE__);
        const isTauri = hasTauriGlobal || isTauriProtocol || isTauriDev;

        if (!isTauri) {
          throw new Error('File system access requires desktop app');
        }
        
        // Read actual directory using Tauri fs API
        const { readDir } = await import('@tauri-apps/plugin-fs');
        
        console.log('Attempting to read directory:', rootPath);
        let entries;
        try {
          entries = await readDir(rootPath);
          console.log('Directory entries:', entries);
        } catch (readError) {
          console.error('ReadDir error:', readError);
          throw new Error(`Failed to read directory: ${readError instanceof Error ? readError.message : String(readError)}`);
        }
        
        const buildFileTree = async (dirPath: string, entries: Array<{
          name: string;
          isDirectory: boolean;
          size?: number;
          modifiedAt?: string;
        }>): Promise<FileNode> => {
          const dirName = dirPath.split('/').pop() || dirPath.split('\\').pop() || 'Root';
          const children: FileNode[] = [];
          
          // Get entries for this directory
          const dirEntries = entries.filter(entry => {
            const entryDir = entry.name.includes('/') || entry.name.includes('\\') 
              ? entry.name.substring(0, entry.name.lastIndexOf('/') || entry.name.lastIndexOf('\\'))
              : '';
            return entryDir === '' || entryDir === dirPath;
          });
          
          for (const entry of dirEntries) {
            const name = entry.name.split('/').pop() || entry.name.split('\\').pop() || 'unknown';
            const fullPath = `${rootPath}/${entry.name}`.replace(/\\/g, '/');
            if (name.startsWith('~$')) {
              continue;
            }
            
            if (entry.isDirectory) {
              // Recursively build subdirectory
              const subdirEntries = entries.filter(e => e.name.startsWith(entry.name + '/'));
              children.push(await buildFileTree(fullPath, subdirEntries));
            } else {
              // Add file
              const ext = name.split('.').pop()?.toLowerCase();
              let fileType: FileNode['fileType'] = 'other';
              
              if (['csv', 'parquet', 'xlsx', 'xls'].includes(ext || '')) {
                fileType = 'columnar';
              } else if (ext === 'sql') {
                fileType = 'sql';
              } else if (['txt', 'md', 'json', 'xml', 'log'].includes(ext || '')) {
                fileType = 'text';
              }

              if (ext === 'xlsx' || ext === 'xls') {
                const { read } = await import('xlsx');
                const { readFile } = await import('@tauri-apps/plugin-fs');
                const buffer = await readFile(fullPath);
                const workbook = read(buffer, { type: 'array' });
                const sheetChildren = workbook.SheetNames.map((sheetName: string) => ({
                  name: sheetName,
                  path: fullPath,
                  type: 'file' as const,
                  fileType: 'columnar' as const,
                  sheetName,
                }));

                children.push({
                  name,
                  path: fullPath,
                  type: 'directory',
                  children: sheetChildren,
                });
              } else {
                children.push({
                  name,
                  path: fullPath,
                  type: 'file',
                  fileType,
                  size: entry.size || 0,
                  modifiedAt: entry.modifiedAt ? new Date(entry.modifiedAt) : new Date(),
                });
              }
            }
          }
          
          return {
            name: dirName,
            path: dirPath,
            type: 'directory',
            children: children.sort((a, b) => {
              // Directories first, then files
              if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
              }
              return a.name.localeCompare(b.name);
            }),
          };
        };
        
        const rootNode = await buildFileTree(rootPath, entries);
        setRootNode(rootNode);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load directory');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDirectoryContents();
  }, [dataSourceId, rootPath]);
  
  if (isLoading) {
    return (
      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
        Loading directory contents...
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-sm text-red-500 dark:text-red-400">
        Error: {error}
      </div>
    );
  }
  
  if (!rootNode) {
    return (
      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
        No files found
      </div>
    );
  }
  
  return (
    <div className="py-2">
      <TreeNode node={rootNode} level={0} onSelect={onFileSelect} />
    </div>
  );
}
