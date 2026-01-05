export type DataSourceType = 'local_directory' | 'postgres';

export interface LocalDirConfig {
  path: string;
  watchEnabled: boolean;
  syncEnabled: boolean;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema?: string;
}

export interface DataSource {
  id: string;
  type: DataSourceType;
  name: string;
  shortName: string;
  config: LocalDirConfig | PostgresConfig;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastSync?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  fileType?: 'columnar' | 'text' | 'sql' | 'other';
  size?: number;
  modifiedAt?: Date;
  sheetName?: string;
}
