import { useEffect, useRef, useState } from 'react';
import { Edit2, Trash2, Download, Save, ChevronRight } from 'lucide-react';
import { ExportSubmenu } from './ExportSubmenu';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onExport: (format: 'sql' | 'csv-comma' | 'csv-semicolon' | 'parquet' | 'xlsx' | 'original') => void;
  onSave?: () => void;
  onUnsave?: () => void;
  isSaved?: boolean;
}

export function ContextMenu({
  x,
  y,
  onClose,
  onRename,
  onDelete,
  onExport,
  onSave,
  onUnsave,
  isSaved = false,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        event.stopPropagation();
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Use a small delay to ensure the menu is rendered before adding listeners
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const handleExport = (format: 'sql' | 'csv-comma' | 'csv-semicolon' | 'parquet' | 'xlsx' | 'original') => {
    onExport(format);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      data-context-menu
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => handleAction(onRename)}
        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Edit2 className="h-4 w-4 mr-2" />
        Rename
      </button>
      
      <button
        onClick={() => handleAction(onDelete)}
        className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </button>
      
      <div 
        onMouseEnter={() => setShowExportSubmenu(true)}
        onMouseLeave={() => setShowExportSubmenu(false)}
        className="relative"
      >
        <button
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <span className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
        
        {showExportSubmenu && (
          <div 
            className="absolute left-full top-0 -ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg min-w-[140px]"
          >
            <ExportSubmenu onExport={handleExport} />
          </div>
        )}
      </div>
      
      {onSave && !isSaved && (
        <button
          onClick={() => handleAction(onSave)}
          className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </button>
      )}
      
      {isSaved && onUnsave && (
        <button
          onClick={() => handleAction(onUnsave)}
          className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Save className="h-4 w-4 mr-2" />
          Unsave
        </button>
      )}
    </div>
  );
}