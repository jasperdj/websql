import React, { useCallback, useState } from 'react';
import { Upload, Database } from 'lucide-react';
import { duckdbService } from '@/lib/duckdb';
import { cn } from '@/utils/cn';
import { PasteCSVDialog } from './PasteCSVDialog';
import { tableMetadataService } from '@/lib/tableMetadata';

interface FileImportProps {
  onImportComplete?: () => void;
  onImportDataSource?: () => void;
}

export function FileImport({ onImportComplete, onImportDataSource }: FileImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showPasteDialog, setShowPasteDialog] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setLastError(null);
    
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const tableName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');

      if (extension === 'csv') {
        const text = await file.text();
        
        // Detect delimiter
        const firstLine = text.split('\n')[0];
        let delimiter = ',';
        if (firstLine) {
          const delimiters = [',', ';', '\t', '|'];
          const counts = delimiters.map(d => ({
            delimiter: d,
            count: firstLine.split(d).length - 1
          }));
          const best = counts.reduce((prev, current) => 
            current.count > prev.count ? current : prev
          );
          if (best.count > 0) delimiter = best.delimiter;
        }
        
        await duckdbService.importCSV(tableName, text);
        
        // Store metadata
        tableMetadataService.create(tableName, {
          origin: 'file',
          originalFilename: file.name,
          originalDelimiter: delimiter,
        });
      } else if (extension === 'parquet') {
        const buffer = await file.arrayBuffer();
        await duckdbService.importParquet(tableName, buffer);
        
        // Store metadata
        tableMetadataService.create(tableName, {
          origin: 'file',
          originalFilename: file.name,
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer();
        const tables = await duckdbService.importXlsx(tableName, buffer);
        if (tables.length === 0) {
          throw new Error('No sheets found in XLSX file');
        }
        tables.forEach((createdTable) => {
          tableMetadataService.create(createdTable, {
            origin: 'file',
            originalFilename: file.name,
          });
        });
      } else {
        throw new Error(`Unsupported file type: ${extension}`);
      }

      // Success - clear any previous error
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Import failed');
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    setIsImporting(true);
    try {
      for (const file of droppedFiles) {
        await processFile(file);
      }
    } finally {
      setIsImporting(false);
      onImportComplete?.();
    }
  }, [onImportComplete]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsImporting(true);
    try {
      for (const file of selectedFiles) {
        await processFile(file);
      }
    } finally {
      setIsImporting(false);
      onImportComplete?.();
    }
    
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  }, [onImportComplete]);

  const handleCombineFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length < 2) {
      setLastError('Please select at least 2 files to combine');
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    setLastError(null);
    
    try {
      // Generate a combined table name based on first file
      const baseFileName = selectedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
      const combinedTableName = `${baseFileName}_combined`;
      
      // Process files and combine using SQL UNION ALL
      const tempTableNames: string[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const tempTableName = `_temp_combine_${i}`;
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        if (extension === 'csv') {
          const text = await file.text();
          await duckdbService.importCSV(tempTableName, text);
        } else if (extension === 'parquet') {
          const buffer = await file.arrayBuffer();
          await duckdbService.importParquet(tempTableName, buffer);
        } else {
          throw new Error(`Cannot combine file type: ${extension}`);
        }
        
        tempTableNames.push(tempTableName);
      }
      
      // Get all unique columns from all tables
      const allColumns = new Set<string>();
      const tableColumns: Record<string, string[]> = {};
      
      for (const tableName of tempTableNames) {
        const result = await duckdbService.query(`DESCRIBE ${tableName}`);
        const columns = result.rows.map(row => row[0] as string);
        tableColumns[tableName] = columns;
        columns.forEach(col => allColumns.add(col));
      }
      
      // Create UNION ALL query with explicit column selection and source tracking
      // Missing columns will be filled with NULL
      const unionQuery = tempTableNames
        .map((tableName, index) => {
          const sourceFileName = selectedFiles[index].name;
          const columns = Array.from(allColumns).map(col => {
            if (tableColumns[tableName].includes(col)) {
              return col;
            } else {
              return `NULL AS ${col}`;
            }
          });
          // Add source_filename as the first column
          return `SELECT '${sourceFileName}' AS source_filename, ${columns.join(', ')} FROM ${tableName}`;
        })
        .join(' UNION ALL ');
      
      await duckdbService.query(`CREATE TABLE ${combinedTableName} AS ${unionQuery}`);
      
      // Clean up temporary tables
      for (const tempTable of tempTableNames) {
        await duckdbService.dropTable(tempTable);
      }
      
      // Store metadata including the original file structures
      const fileStructures: Record<string, string[]> = {};
      selectedFiles.forEach((file, index) => {
        fileStructures[file.name] = tableColumns[tempTableNames[index]];
      });
      
      tableMetadataService.create(combinedTableName, {
        origin: 'combined',
        originalFilename: `Combined from ${selectedFiles.length} files`,
        combinedFileStructures: fileStructures,
      });
      
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Failed to combine files');
    } finally {
      setIsImporting(false);
      onImportComplete?.();
    }
    
    // Reset the input value
    e.target.value = '';
  }, [onImportComplete]);

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        Import/connect
      </h3>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-3 text-center transition-colors relative",
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-gray-300 dark:border-gray-700",
          isImporting && "opacity-50 pointer-events-none"
        )}
      >
        <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
        <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">
          Drop files,{' '}
          <label
            htmlFor="file-input"
            className="text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            browse
          </label>
          {', '}
          <button
            onClick={() => setShowPasteDialog(true)}
            className="text-blue-600 hover:text-blue-700"
            type="button"
          >
            paste
          </button>
          {' or '}
          <label
            htmlFor="combine-input"
            className="text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            combine
          </label>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          CSV, Parquet, XLSX
        </p>
        <input
          type="file"
          multiple
          accept=".csv,.parquet,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
          disabled={isImporting}
        />
        <input
          type="file"
          multiple
          accept=".csv,.parquet,.xlsx,.xls"
          onChange={handleCombineFiles}
          className="hidden"
          id="combine-input"
          disabled={isImporting}
        />
        
        {isImporting && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
      
      {lastError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
          {lastError}
        </div>
      )}
      
      <PasteCSVDialog
        isOpen={showPasteDialog}
        onClose={() => setShowPasteDialog(false)}
        onImportComplete={() => {
          setShowPasteDialog(false);
          onImportComplete?.();
        }}
      />
      
      {/* Import datasource button */}
      <button
        onClick={onImportDataSource}
        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
      >
        <Database className="h-4 w-4" />
        Import datasource
      </button>
    </div>
  );
}
