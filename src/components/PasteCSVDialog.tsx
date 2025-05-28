import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { duckdbService } from '@/lib/duckdb';
import { tableMetadataService } from '@/lib/tableMetadata';

interface PasteCSVDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const COMMON_DELIMITERS = [
  { label: 'Comma (,)', value: ',' },
  { label: 'Semicolon (;)', value: ';' },
  { label: 'Tab', value: '\t' },
  { label: 'Pipe (|)', value: '|' },
  { label: 'Space', value: ' ' },
];

const COLORS = [
  'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
  'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
  'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20',
  'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20',
];

export function PasteCSVDialog({ isOpen, onClose, onImportComplete }: PasteCSVDialogProps) {
  const [csvText, setCsvText] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [useCustomDelimiter, setUseCustomDelimiter] = useState(false);
  const [tableName, setTableName] = useState('pasted_data');
  const [preview, setPreview] = useState<{ headers: string[], rows: string[][] }>({ headers: [], rows: [] });
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect delimiter
  const detectDelimiter = useCallback((text: string) => {
    if (!text) return ',';
    
    const firstLine = text.split('\n')[0];
    if (!firstLine) return ',';
    
    // Count occurrences of each delimiter
    const counts = COMMON_DELIMITERS.map(d => ({
      delimiter: d.value,
      count: firstLine.split(d.value).length - 1
    }));
    
    // Find the delimiter with the most occurrences
    const best = counts.reduce((prev, current) => 
      current.count > prev.count ? current : prev
    );
    
    return best.count > 0 ? best.delimiter : ',';
  }, []);

  // Parse CSV for preview
  const parseCSV = useCallback((text: string, delim: string) => {
    if (!text.trim()) {
      setPreview({ headers: [], rows: [] });
      return;
    }

    try {
      const lines = text.trim().split('\n');
      const headers = lines[0].split(delim).map(h => h.trim());
      const rows = lines.slice(1, Math.min(6, lines.length)) // Show max 5 rows in preview
        .map(line => line.split(delim).map(cell => cell.trim()));
      
      setPreview({ headers, rows });
      setError(null);
    } catch {
      setError('Failed to parse CSV');
      setPreview({ headers: [], rows: [] });
    }
  }, []);

  // Update preview when text or delimiter changes
  useEffect(() => {
    if (csvText) {
      const activeDelimiter = useCustomDelimiter ? customDelimiter : delimiter;
      
      // Auto-detect only when not using custom delimiter
      if (!useCustomDelimiter) {
        const detectedDelimiter = detectDelimiter(csvText);
        if (delimiter !== detectedDelimiter) {
          setDelimiter(detectedDelimiter);
        }
      }
      
      parseCSV(csvText, activeDelimiter);
    }
  }, [csvText, delimiter, customDelimiter, useCustomDelimiter, detectDelimiter, parseCSV]);

  const handleImport = async () => {
    if (!csvText.trim() || !tableName.trim()) {
      setError('Please provide CSV data and table name');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const activeDelimiter = useCustomDelimiter ? customDelimiter : delimiter;
      
      // Convert delimiter if it's tab
      const csvContent = activeDelimiter === '\t' 
        ? csvText.replace(/\t/g, ',')
        : csvText.split('\n').map(line => {
            // Simple CSV conversion - for production, use a proper CSV parser
            return line.split(activeDelimiter).map(cell => {
              // Quote cells that contain commas or quotes
              if (cell.includes(',') || cell.includes('"')) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            }).join(',');
          }).join('\n');

      await duckdbService.importCSV(tableName, csvContent);
      
      // Store metadata
      tableMetadataService.create(tableName, {
        origin: 'paste',
        originalDelimiter: activeDelimiter,
      });
      
      onImportComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Paste CSV Data
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Table Name
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter table name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Delimiter {!useCustomDelimiter && '(auto-detected)'}
              </label>
              <div className="flex gap-2">
                <select
                  value={useCustomDelimiter ? 'custom' : delimiter}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setUseCustomDelimiter(true);
                    } else {
                      setUseCustomDelimiter(false);
                      setDelimiter(e.target.value);
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {COMMON_DELIMITERS.map(d => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
                
                {useCustomDelimiter && (
                  <input
                    type="text"
                    value={customDelimiter}
                    onChange={(e) => setCustomDelimiter(e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter"
                    maxLength={5}
                  />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CSV Data
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
              placeholder="Paste your CSV data here..."
            />
          </div>

          {preview.headers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview
              </h3>
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {preview.headers.map((header, i) => (
                        <th
                          key={i}
                          className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                            COLORS[i % COLORS.length]
                          }`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {preview.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-3 py-2 text-sm text-gray-900 dark:text-white"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Showing first {preview.rows.length} rows of {csvText.trim().split('\n').length - 1} total rows
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || !csvText.trim() || !tableName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Importing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}