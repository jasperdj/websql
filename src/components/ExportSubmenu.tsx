import { FileText, FileSpreadsheet, Package, FileArchive } from 'lucide-react';

interface ExportSubmenuProps {
  onExport: (format: 'sql' | 'csv-comma' | 'csv-semicolon' | 'parquet' | 'xlsx' | 'original') => void;
}

export function ExportSubmenu({ onExport }: ExportSubmenuProps) {
  return (
    <div className="py-1">
      <button
        onClick={() => onExport('original')}
        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <FileArchive className="h-4 w-4 mr-2" />
        Original Format
      </button>
      
      <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
      
      <button
        onClick={() => onExport('sql')}
        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <FileText className="h-4 w-4 mr-2" />
        SQL
      </button>
      
      <button
        onClick={() => onExport('csv-comma')}
        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        CSV (,)
      </button>
      
      <button
        onClick={() => onExport('csv-semicolon')}
        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        CSV (;)
      </button>
      
      <button
        onClick={() => onExport('parquet')}
        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Package className="h-4 w-4 mr-2" />
        Parquet
      </button>
      
      <button
        onClick={() => onExport('xlsx')}
        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        XLSX
      </button>
    </div>
  );
}