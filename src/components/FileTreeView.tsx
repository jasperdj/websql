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
        if (!window.__TAURI__) {
          throw new Error('File system access requires desktop app');
        }
        
        // TODO: Implement actual directory reading using Tauri fs API
        // For now, create a mock structure
        const mockNode: FileNode = {
          name: rootPath.split('/').pop() || 'Root',
          path: rootPath,
          type: 'directory',
          children: [
            {
              name: 'data',
              path: `${rootPath}/data`,
              type: 'directory',
              children: [
                {
                  name: 'sales_2024.csv',
                  path: `${rootPath}/data/sales_2024.csv`,
                  type: 'file',
                  fileType: 'columnar',
                  size: 1024 * 512,
                  modifiedAt: new Date(),
                },
                {
                  name: 'products.parquet',
                  path: `${rootPath}/data/products.parquet`,
                  type: 'file',
                  fileType: 'columnar',
                  size: 1024 * 256,
                  modifiedAt: new Date(),
                },
              ],
            },
            {
              name: 'queries',
              path: `${rootPath}/queries`,
              type: 'directory',
              children: [
                {
                  name: 'analysis.sql',
                  path: `${rootPath}/queries/analysis.sql`,
                  type: 'file',
                  fileType: 'sql',
                  size: 2048,
                  modifiedAt: new Date(),
                },
              ],
            },
            {
              name: 'README.md',
              path: `${rootPath}/README.md`,
              type: 'file',
              fileType: 'text',
              size: 4096,
              modifiedAt: new Date(),
            },
          ],
        };
        
        setRootNode(mockNode);
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