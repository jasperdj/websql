import type { DataSource, DataSourceType, LocalDirConfig, PostgresConfig } from '@/types/dataSource';

const STORAGE_KEY = 'websql_data_sources';

class DataSourceManager {
  private dataSources: Map<string, DataSource> = new Map();
  private listeners: Set<() => void> = new Set();

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

  getAll(): DataSource[] {
    return Array.from(this.dataSources.values());
  }

  get(id: string): DataSource | undefined {
    return this.dataSources.get(id);
  }

  add(type: DataSourceType, name: string, config: LocalDirConfig | PostgresConfig): DataSource {
    const id = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dataSource: DataSource = {
      id,
      type,
      name,
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
          // TODO: Implement actual directory check using Tauri fs API
          const config = source.config as LocalDirConfig;
          if (!config.path) {
            throw new Error('Directory path is required');
          }
          // Simulate successful connection for now
          return { success: true, message: 'Directory accessible' };
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
}

export const dataSourceManager = new DataSourceManager();