import React, { useMemo, useCallback, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, GridApi, CellValueChangedEvent, CellClickedEvent, CellClassParams } from 'ag-grid-community';
import { Download } from 'lucide-react';
import type { QueryResult } from '@/lib/duckdb';
import { duckdbService } from '@/lib/duckdb';
import { savedTablesService } from '@/lib/savedTables';
import { dataSourceManager } from '@/lib/dataSourceManager';

interface TableViewerProps {
  result: QueryResult | null;
  query?: string;
}

interface SelectedCell {
  rowIndex: number;
  colId: string;
}

export function TableViewer({ result, query }: TableViewerProps) {
  const [gridApi, setGridApi] = React.useState<GridApi | null>(null);
  const [previousColumns, setPreviousColumns] = React.useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [lastClickedCell, setLastClickedCell] = useState<SelectedCell | null>(null);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  // Parse query to determine if it's editable (single table query)
  const editableInfo = useMemo(() => {
    if (!query) return { isEditable: false, tableName: null };
    
    const trimmedQuery = query.trim().toUpperCase();
    
    // Check for JOINs, GROUP BY, or subqueries
    if (trimmedQuery.includes('JOIN') || 
        trimmedQuery.includes('GROUP BY') || 
        trimmedQuery.includes('UNION') ||
        trimmedQuery.includes('(SELECT')) {
      return { isEditable: false, tableName: null };
    }
    
    // Try to extract table name from simple queries
    const fromMatch = query.match(/FROM\s+["']?(\w+)["']?/i);
    if (fromMatch && fromMatch[1]) {
      return { isEditable: true, tableName: fromMatch[1] };
    }
    
    return { isEditable: false, tableName: null };
  }, [query]);

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!result || result.columns.length === 0) return [];

    return result.columns.map((col) => ({
      field: col,
      headerName: col,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
      cellDataType: false, // Disable auto type detection
      valueFormatter: (params: { value: unknown }) => {
        if (params.value === null) {
          return 'NULL';
        }
        if (params.value === undefined) {
          return '-';
        }
        return String(params.value);
      },
      cellClass: (params: CellClassParams) => {
        const classes = [];
        if (params.value === null || params.value === undefined) {
          classes.push('text-gray-400');
        }
        
        // Add selected class if cell is in selection
        const cellKey = `${params.rowIndex}-${params.column?.getColId()}`;
        if (selectedCells.has(cellKey)) {
          classes.push('ag-cell-range-selected');
        }
        
        return classes.join(' ');
      },
    }));
  }, [result, selectedCells]);

  const rowData = useMemo(() => {
    if (!result || !result.rows) return [];
    
    return result.rows.map((row) => {
      const rowObj: Record<string, unknown> = {};
      result.columns.forEach((col, idx) => {
        rowObj[col] = row[idx];
      });
      return rowObj;
    });
  }, [result]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    editable: editableInfo.isEditable,
    singleClickEdit: false, // Require double-click to edit
  }), [editableInfo.isEditable]);

  // Handle cell value changes
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    if (!editableInfo.tableName) return;
    
    try {
      // Build WHERE clause using all other columns
      const whereConditions: string[] = [];
      const rowData = event.data;
      
      for (const [key, value] of Object.entries(rowData)) {
        if (key !== event.colDef.field) {
          // Quote column names with double quotes for SQL identifiers
          const quotedKey = `"${key.replace(/"/g, '""')}"`;
          if (value === null) {
            whereConditions.push(`${quotedKey} IS NULL`);
          } else if (typeof value === 'string') {
            whereConditions.push(`${quotedKey} = '${value.replace(/'/g, "''")}'`);
          } else {
            whereConditions.push(`${quotedKey} = ${value}`);
          }
        }
      }
      
      // Build UPDATE query - quote column name for SQL identifiers
      const quotedField = `"${String(event.colDef.field).replace(/"/g, '""')}"`;
      let newValue = event.newValue;
      if (newValue === null || newValue === 'NULL' || newValue === '') {
        newValue = 'NULL';
      } else if (typeof newValue === 'string' && isNaN(Number(newValue))) {
        newValue = `'${newValue.replace(/'/g, "''")}'`;
      }

      const updateQuery = `UPDATE ${editableInfo.tableName} SET ${quotedField} = ${newValue} WHERE ${whereConditions.join(' AND ')}`;
      
      await duckdbService.query(updateQuery);
      
      // Immediately sync to data source file if this is a data source table
      if (dataSourceManager.isDataSourceTable(editableInfo.tableName)) {
        try {
          await dataSourceManager.syncTableToFile(editableInfo.tableName);
        } catch (error) {
          console.error('Failed to sync to source file:', error);
          // Don't show an alert, just log the error - user still gets their edit
        }
      }
      
      // Update saved table if it exists
      const savedTable = savedTablesService.findByOriginalName(editableInfo.tableName);
      if (savedTable) {
        // Export the updated table data
        const updatedSQL = await duckdbService.exportTableAsSQL(editableInfo.tableName);
        savedTablesService.update(savedTable.id, { sql: updatedSQL });
      }
    } catch (error) {
      console.error('Failed to update cell:', error);
      alert('Failed to update cell. Check console for details.');
      // Revert the change
      event.node.setDataValue(event.colDef.field!, event.oldValue);
    }
  }, [editableInfo.tableName]);

  // Handle cell clicks for custom selection
  const onCellClicked = useCallback((event: CellClickedEvent) => {
    if (!editableInfo.isEditable) return;
    
    const cellKey = `${event.rowIndex}-${event.column.getColId()}`;
    
    const mouseEvent = event.event as MouseEvent | undefined;
    if (mouseEvent?.ctrlKey || mouseEvent?.metaKey) {
      // Ctrl+Click: Toggle cell selection
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey);
        } else {
          newSet.add(cellKey);
        }
        return newSet;
      });
    } else if (mouseEvent?.shiftKey && lastClickedCell) {
      // Shift+Click: Select range
      const startRow = Math.min(lastClickedCell.rowIndex, event.rowIndex!);
      const endRow = Math.max(lastClickedCell.rowIndex, event.rowIndex!);
      
      // Only allow selection within the same column
      if (lastClickedCell.colId === event.column.getColId()) {
        const newSelection = new Set<string>();
        for (let i = startRow; i <= endRow; i++) {
          newSelection.add(`${i}-${event.column.getColId()}`);
        }
        setSelectedCells(newSelection);
      }
    } else {
      // Regular click: Select only this cell
      setSelectedCells(new Set([cellKey]));
    }
    
    setLastClickedCell({ rowIndex: event.rowIndex!, colId: event.column.getColId() });
  }, [editableInfo.isEditable, lastClickedCell]);

  // Handle paste operation
  const handlePaste = useCallback((event: Event) => {
    const clipboardEvent = event as ClipboardEvent;
    if (!editableInfo.isEditable || !editableInfo.tableName || !gridApi || selectedCells.size === 0) return;
    
    // Get the pasted value
    const pastedData = clipboardEvent.clipboardData?.getData('text/plain')?.trim();
    if (!pastedData) return;
    
    clipboardEvent.preventDefault();
    
    // Check if selection spans multiple columns
    const columns = new Set<string>();
    selectedCells.forEach(cellKey => {
      const [, colId] = cellKey.split('-');
      columns.add(colId);
    });
    
    if (columns.size > 1) {
      alert('Cannot paste across multiple columns. Please select cells within a single column.');
      return;
    }
    
    // Update each selected cell asynchronously
    (async () => {
      for (const cellKey of selectedCells) {
        const [rowIndexStr, colId] = cellKey.split('-');
        const rowIndex = parseInt(rowIndexStr);
        
        const node = gridApi.getDisplayedRowAtIndex(rowIndex);
        if (node) {
          const oldValue = node.data[colId];
          node.setDataValue(colId, pastedData);
          
          // Trigger the update to database
          const event = {
            data: node.data,
            oldValue,
            newValue: pastedData,
            colDef: { field: colId },
            node
          } as CellValueChangedEvent;
          
          await onCellValueChanged(event);
        }
      }
      
      // Clear selection after paste
      setSelectedCells(new Set());
    })();
  }, [editableInfo, gridApi, selectedCells, onCellValueChanged]);

  // Add paste event listener
  React.useEffect(() => {
    if (editableInfo.isEditable && gridApi) {
      const gridDiv = document.querySelector('.ag-theme-quartz');
      if (gridDiv) {
        gridDiv.addEventListener('paste', handlePaste);
        return () => {
          gridDiv.removeEventListener('paste', handlePaste);
        };
      }
    }
  }, [editableInfo.isEditable, gridApi, handlePaste]);

  const onFirstDataRendered = useCallback(() => {
    if (gridApi) {
      gridApi.sizeColumnsToFit();
    }
  }, [gridApi]);

  // Auto-size columns when columns change
  React.useEffect(() => {
    if (gridApi && result && result.columns.length > 0) {
      const columnsChanged = result.columns.length !== previousColumns.length ||
        result.columns.some((col, idx) => col !== previousColumns[idx]);
      
      if (columnsChanged) {
        setPreviousColumns(result.columns);
        // Small delay to ensure grid is rendered with new data
        setTimeout(() => {
          gridApi.sizeColumnsToFit();
        }, 100);
      }
    }
  }, [gridApi, result, previousColumns]);

  const exportToCsv = useCallback(() => {
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: 'query-results.csv',
      });
    }
  }, [gridApi]);


  if (!result) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Run a query to see results
          </p>
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200">
          <strong>Error:</strong> {result.error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Query Results ({result.rows.length} rows)
            {editableInfo.isEditable && (
              <span className="ml-2 text-sm font-normal text-green-600 dark:text-green-400">
                (Editable - {editableInfo.tableName})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCsv}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => {
                if (gridApi) {
                  gridApi.setFilterModel(null);
                }
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              Clear Filters
            </button>
            <button
              onClick={() => {
                if (gridApi) {
                  gridApi.sizeColumnsToFit();
                }
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              Auto Size
            </button>
          </div>
        </div>
      </div>

      <div className="ag-theme-quartz flex-1" style={{ height: 'calc(100% - 73px)' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onFirstDataRendered={onFirstDataRendered}
          onCellValueChanged={onCellValueChanged}
          onCellClicked={onCellClicked}
          animateRows={true}
          pagination={true}
          paginationPageSize={50}
          paginationPageSizeSelector={[10, 20, 50, 100, 200, 500]}
          enableCellTextSelection={!editableInfo.isEditable}
          ensureDomOrder={true}
          suppressMenuHide={true}
          rowSelection={editableInfo.isEditable ? undefined : {
            mode: 'multiRow',
            checkboxes: true,
            headerCheckbox: true,
            enableClickSelection: false,
            selectAll: 'currentPage'
          }}
          selectionColumnDef={editableInfo.isEditable ? undefined : {
            width: 40,
            minWidth: 40,
            maxWidth: 40,
            resizable: false,
            suppressSizeToFit: true
          }}
          headerHeight={40}
          rowHeight={40}
        />
      </div>
    </div>
  );
}
