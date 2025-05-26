import { useState, useEffect, useRef } from 'react';
import { Table2, RefreshCw, ChevronRight, ChevronDown, Database, Search, Eye, Trash2, Settings, Download } from 'lucide-react';
import { duckdbService } from '@/lib/duckdb';
import { savedTablesService } from '@/lib/savedTables';
import { tableMetadataService } from '@/lib/tableMetadata';
import { ContextMenu } from './ContextMenu';
import { ExportSubmenu } from './ExportSubmenu';

interface TableInfo {
  name: string;
  type: 'table' | 'view';
  isSystem: boolean;
  columns: Array<{
    name: string;
    type: string;
  }>;
  rowCount: number;
  isSaved?: boolean;
}

interface TableListProps {
  onInspectTable?: (tableName: string) => void;
  refreshTrigger?: number;
}

export function TableList({ onInspectTable, refreshTrigger }: TableListProps) {
  const [tables, setTables] = useState<Array<{name: string, type: 'table' | 'view', isSystem: boolean}>>([]);
  const [tableInfo, setTableInfo] = useState<Record<string, TableInfo>>({});
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSystemTables, setShowSystemTables] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, tableName: string, type: 'table' | 'view'} | null>(null);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savedTables, setSavedTables] = useState<Set<string>>(new Set());
  const [showBulkExport, setShowBulkExport] = useState(false);
  const bulkExportRef = useRef<HTMLDivElement>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [lastSelectedTable, setLastSelectedTable] = useState<string | null>(null);

  const loadTables = async (includeSystem: boolean = showSystemTables) => {
    setIsLoading(true);
    try {
      const tableList = await duckdbService.getTablesAndViews(includeSystem);
      setTables(tableList);
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedTables = () => {
    const saved = savedTablesService.getAll();
    setSavedTables(new Set(saved.map(t => t.originalName)));
  };

  const loadTableInfo = async (tableName: string, type: 'table' | 'view', isSystem: boolean) => {
    setLoadingTables(prev => new Set(prev).add(tableName));
    try {
      // Get column information
      const describeResult = await duckdbService.getTableInfo(tableName);
      const columns = describeResult.rows.map(row => ({
        name: row[0] as string,
        type: row[1] as string,
      }));

      // Get row count
      const countResult = await duckdbService.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = countResult.rows[0]?.[0] as number || 0;

      setTableInfo(prev => ({
        ...prev,
        [tableName]: {
          name: tableName,
          type,
          isSystem,
          columns,
          rowCount,
          isSaved: savedTables.has(tableName),
        },
      }));
    } catch (error) {
      console.error(`Failed to load info for table ${tableName}:`, error);
    } finally {
      setLoadingTables(prev => {
        const newSet = new Set(prev);
        newSet.delete(tableName);
        return newSet;
      });
    }
  };

  const toggleTable = async (tableName: string, type: 'table' | 'view', isSystem: boolean) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
      // Load table info if not already loaded
      if (!tableInfo[tableName]) {
        await loadTableInfo(tableName, type, isSystem);
      }
    }
    setExpandedTables(newExpanded);
  };

  const clearAllTables = async () => {
    if (!confirm('Are you sure you want to delete all non-saved user tables? This action cannot be undone.')) {
      return;
    }

    try {
      const nonSavedUserTables = tables.filter(t => !savedTables.has(t.name) && !t.isSystem);
      for (const table of nonSavedUserTables) {
        if (table.type === 'table') {
          await duckdbService.dropTable(table.name);
        } else {
          await duckdbService.query(`DROP VIEW IF EXISTS ${table.name}`);
        }
      }
      await loadTables(showSystemTables);
    } catch (error) {
      console.error('Failed to clear tables:', error);
      alert('Failed to clear some tables. Check console for details.');
    }
  };


  // Initial load
  useEffect(() => {
    loadTables(false); // Always start with user tables only
    loadSavedTables();

    // Subscribe to saved tables changes
    const unsubscribe = savedTablesService.subscribe(loadSavedTables);
    return unsubscribe;
  }, []);

  // Handle system tables toggle
  useEffect(() => {
    loadTables(showSystemTables);
  }, [showSystemTables]);

  // Handle refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadTables(showSystemTables);
    }
  }, [refreshTrigger]);

  // Handle clicks outside bulk export menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkExportRef.current && !bulkExportRef.current.contains(event.target as Node)) {
        setShowBulkExport(false);
      }
    };

    if (showBulkExport) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBulkExport]);

  const handleContextMenu = (e: React.MouseEvent, tableName: string, type: 'table' | 'view') => {
    e.preventDefault();
    
    // If right-clicking on a selected table, keep the selection
    // If right-clicking on an unselected table, select only that table
    if (!selectedTables.has(tableName)) {
      setSelectedTables(new Set([tableName]));
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tableName,
      type,
    });
  };

  const handleTableClick = (e: React.MouseEvent, tableName: string) => {
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      // Toggle selection with Ctrl/Cmd
      const newSelection = new Set(selectedTables);
      if (newSelection.has(tableName)) {
        newSelection.delete(tableName);
      } else {
        newSelection.add(tableName);
      }
      setSelectedTables(newSelection);
      setLastSelectedTable(tableName);
    } else if (e.shiftKey && lastSelectedTable) {
      // Range selection with Shift
      const tableNames = tables.filter(t => !t.isSystem).map(t => t.name);
      const lastIndex = tableNames.indexOf(lastSelectedTable);
      const currentIndex = tableNames.indexOf(tableName);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeSelection = new Set(selectedTables);
        
        for (let i = start; i <= end; i++) {
          rangeSelection.add(tableNames[i]);
        }
        
        setSelectedTables(rangeSelection);
      }
    } else {
      // Single selection
      setSelectedTables(new Set([tableName]));
      setLastSelectedTable(tableName);
    }
  };

  const handleRename = (tableName: string) => {
    setEditingTable(tableName);
    setEditName(tableName);
  };

  const handleDelete = async (tableName: string, _type: 'table' | 'view') => {
    // Check if multiple tables are selected
    const tablesToDelete = selectedTables.has(tableName) ? Array.from(selectedTables) : [tableName];
    const deleteCount = tablesToDelete.length;
    
    if (!confirm(`Are you sure you want to delete ${deleteCount} ${deleteCount === 1 ? 'table/view' : 'tables/views'}?`)) {
      return;
    }

    try {
      for (const tableToDelete of tablesToDelete) {
        // Find the type for each table
        const tableData = tables.find(t => t.name === tableToDelete);
        if (tableData) {
          if (tableData.type === 'table') {
            await duckdbService.dropTable(tableToDelete);
          } else {
            await duckdbService.query(`DROP VIEW IF EXISTS ${tableToDelete}`);
          }
          
          // Remove from saved tables if it was saved
          savedTablesService.deleteByOriginalName(tableToDelete);
          
          // Remove metadata
          tableMetadataService.delete(tableToDelete);
        }
      }
      
      setSelectedTables(new Set());
      await loadTables(showSystemTables);
    } catch (error) {
      console.error(`Failed to delete tables:`, error);
      alert(`Failed to delete some tables. Check console for details.`);
    }
  };

  const handleExport = async (tableName: string, format: 'sql' | 'csv-comma' | 'csv-semicolon' | 'parquet' | 'xlsx' | 'original') => {
    try {
      const tablesToExport = selectedTables.has(tableName) ? Array.from(selectedTables) : [tableName];
      
      for (const tableToExport of tablesToExport) {
        let blob: Blob;
        let filename: string;
        
        // Handle original format export
        if (format === 'original') {
          const metadata = tableMetadataService.get(tableToExport);
          if (!metadata || !metadata.originalFilename) {
            // Fall back to CSV if no original format
            const csv = await duckdbService.exportTableAsCSV(tableToExport, ',');
            blob = new Blob([csv], { type: 'text/csv' });
            filename = `${tableToExport}.csv`;
          } else {
            // Export with original delimiter and filename
            const delimiter = metadata.originalDelimiter || ',';
            const csv = await duckdbService.exportTableAsCSV(tableToExport, delimiter);
            blob = new Blob([csv], { type: 'text/csv' });
            filename = metadata.originalFilename;
          }
        } else {
          switch (format) {
            case 'sql': {
              const sql = await duckdbService.exportTableAsSQL(tableToExport);
              blob = new Blob([sql], { type: 'text/sql' });
              filename = `${tableToExport}.sql`;
              break;
            }
            case 'csv-comma': {
              const csv = await duckdbService.exportTableAsCSV(tableToExport, ',');
              blob = new Blob([csv], { type: 'text/csv' });
              filename = `${tableToExport}.csv`;
              break;
            }
            case 'csv-semicolon': {
              const csv = await duckdbService.exportTableAsCSV(tableToExport, ';');
              blob = new Blob([csv], { type: 'text/csv' });
              filename = `${tableToExport}.csv`;
              break;
            }
            case 'parquet': {
              const buffer = await duckdbService.exportTableAsParquet(tableToExport);
              blob = new Blob([buffer], { type: 'application/octet-stream' });
              filename = `${tableToExport}.parquet`;
              break;
            }
            case 'xlsx': {
              // For XLSX, we need to use a library like xlsx
              alert('XLSX export requires additional setup. For now, use CSV export.');
              return;
            }
          }
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export table:', error);
      alert('Failed to export table. Check console for details.');
    }
  };

  const handleSave = async (tableName: string, type: 'table' | 'view') => {
    try {
      const sql = await duckdbService.exportTableAsSQL(tableName);
      savedTablesService.save(tableName, tableName, type, sql);
      loadSavedTables();
    } catch (error) {
      console.error('Failed to save table:', error);
      alert('Failed to save table. Check console for details.');
    }
  };

  const handleUnsave = (tableName: string) => {
    try {
      savedTablesService.deleteByOriginalName(tableName);
      loadSavedTables();
    } catch (error) {
      console.error('Failed to unsave table:', error);
      alert('Failed to unsave table. Check console for details.');
    }
  };

  const handleBulkExport = async (format: 'sql' | 'csv-comma' | 'csv-semicolon' | 'parquet' | 'xlsx' | 'original') => {
    try {
      const userTables = tables.filter(t => !t.isSystem);
      
      if (format === 'sql') {
        // For SQL, create one big file
        let combinedSQL = '-- WebSQL Bulk Export\n';
        combinedSQL += `-- Generated on ${new Date().toISOString()}\n\n`;
        
        for (const table of userTables) {
          combinedSQL += `-- ${table.type.toUpperCase()}: ${table.name}\n`;
          const sql = await duckdbService.exportTableAsSQL(table.name);
          combinedSQL += sql + '\n\n';
        }
        
        const blob = new Blob([combinedSQL], { type: 'text/sql' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `websql_export_${new Date().toISOString().split('T')[0]}.sql`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For other formats, export individual files
        for (const table of userTables) {
          await handleExport(table.name, format);
        }
      }
    } catch (error) {
      console.error('Failed to bulk export:', error);
      alert('Failed to bulk export. Check console for details.');
    }
    setShowBulkExport(false);
  };

  const handleEndEdit = async (tableName: string) => {
    if (editName.trim() && editName !== tableName) {
      try {
        // Find the table info to determine if it's a view
        const tableData = tables.find(t => t.name === tableName);
        const isView = tableData?.type === 'view';
        
        if (isView) {
          // For views, we need to get the view definition and recreate it
          const viewDef = await duckdbService.query(`SELECT sql FROM duckdb_views() WHERE view_name = '${tableName}'`);
          if (viewDef.rows.length > 0) {
            const createViewSQL = viewDef.rows[0][0] as string;
            // Replace the view name in the CREATE VIEW statement
            // This regex handles quoted and unquoted identifiers
            const newCreateViewSQL = createViewSQL.replace(
              /CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+(?:"[^"]+"|'[^']+'|`[^`]+`|\S+)/i,
              `CREATE OR REPLACE VIEW "${editName.trim()}"`
            );
            
            // Drop old view and create new one
            await duckdbService.query(`DROP VIEW IF EXISTS "${tableName}"`);
            await duckdbService.query(newCreateViewSQL);
          }
        } else {
          // For tables, use ALTER TABLE
          await duckdbService.query(`ALTER TABLE "${tableName}" RENAME TO "${editName.trim()}"`);
        }
        
        // Update saved table if it exists
        const savedTable = savedTablesService.findByOriginalName(tableName);
        if (savedTable) {
          // Get the new SQL for the renamed table/view
          const newSQL = await duckdbService.exportTableAsSQL(editName.trim());
          // Update name, originalName, and SQL
          savedTablesService.updateWithNewOriginalNameAndSQL(savedTable.id, editName.trim(), editName.trim(), newSQL);
        }
        
        // Update metadata
        tableMetadataService.rename(tableName, editName.trim());
        
        // Reload tables and update saved tables tracking
        await loadTables(showSystemTables);
        loadSavedTables();
      } catch (error) {
        console.error('Failed to rename:', error);
        alert(`Failed to rename. Check console for details.`);
      }
    }
    setEditingTable(null);
    setEditName('');
  };

  return (
    <>
      <div className="mt-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-white mb-2 hover:text-gray-700 dark:hover:text-gray-300"
          title="Ctrl+Click to multi-select, Shift+Click to select range"
        >
          <span>Tables/Views ({tables.length})</span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowSystemTables(!showSystemTables)}
              className={`p-1 text-xs rounded transition-colors ${
                showSystemTables
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Toggle system tables/views"
            >
              <Settings className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-1">
              <div className="relative" ref={bulkExportRef}>
                <button
                  onClick={() => setShowBulkExport(!showBulkExport)}
                  disabled={tables.filter(t => !t.isSystem).length === 0}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export all tables"
                >
                  <Download className="h-4 w-4" />
                </button>
                
                {showBulkExport && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg min-w-[140px] z-50">
                    <ExportSubmenu onExport={handleBulkExport} />
                  </div>
                )}
              </div>
              
              <button
                onClick={clearAllTables}
                disabled={isLoading}
                className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                title="Clear all non-saved user tables"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => loadTables(showSystemTables)}
                disabled={isLoading}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Refresh tables"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}
        
        {isExpanded && (
          <>
            {tables.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No tables yet. Import some files to get started.
              </p>
            ) : (
              <>
                {selectedTables.size > 0 && (
                  <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 mb-2">
                    <span>{selectedTables.size} table{selectedTables.size > 1 ? 's' : ''} selected</span>
                    <button
                      onClick={() => setSelectedTables(new Set())}
                      className="hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
                <div className="space-y-1">
                {tables.map((table) => {
                  const isTableExpanded = expandedTables.has(table.name);
                  const isLoadingInfo = loadingTables.has(table.name);
                  const info = tableInfo[table.name];
                  const isSaved = savedTables.has(table.name);

                  return (
                    <div 
                      key={table.name} 
                      className={`rounded overflow-hidden ${
                        table.isSystem ? 'opacity-75' : ''
                      } ${
                        isSaved ? 'ring-2 ring-green-200 dark:ring-green-800 ring-inset' : ''
                      } ${
                        selectedTables.has(table.name) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onContextMenu={(e) => handleContextMenu(e, table.name, table.type)}
                    >
                      <div className={`flex items-center ${
                        selectedTables.has(table.name) 
                          ? 'bg-blue-100 dark:bg-blue-900/30' 
                          : 'bg-gray-50 dark:bg-gray-800'
                      }`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // If ctrl/shift is held, handle selection instead of expand
                            if ((e.ctrlKey || e.metaKey || e.shiftKey) && !table.isSystem) {
                              handleTableClick(e, table.name);
                            } else {
                              toggleTable(table.name, table.type, table.isSystem);
                            }
                          }}
                          className="flex-1 flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                        >
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            {isTableExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            )}
                            {table.type === 'view' ? (
                              <Eye className={`h-4 w-4 flex-shrink-0 ${
                                table.isSystem 
                                  ? 'text-gray-400' 
                                  : isSaved 
                                    ? 'text-green-500' 
                                    : 'text-gray-600 dark:text-gray-400'
                              }`} />
                            ) : (
                              <Table2 className={`h-4 w-4 flex-shrink-0 ${
                                table.isSystem 
                                  ? 'text-gray-400' 
                                  : isSaved 
                                    ? 'text-green-500' 
                                    : 'text-gray-600 dark:text-gray-400'
                              }`} />
                            )}
                            
                            {editingTable === table.name ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => handleEndEdit(table.name)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEndEdit(table.name);
                                  if (e.key === 'Escape') { setEditingTable(null); setEditName(''); }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent border-b border-gray-400 dark:border-gray-600 outline-none text-sm font-mono min-w-0 flex-1"
                                autoFocus
                              />
                            ) : (
                              <span className={`text-sm font-mono truncate ${
                                table.isSystem 
                                  ? 'text-gray-600 dark:text-gray-400' 
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {table.name}
                              </span>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // For system tables that are functions, add parentheses
                            const queryName = table.isSystem && !table.name.includes('.') && !table.name.includes('(')
                              ? `${table.name}()`
                              : table.name;
                            onInspectTable?.(queryName);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-l border-gray-200 dark:border-gray-700"
                          title="Open in new tab"
                        >
                          <Search className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>

                      {isTableExpanded && (
                        <div className="px-9 pb-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                          {isLoadingInfo ? (
                            <div className="py-2 text-sm text-gray-500 dark:text-gray-400">
                              Loading information...
                            </div>
                          ) : info ? (
                            <div className="py-2 space-y-1">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                {info.columns.length} columns, {info.rowCount.toLocaleString()} rows
                                {(() => {
                                  const metadata = tableMetadataService.get(table.name);
                                  if (metadata) {
                                    return (
                                      <>
                                        <br />
                                        Origin: {metadata.origin}
                                        {metadata.originalFilename && ` (${metadata.originalFilename})`}
                                      </>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              {info.columns.map((column) => (
                                <div
                                  key={column.name}
                                  className="flex items-center justify-between py-1"
                                >
                                  <div className="flex items-center space-x-2">
                                    <Database className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                                      {column.name}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                    {column.type}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-2 text-sm text-red-500">
                              Failed to load information
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={() => handleRename(contextMenu.tableName)}
          onDelete={() => handleDelete(contextMenu.tableName, contextMenu.type)}
          onExport={(format) => handleExport(contextMenu.tableName, format)}
          onSave={() => handleSave(contextMenu.tableName, contextMenu.type)}
          onUnsave={() => handleUnsave(contextMenu.tableName)}
          isSaved={savedTables.has(contextMenu.tableName)}
        />
      )}
    </>
  );
}