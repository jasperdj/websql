import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  error?: string;
}

class DuckDBService {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
        mvp: {
          mainModule: duckdb_wasm,
          mainWorker: mvp_worker,
        },
        eh: {
          mainModule: duckdb_wasm_eh,
          mainWorker: eh_worker,
        },
      };

      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
      
      const worker = new Worker(bundle.mainWorker!);
      const logger = new duckdb.ConsoleLogger();
      
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      
      this.conn = await this.db.connect();
      
      // Enable OPFS if available
      if ('storage' in navigator && 'getDirectory' in navigator.storage) {
        // OPFS registration - commented out for now as API may have changed
        // TODO: Implement OPFS persistence
      }
    } catch (error) {
      console.error('Failed to initialize DuckDB:', error);
      throw error;
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.conn) {
      await this.initialize();
    }

    try {
      // Split SQL into individual statements (simple approach)
      // DuckDB doesn't support multiple statements in one query() call
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      let lastResult: QueryResult = {
        columns: [],
        rows: [],
        rowCount: 0,
      };

      // Execute each statement sequentially
      for (const statement of statements) {
        try {
          const result = await this.conn!.query(statement);
          const columns = result.schema.fields.map(f => f.name);
          const rows = result.toArray().map(row => {
            return columns.map(col => row[col]);
          });

          // Only update lastResult if this statement returns data
          // (CREATE VIEW, INSERT, etc. might not return rows)
          if (columns.length > 0 || rows.length > 0) {
            lastResult = {
              columns,
              rows,
              rowCount: rows.length,
            };
          }
        } catch (error) {
          // If any statement fails, return error immediately
          return {
            columns: [],
            rows: [],
            rowCount: 0,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      return lastResult;
    } catch (error) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async importCSV(tableName: string, csvContent: string): Promise<void> {
    if (!this.conn) {
      await this.initialize();
    }

    // Create a temporary file in DuckDB
    const fileName = `${tableName}.csv`;
    await this.db!.registerFileText(fileName, csvContent);

    // Import CSV into table
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} AS SELECT * FROM read_csv_auto('${fileName}')`;
    await this.query(sql);
  }

  async importParquet(tableName: string, buffer: ArrayBuffer): Promise<void> {
    if (!this.conn) {
      await this.initialize();
    }

    // Register the parquet file
    const fileName = `${tableName}.parquet`;
    await this.db!.registerFileBuffer(fileName, new Uint8Array(buffer));

    // Import Parquet into table
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} AS SELECT * FROM read_parquet('${fileName}')`;
    await this.query(sql);
  }

  async importXlsx(tableName: string, buffer: ArrayBuffer): Promise<string[]> {
    if (!this.conn) {
      await this.initialize();
    }

    const { read, utils } = await import('xlsx');
    const workbook = read(buffer, { type: 'array' });
    const createdTables: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const csv = utils.sheet_to_csv(sheet);
      if (!csv.trim()) continue;
      const sanitizedSheet = sheetName.replace(/[^a-zA-Z0-9_]/g, '_');
      const sheetTableName = `${tableName}_${sanitizedSheet}`;
      await this.importCSV(sheetTableName, csv);
      createdTables.push(sheetTableName);
    }

    return createdTables;
  }

  async importXlsxSheet(tableName: string, buffer: ArrayBuffer, sheetName: string): Promise<void> {
    if (!this.conn) {
      await this.initialize();
    }

    const { read, utils } = await import('xlsx');
    const workbook = read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in workbook`);
    }
    const csv = utils.sheet_to_csv(sheet);
    await this.importCSV(tableName, csv);
  }

  async importFile(file: File, tableName: string): Promise<void> {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      const content = await file.text();
      await this.importCSV(tableName, content);
    } else if (fileName.endsWith('.parquet')) {
      const buffer = await file.arrayBuffer();
      await this.importParquet(tableName, buffer);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      await this.importXlsx(tableName, buffer);
    } else {
      throw new Error(`Unsupported file type: ${fileName}`);
    }
  }

  async getTables(): Promise<string[]> {
    const result = await this.query("SHOW TABLES");
    return result.rows.map(row => row[0] as string);
  }

  async getTablesAndViews(includeSystem: boolean = false): Promise<Array<{name: string, type: 'table' | 'view', isSystem: boolean}>> {
    try {
      const items: Array<{name: string, type: 'table' | 'view', isSystem: boolean}> = [];
      
      // First, always get user tables
      const userTablesResult = await this.query('SHOW TABLES');
      
      // Get views info - try multiple methods
      const viewNames = new Set<string>();
      
      // Method 1: Try duckdb_views()
      try {
        const viewsResult = await this.query(`
          SELECT view_name 
          FROM duckdb_views() 
          WHERE schema_name = 'main'
        `);
        for (const row of viewsResult.rows) {
          viewNames.add(row[0] as string);
        }
      } catch {
        // Method 2: Try information_schema.views
        try {
          const viewsResult = await this.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'main'
          `);
          for (const row of viewsResult.rows) {
            viewNames.add(row[0] as string);
          }
        } catch {
          // Views detection failed, we'll default to marking everything as tables
        }
      }
      
      // Add all items from SHOW TABLES
      for (const row of userTablesResult.rows) {
        const tableName = row[0] as string;
        items.push({
          name: tableName,
          type: viewNames.has(tableName) ? 'view' : 'table',
          isSystem: false
        });
      }
      
      // If including system tables, add them
      if (includeSystem) {
        // DuckDB system table functions - these are functions that return tables
        const systemTableFunctions = [
          { name: 'duckdb_columns()', display: 'duckdb_columns' },
          { name: 'duckdb_constraints()', display: 'duckdb_constraints' },
          { name: 'duckdb_databases()', display: 'duckdb_databases' },
          { name: 'duckdb_functions()', display: 'duckdb_functions' },
          { name: 'duckdb_indexes()', display: 'duckdb_indexes' },
          { name: 'duckdb_schemas()', display: 'duckdb_schemas' },
          { name: 'duckdb_sequences()', display: 'duckdb_sequences' },
          { name: 'duckdb_tables()', display: 'duckdb_tables' },
          { name: 'duckdb_types()', display: 'duckdb_types' },
          { name: 'duckdb_views()', display: 'duckdb_views' },
        ];
        
        // Add these as accessible system "tables" (they're actually table functions)
        for (const { display } of systemTableFunctions) {
          items.push({
            name: display,
            type: 'table',
            isSystem: true
          });
        }
        
        // Also add some actual tables that might exist
        const actualSystemTables = [
          'information_schema.columns',
          'information_schema.tables', 
          'information_schema.views',
          'information_schema.schemata'
        ];
        
        for (const tableName of actualSystemTables) {
          try {
            await this.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
            items.push({
              name: tableName,
              type: tableName.includes('view') ? 'view' : 'table',
              isSystem: true
            });
          } catch {
            // Skip if not accessible
          }
        }
      }
      
      return items;
    } catch (error) {
      console.error('Failed to get tables/views:', error);
      return [];
    }
  }


  async exportTableAsSQL(tableName: string): Promise<string> {
    try {
      // Check if it's a view first
      const viewCheck = await this.query(`SELECT sql FROM duckdb_views() WHERE view_name = '${tableName}'`);
      if (viewCheck.rows.length > 0) {
        // The SQL from duckdb_views() already includes the CREATE VIEW statement
        return viewCheck.rows[0][0] as string;
      }

      // For tables, export as CREATE TABLE with data
      const schema = await this.getTableInfo(tableName);
      const data = await this.query(`SELECT * FROM ${tableName}`);

      // Build CREATE TABLE statement
      const columns = schema.rows.map(row => `${row[0]} ${row[1]}`).join(', ');
      let sql = `CREATE TABLE ${tableName} (${columns});\n\n`;

      // Add bulk INSERT statement
      if (data.rows.length > 0) {
        const columnNames = data.columns.join(', ');
        sql += `INSERT INTO ${tableName} (${columnNames}) VALUES\n`;
        
        const valueRows = data.rows.map((row) => {
          const values = row.map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return String(val);
          }).join(', ');
          return `  (${values})`;
        });
        
        sql += valueRows.join(',\n') + ';\n';
      }

      return sql;
    } catch (error) {
      throw new Error(`Failed to export ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTableInfo(tableName: string): Promise<QueryResult> {
    return await this.query(`DESCRIBE ${tableName}`);
  }

  async dropTable(tableName: string): Promise<void> {
    await this.query(`DROP TABLE IF EXISTS ${tableName}`);
  }

  async executeSQLScript(sql: string): Promise<void> {
    if (!this.conn) {
      await this.initialize();
    }

    // For CREATE VIEW statements, execute as a single statement
    if (sql.trim().toUpperCase().startsWith('CREATE VIEW') || sql.trim().toUpperCase().startsWith('CREATE OR REPLACE VIEW')) {
      try {
        await this.query(sql);
        return;
      } catch (error) {
        console.error('Failed to create view:', error);
        throw error;
      }
    }

    // Split SQL script into individual statements for tables
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        await this.query(statement);
      } catch (error) {
        console.warn(`Failed to execute statement: ${statement}`, error);
        // Continue with other statements even if one fails
      }
    }
  }

  async exportTableAsCSV(tableName: string, delimiter: string = ','): Promise<string> {
    try {
      const result = await this.query(`SELECT * FROM ${tableName}`);
      if (result.rows.length === 0) {
        return result.columns.join(delimiter) + '\n';
      }
      
      // Create CSV header
      let csv = result.columns.join(delimiter) + '\n';
      
      // Add rows
      for (const row of result.rows) {
        const csvRow = row.map(val => {
          if (val === null) return '';
          const strVal = String(val);
          // Quote fields containing delimiter, quotes, or newlines
          if (strVal.includes(delimiter) || strVal.includes('"') || strVal.includes('\n')) {
            return `"${strVal.replace(/"/g, '""')}"`;
          }
          return strVal;
        }).join(delimiter);
        csv += csvRow + '\n';
      }
      
      return csv;
    } catch (error) {
      throw new Error(`Failed to export ${tableName} as CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async exportTableAsParquet(tableName: string): Promise<ArrayBuffer> {
    try {
      if (!this.db) {
        await this.initialize();
      }

      const fileName = `${tableName}_${Date.now()}.parquet`;
      await this.query(`COPY (SELECT * FROM ${tableName}) TO '${fileName}' (FORMAT 'parquet')`);
      const buffer = this.db!.copyFileToBuffer(fileName);
      this.db!.dropFile(fileName);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } catch (error) {
      throw new Error(`Failed to export ${tableName} as Parquet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async exportTableAsXLSX(tableName: string): Promise<{ columns: string[], rows: unknown[][] }> {
    try {
      const result = await this.query(`SELECT * FROM ${tableName}`);
      return {
        columns: result.columns,
        rows: result.rows
      };
    } catch (error) {
      throw new Error(`Failed to export ${tableName} for XLSX: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async exportTableAsXLSXBuffer(tableName: string, sheetName: string): Promise<ArrayBuffer> {
    const { columns, rows } = await this.exportTableAsXLSX(tableName);
    const { utils, write } = await import('xlsx');
    const data = [columns, ...rows];
    const worksheet = utils.aoa_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, sheetName);
    return write(workbook, { type: 'array', bookType: 'xlsx' });
  }

  async close(): Promise<void> {
    if (this.conn) {
      await this.conn.close();
      this.conn = null;
    }
    if (this.db) {
      await this.db.terminate();
      this.db = null;
    }
    this.initPromise = null;
  }
}

export const duckdbService = new DuckDBService();
