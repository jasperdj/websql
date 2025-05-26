interface TableMetadata {
  tableName: string;
  origin: 'file' | 'paste' | 'sql' | 'unknown';
  originalFilename?: string;
  originalDelimiter?: string;
  createdAt: number;
  rowCount?: number;
}

class TableMetadataService {
  private readonly STORAGE_KEY = 'websql_table_metadata';

  private getMetadata(): Record<string, TableMetadata> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveMetadata(metadata: Record<string, TableMetadata>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save table metadata:', error);
    }
  }

  create(tableName: string, data: Omit<TableMetadata, 'tableName' | 'createdAt'>): void {
    const metadata = this.getMetadata();
    metadata[tableName] = {
      tableName,
      ...data,
      createdAt: Date.now(),
    };
    this.saveMetadata(metadata);
  }

  update(tableName: string, data: Partial<Omit<TableMetadata, 'tableName' | 'createdAt'>>): void {
    const metadata = this.getMetadata();
    if (metadata[tableName]) {
      metadata[tableName] = {
        ...metadata[tableName],
        ...data,
      };
      this.saveMetadata(metadata);
    }
  }

  get(tableName: string): TableMetadata | null {
    const metadata = this.getMetadata();
    return metadata[tableName] || null;
  }

  delete(tableName: string): void {
    const metadata = this.getMetadata();
    delete metadata[tableName];
    this.saveMetadata(metadata);
  }

  rename(oldName: string, newName: string): void {
    const metadata = this.getMetadata();
    if (metadata[oldName]) {
      metadata[newName] = {
        ...metadata[oldName],
        tableName: newName,
      };
      delete metadata[oldName];
      this.saveMetadata(metadata);
    }
  }

  getAll(): Record<string, TableMetadata> {
    return this.getMetadata();
  }
}

export const tableMetadataService = new TableMetadataService();
export type { TableMetadata };