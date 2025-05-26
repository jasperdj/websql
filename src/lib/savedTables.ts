export interface SavedTable {
  id: string;
  name: string;
  originalName: string; // The original table/view name in DuckDB
  type: 'table' | 'view';
  sql: string; // CREATE TABLE/VIEW statement or data export
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'websql-saved-tables';

class SavedTablesService {
  private savedTables: SavedTable[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.savedTables = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load saved tables from localStorage:', error);
      this.savedTables = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.savedTables));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save tables to localStorage:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getAll(): SavedTable[] {
    return [...this.savedTables];
  }

  getById(id: string): SavedTable | undefined {
    return this.savedTables.find(t => t.id === id);
  }

  findByOriginalName(originalName: string): SavedTable | undefined {
    return this.savedTables.find(t => t.originalName === originalName);
  }

  isSaved(tableName: string): boolean {
    return this.savedTables.some(t => t.originalName === tableName);
  }

  save(name: string, originalName: string, type: 'table' | 'view', sql: string): SavedTable {
    const now = Date.now();
    
    // Check if already exists and update
    const existing = this.findByOriginalName(originalName);
    if (existing) {
      existing.name = name;
      existing.sql = sql;
      existing.updatedAt = now;
      this.saveToStorage();
      return existing;
    }

    // Create new
    const newTable: SavedTable = {
      id: now.toString(),
      name,
      originalName,
      type,
      sql,
      createdAt: now,
      updatedAt: now,
    };

    this.savedTables.push(newTable);
    this.saveToStorage();
    return newTable;
  }

  update(id: string, updates: Partial<Pick<SavedTable, 'name' | 'sql'>>): SavedTable | null {
    const index = this.savedTables.findIndex(t => t.id === id);
    if (index === -1) return null;

    const table = this.savedTables[index];
    this.savedTables[index] = {
      ...table,
      ...updates,
      updatedAt: Date.now(),
    };

    this.saveToStorage();
    return this.savedTables[index];
  }

  updateWithNewOriginalName(id: string, newName: string, newOriginalName: string): SavedTable | null {
    const index = this.savedTables.findIndex(t => t.id === id);
    if (index === -1) return null;

    const table = this.savedTables[index];
    this.savedTables[index] = {
      ...table,
      name: newName,
      originalName: newOriginalName,
      updatedAt: Date.now(),
    };

    this.saveToStorage();
    return this.savedTables[index];
  }

  updateWithNewOriginalNameAndSQL(id: string, newName: string, newOriginalName: string, newSQL: string): SavedTable | null {
    const index = this.savedTables.findIndex(t => t.id === id);
    if (index === -1) return null;

    const table = this.savedTables[index];
    this.savedTables[index] = {
      ...table,
      name: newName,
      originalName: newOriginalName,
      sql: newSQL,
      updatedAt: Date.now(),
    };

    this.saveToStorage();
    return this.savedTables[index];
  }

  delete(id: string): boolean {
    const index = this.savedTables.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.savedTables.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  deleteByOriginalName(originalName: string): boolean {
    const index = this.savedTables.findIndex(t => t.originalName === originalName);
    if (index === -1) return false;

    this.savedTables.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  // Get saved tables that should be restored on startup
  getTablesForRestore(): SavedTable[] {
    return this.savedTables.filter(t => t.type === 'table');
  }

  exists(name: string): boolean {
    return this.savedTables.some(t => t.name === name);
  }

  async restoreAllTables(): Promise<{ restored: number; failed: string[] }> {
    const { duckdbService } = await import('./duckdb');
    const { tableMetadataService } = await import('./tableMetadata');
    const failedTables: string[] = [];
    let restoredCount = 0;

    for (const savedTable of this.savedTables) {
      try {
        await duckdbService.executeSQLScript(savedTable.sql);
        restoredCount++;
        console.log(`Restored ${savedTable.type}: ${savedTable.name}`);
        
        // Add metadata for restored table
        tableMetadataService.create(savedTable.originalName, {
          origin: 'sql',
        });
      } catch (error) {
        console.error(`Failed to restore ${savedTable.type} ${savedTable.name}:`, error);
        failedTables.push(savedTable.name);
      }
    }

    return { restored: restoredCount, failed: failedTables };
  }
}

export const savedTablesService = new SavedTablesService();