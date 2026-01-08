import type { DataSource, DataSourceType, LocalDirConfig, PostgresConfig } from '@/types/dataSource';

const STORAGE_KEY = 'websql_data_sources';

class DataSourceManager {
  private dataSources: Map<string, DataSource> = new Map();
  private listeners: Set<() => void> = new Set();
  // Track which tables are synced to data source files
  private dataSourceTables: Map<string, { dataSourceId: string; filePath: string; sheetName?: string }> = new Map();
  // Track file modification times for change detection
  private fileTimestamps: Map<string, number> = new Map();
  private watcherInterval: NodeJS.Timeout | null = null;
  private tableReloadListeners: Set<(tableName: string) => void> = new Set();
  // Track files currently being synced to prevent watcher interference
  private syncingFiles: Set<string> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const sources = JSON.parse(stored) as DataSource[];
        sources.forEach(source => {
          // Convert date strings back to Date objects
          source.createdAt = new Date(source.createdAt);
          source.updatedAt = new Date(source.updatedAt);
          if (source.lastSync) {
            source.lastSync = new Date(source.lastSync);
          }
          this.dataSources.set(source.id, source);
        });
      }
    } catch (error) {
      console.error('Failed to load data sources from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const sources = Array.from(this.dataSources.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    } catch (error) {
      console.error('Failed to save data sources to storage:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToTableReload(listener: (tableName: string) => void): () => void {
    this.tableReloadListeners.add(listener);
    return () => this.tableReloadListeners.delete(listener);
  }

  private notifyTableReload(tableName: string): void {
    this.tableReloadListeners.forEach(listener => listener(tableName));
  }

  getAll(): DataSource[] {
    return Array.from(this.dataSources.values());
  }

  get(id: string): DataSource | undefined {
    return this.dataSources.get(id);
  }

  add(type: DataSourceType, name: string, shortName: string, config: LocalDirConfig | PostgresConfig): DataSource {
    const id = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dataSource: DataSource = {
      id,
      type,
      name,
      shortName,
      config,
      status: 'disconnected',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dataSources.set(id, dataSource);
    this.saveToStorage();
    this.notifyListeners();

    return dataSource;
  }

  update(id: string, updates: Partial<DataSource>): boolean {
    const existing = this.dataSources.get(id);
    if (!existing) return false;

    const updated: DataSource = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID can't be changed
      updatedAt: new Date(),
    };

    this.dataSources.set(id, updated);
    this.saveToStorage();
    this.notifyListeners();

    return true;
  }

  updateStatus(id: string, status: DataSource['status'], error?: string): boolean {
    return this.update(id, { status, error });
  }

  delete(id: string): boolean {
    const deleted = this.dataSources.delete(id);
    if (deleted) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return deleted;
  }

  async testConnection(source: DataSource): Promise<{ success: boolean; message: string }> {
    try {
      if (source.type === 'local_directory') {
        // Check if we're in Tauri using multiple methods
        const isTauriProtocol = window.location.protocol === 'tauri:' || 
                                window.location.protocol === 'https:' && window.location.hostname === 'tauri.localhost';
        const isTauriDev = window.location.hostname === 'localhost' && window.location.port === '1420';
        const hasTauriGlobal = !!(window.__TAURI__ || window.__TAURI_INTERNALS__ || window.__TAURI_INVOKE__);
        const isTauri = hasTauriGlobal || isTauriProtocol || isTauriDev;

        if (isTauri) {
          const config = source.config as LocalDirConfig;
          if (!config.path) {
            throw new Error('Directory path is required');
          }
          
          try {
            // Test directory access by trying to read it
            const { readDir } = await import('@tauri-apps/plugin-fs');
            await readDir(config.path);
            return { success: true, message: 'Directory accessible' };
          } catch (error) {
            console.error('Directory test failed:', error);
            throw new Error(`Cannot access directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          throw new Error('Local directory access requires desktop app');
        }
      } else if (source.type === 'postgres') {
        // For PostgreSQL, we would use DuckDB's postgres scanner
        const config = source.config as PostgresConfig;
        
        if (!config.host || !config.database || !config.username) {
          throw new Error('Missing required PostgreSQL connection parameters');
        }

        // TODO: Implement actual PostgreSQL connection test using DuckDB
        // For now, simulate a connection test
        return { success: true, message: 'PostgreSQL connection successful' };
      }

      throw new Error('Unknown data source type');
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async connect(id: string): Promise<void> {
    const source = this.dataSources.get(id);
    if (!source) throw new Error('Data source not found');

    this.updateStatus(id, 'connecting');

    try {
      const result = await this.testConnection(source);
      if (result.success) {
        this.updateStatus(id, 'connected');
        this.update(id, { lastSync: new Date() });
      } else {
        this.updateStatus(id, 'error', result.message);
        throw new Error(result.message);
      }
    } catch (error) {
      this.updateStatus(id, 'error', error instanceof Error ? error.message : 'Connection failed');
      throw error;
    }
  }

  disconnect(id: string): void {
    this.updateStatus(id, 'disconnected');
  }

  async readFile(source: DataSource, filePath: string): Promise<ArrayBuffer> {
    if (source.type === 'local_directory') {
      // Check if we're in Tauri using multiple methods
      const isTauriProtocol = window.location.protocol === 'tauri:' || 
                              window.location.protocol === 'https:' && window.location.hostname === 'tauri.localhost';
      const isTauriDev = window.location.hostname === 'localhost' && window.location.port === '1420';
      const hasTauriGlobal = !!(window.__TAURI__ || window.__TAURI_INTERNALS__ || window.__TAURI_INVOKE__);
      const isTauri = hasTauriGlobal || isTauriProtocol || isTauriDev;

      if (!isTauri) {
        throw new Error('File system access requires desktop app');
      }

      try {
        const { readFile } = await import('@tauri-apps/plugin-fs');
        const uint8Array = await readFile(filePath);
        return uint8Array.buffer;
      } catch (error) {
        throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      throw new Error('File reading not implemented for this data source type');
    }
  }

  async readTextFile(source: DataSource, filePath: string): Promise<string> {
    if (source.type === 'local_directory') {
      // Check if we're in Tauri using multiple methods
      const isTauriProtocol = window.location.protocol === 'tauri:' || 
                              window.location.protocol === 'https:' && window.location.hostname === 'tauri.localhost';
      const isTauriDev = window.location.hostname === 'localhost' && window.location.port === '1420';
      const hasTauriGlobal = !!(window.__TAURI__ || window.__TAURI_INTERNALS__ || window.__TAURI_INVOKE__);
      const isTauri = hasTauriGlobal || isTauriProtocol || isTauriDev;

      if (!isTauri) {
        throw new Error('File system access requires desktop app');
      }

      try {
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        return await readTextFile(filePath);
      } catch (error) {
        throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      throw new Error('File reading not implemented for this data source type');
    }
  }

  async writeFile(source: DataSource, filePath: string, content: string | ArrayBuffer): Promise<void> {
    if (source.type === 'local_directory') {
      // Check if we're in Tauri using multiple methods
      const isTauriProtocol = window.location.protocol === 'tauri:' || 
                              window.location.protocol === 'https:' && window.location.hostname === 'tauri.localhost';
      const isTauriDev = window.location.hostname === 'localhost' && window.location.port === '1420';
      const hasTauriGlobal = !!(window.__TAURI__ || window.__TAURI_INTERNALS__ || window.__TAURI_INVOKE__);
      const isTauri = hasTauriGlobal || isTauriProtocol || isTauriDev;

      if (!isTauri) {
        throw new Error('File system access requires desktop app');
      }

      try {
        if (typeof content === 'string') {
          const { writeTextFile } = await import('@tauri-apps/plugin-fs');
          await writeTextFile(filePath, content, { create: true });
        } else {
          const { writeFile } = await import('@tauri-apps/plugin-fs');
          const uint8Array = new Uint8Array(content);
          await writeFile(filePath, uint8Array, { create: true });
        }
      } catch (error) {
        const details = error instanceof Error ? error.message : JSON.stringify(error);
        throw new Error(`Failed to write file: ${details}`);
      }
    } else {
      throw new Error('File writing not implemented for this data source type');
    }
  }

  // Track a table as being synced to a data source file
  trackDataSourceTable(tableName: string, dataSourceId: string, filePath: string, sheetName?: string): void {
    this.dataSourceTables.set(tableName, { dataSourceId, filePath, sheetName });
    
    // Initialize file timestamp and start watcher if not already running
    this.initializeFileTimestamp(tableName);
    if (!this.watcherInterval) {
      this.startFileWatcher();
    }
  }

  // Check if a table is from a data source
  isDataSourceTable(tableName: string): boolean {
    return this.dataSourceTables.has(tableName);
  }

  // Get data source info for a table
  getDataSourceTableInfo(tableName: string): { dataSourceId: string; filePath: string; sheetName?: string } | null {
    return this.dataSourceTables.get(tableName) || null;
  }

  // Get all data source table names
  getDataSourceTableNames(): string[] {
    return Array.from(this.dataSourceTables.keys());
  }

  // Export DuckDB table data to CSV format
  async exportTableToCSV(tableName: string): Promise<string> {
    const { duckdbService } = await import('./duckdb');
    
    try {
      // Query all data from the table
      const result = await duckdbService.query(`SELECT * FROM ${tableName}`);
      
      if (!result.rows || result.rows.length === 0) {
        return '';
      }

      // Convert to CSV
      const headers = result.columns;
      const csvLines = [headers.join(',')];
      
      for (const row of result.rows) {
        const csvRow = headers.map((header, index) => {
          const value = row[index];
          // Handle null/undefined values
          if (value === null || value === undefined) {
            return '';
          }
          // Quote values that contain commas, quotes, or newlines
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csvLines.push(csvRow.join(','));
      }
      
      return csvLines.join('\n');
    } catch (error) {
      throw new Error(`Failed to export table: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Write table changes back to source file immediately
  async syncTableToFile(tableName: string): Promise<void> {
    const tableInfo = this.getDataSourceTableInfo(tableName);
    if (!tableInfo) {
      throw new Error('Table is not tracked as a data source table');
    }

    const dataSource = this.get(tableInfo.dataSourceId);
    if (!dataSource) {
      throw new Error('Data source not found');
    }

    if (dataSource.type === 'local_directory') {
      const config = dataSource.config as LocalDirConfig;
      if (!config.syncEnabled) {
        return;
      }
    }

    // Mark file as being synced to prevent watcher from reloading it
    this.syncingFiles.add(tableInfo.filePath);

    try {
      const fileExtension = tableInfo.filePath.split('.').pop()?.toLowerCase();
      if (!fileExtension) {
        throw new Error('Missing file extension for data source');
      }

      if (fileExtension === 'csv') {
        const csvContent = await this.exportTableToCSV(tableName);
        await this.writeFile(dataSource, tableInfo.filePath, csvContent);
      } else if (fileExtension === 'parquet') {
        const { duckdbService } = await import('./duckdb');
        const parquetBuffer = await duckdbService.exportTableAsParquet(tableName);
        await this.writeFile(dataSource, tableInfo.filePath, parquetBuffer);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const { read, utils, write } = await import('xlsx');
        const sheetName = tableInfo.sheetName || 'Sheet1';
        let workbook;
        try {
          const existingBuffer = await this.readFile(dataSource, tableInfo.filePath);
          workbook = read(existingBuffer, { type: 'array' });
        } catch {
          workbook = utils.book_new();
        }
        const { duckdbService } = await import('./duckdb');
        const { columns, rows } = await duckdbService.exportTableAsXLSX(tableName);
        const data = [columns, ...rows];
        const worksheet = utils.aoa_to_sheet(data);
        if (workbook.SheetNames.includes(sheetName)) {
          workbook.Sheets[sheetName] = worksheet;
        } else {
          utils.book_append_sheet(workbook, worksheet, sheetName);
        }
        // xlsx write returns number[], convert to ArrayBuffer for writeFile
        const updatedArray = write(workbook, { type: 'array', bookType: 'xlsx' });
        const updatedBuffer = new Uint8Array(updatedArray).buffer;
        await this.writeFile(dataSource, tableInfo.filePath, updatedBuffer);
      } else {
        console.warn(`Skipping sync for ${tableName}: unsupported file type ${fileExtension}`);
        return;
      }

      const stats = await this.getFileStats(dataSource, tableInfo.filePath);
      if (stats) {
        this.fileTimestamps.set(tableInfo.filePath, stats.modifiedAt.getTime());
      }
      
      console.log(`Synced table ${tableName} to file ${tableInfo.filePath}`);
    } catch (error) {
      // Extract detailed error info for debugging
      const errorDetails = error instanceof Error
        ? { message: error.message, name: error.name, stack: error.stack }
        : { raw: String(error), type: typeof error };
      console.error(`Failed to sync table ${tableName}:`, errorDetails);
      throw error;
    } finally {
      // Remove sync lock after write and timestamp update complete
      this.syncingFiles.delete(tableInfo.filePath);
    }
  }

  // Start watching data source files for changes
  startFileWatcher(): void {
    if (this.watcherInterval) {
      clearInterval(this.watcherInterval);
    }

    // Check for file changes every 2 seconds
    this.watcherInterval = setInterval(async () => {
      await this.checkForFileChanges();
    }, 2000);
  }

  // Stop watching files
  stopFileWatcher(): void {
    if (this.watcherInterval) {
      clearInterval(this.watcherInterval);
      this.watcherInterval = null;
    }
  }

  // Check if any tracked files have changed
  private async checkForFileChanges(): Promise<void> {
    for (const [tableName, tableInfo] of this.dataSourceTables) {
      try {
        const dataSource = this.get(tableInfo.dataSourceId);
        if (!dataSource || dataSource.status !== 'connected') continue;
        if (dataSource.type === 'local_directory') {
          const config = dataSource.config as LocalDirConfig;
          if (!config.watchEnabled) continue;
        }

        // Skip files currently being synced to prevent race conditions
        if (this.syncingFiles.has(tableInfo.filePath)) continue;

        // Get file stats to check modification time
        const stats = await this.getFileStats(dataSource, tableInfo.filePath);
        if (!stats) continue;

        const currentTimestamp = stats.modifiedAt.getTime();
        const lastTimestamp = this.fileTimestamps.get(tableInfo.filePath);

        if (lastTimestamp && currentTimestamp > lastTimestamp) {
          const fileExtension = tableInfo.filePath.split('.').pop()?.toLowerCase();
          if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            const relatedTables = Array.from(this.dataSourceTables.entries())
              .filter(([, info]) => info.filePath === tableInfo.filePath)
              .map(([name]) => name);
            for (const relatedTable of relatedTables) {
              console.log(`File changed: ${tableInfo.filePath}, reloading table ${relatedTable}`);
              await this.reloadTableFromFile(relatedTable, dataSource, tableInfo.filePath);
            }
          } else {
            console.log(`File changed: ${tableInfo.filePath}, reloading table ${tableName}`);
            await this.reloadTableFromFile(tableName, dataSource, tableInfo.filePath);
          }
        }

        this.fileTimestamps.set(tableInfo.filePath, currentTimestamp);
      } catch (error) {
        console.error(`Error checking file ${tableInfo.filePath}:`, error);
      }
    }
  }

  // Get file statistics
  private async getFileStats(source: DataSource, filePath: string): Promise<{ modifiedAt: Date } | null> {
    if (source.type === 'local_directory') {
      // Check if we're in Tauri using multiple methods
      const isTauriProtocol = window.location.protocol === 'tauri:' || 
                              window.location.protocol === 'https:' && window.location.hostname === 'tauri.localhost';
      const isTauriDev = window.location.hostname === 'localhost' && window.location.port === '1420';
      const hasTauriGlobal = !!(window.__TAURI__ || window.__TAURI_INTERNALS__ || window.__TAURI_INVOKE__);
      const isTauri = hasTauriGlobal || isTauriProtocol || isTauriDev;

      if (!isTauri) return null;

      try {
        const { stat } = await import('@tauri-apps/plugin-fs');
        const stats = await stat(filePath);
        const rawMtime = stats.mtime ?? Date.now();
        const mtimeValue = rawMtime instanceof Date ? rawMtime.getTime() : rawMtime;
        const normalizedMtime = mtimeValue < 1e12 ? mtimeValue * 1000 : mtimeValue;
        return {
          modifiedAt: new Date(normalizedMtime)
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  // Reload a table from its source file
  private async reloadTableFromFile(tableName: string, dataSource: DataSource, filePath: string): Promise<void> {
    try {
      // Read the updated file
      const fileBuffer = await this.readFile(dataSource, filePath);
      
      // Create a File object for DuckDB import
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'file';
      const blob = new Blob([fileBuffer]);
      const fileObj = new File([blob], fileName);
      
      // Drop the existing table and recreate it
      const { duckdbService } = await import('./duckdb');
      await duckdbService.query(`DROP TABLE IF EXISTS ${tableName}`);
      const tableInfo = this.getDataSourceTableInfo(tableName);
      if (tableInfo?.sheetName) {
        await duckdbService.importXlsxSheet(tableName, fileBuffer, tableInfo.sheetName);
      } else {
        await duckdbService.importFile(fileObj, tableName);
      }
      
      console.log(`Reloaded table ${tableName} from ${filePath}`);
      this.notifyTableReload(tableName);
    } catch (error) {
      console.error(`Failed to reload table ${tableName}:`, error);
    }
  }

  // Initialize file timestamps when tracking a table
  async initializeFileTimestamp(tableName: string): Promise<void> {
    const tableInfo = this.getDataSourceTableInfo(tableName);
    if (!tableInfo) return;

    const dataSource = this.get(tableInfo.dataSourceId);
    if (!dataSource) return;

    try {
      const stats = await this.getFileStats(dataSource, tableInfo.filePath);
      if (stats) {
        this.fileTimestamps.set(tableInfo.filePath, stats.modifiedAt.getTime());
      }
    } catch (error) {
      console.error(`Failed to initialize timestamp for ${tableInfo.filePath}:`, error);
    }
  }
}

export const dataSourceManager = new DataSourceManager();
