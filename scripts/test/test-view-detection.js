#!/usr/bin/env node

import * as duckdb from '@duckdb/duckdb-wasm';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testViewDetection() {
  console.log('=== DuckDB View Detection Test ===\n');

  try {
    // Initialize DuckDB
    console.log('1. Initializing DuckDB...');
    const MANUAL_BUNDLES = {
      mvp: {
        mainModule: path.resolve(__dirname, '../node_modules/@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm'),
        mainWorker: path.resolve(__dirname, '../node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js'),
      },
      eh: {
        mainModule: path.resolve(__dirname, '../node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm'),
        mainWorker: path.resolve(__dirname, '../node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js'),
      },
    };

    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    const worker = new Worker(bundle.mainWorker);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule);

    const conn = await db.connect();
    console.log('✓ DuckDB initialized\n');

    // Create test table
    console.log('2. Creating test table...');
    await conn.query(`
      CREATE TABLE test_table (
        id INTEGER,
        name VARCHAR,
        value DECIMAL(10,2)
      )
    `);
    
    // Insert sample data
    await conn.query(`
      INSERT INTO test_table VALUES 
        (1, 'Item A', 100.50),
        (2, 'Item B', 200.75),
        (3, 'Item C', 300.00)
    `);
    console.log('✓ Test table created with sample data\n');

    // Create test view
    console.log('3. Creating test view...');
    await conn.query(`
      CREATE VIEW test_view AS
      SELECT id, name, value * 1.1 as adjusted_value
      FROM test_table
      WHERE value > 100
    `);
    console.log('✓ Test view created\n');

    // Test 1: duckdb_views()
    console.log('4. Testing duckdb_views() function...');
    try {
      const viewsResult = await conn.query('SELECT * FROM duckdb_views()');
      const views = viewsResult.toArray();
      console.log(`   Found ${views.length} views:`);
      views.forEach(view => {
        console.log(`   - ${JSON.stringify(view)}`);
      });
    } catch (error) {
      console.log(`   ERROR: ${error.message}`);
    }
    console.log();

    // Test 2: information_schema.views
    console.log('5. Testing information_schema.views...');
    try {
      const schemaResult = await conn.query(`
        SELECT table_catalog, table_schema, table_name, view_definition
        FROM information_schema.views
      `);
      const schemaViews = schemaResult.toArray();
      console.log(`   Found ${schemaViews.length} views:`);
      schemaViews.forEach(view => {
        console.log(`   - ${JSON.stringify(view)}`);
      });
    } catch (error) {
      console.log(`   ERROR: ${error.message}`);
    }
    console.log();

    // Test 3: SHOW TABLES
    console.log('6. Testing SHOW TABLES...');
    try {
      const tablesResult = await conn.query('SHOW TABLES');
      const tables = tablesResult.toArray();
      console.log(`   Found ${tables.length} objects:`);
      tables.forEach(table => {
        console.log(`   - ${JSON.stringify(table)}`);
      });
    } catch (error) {
      console.log(`   ERROR: ${error.message}`);
    }
    console.log();

    // Test 4: duckdb_tables() vs duckdb_views()
    console.log('7. Comparing duckdb_tables() and duckdb_views()...');
    try {
      const tablesResult = await conn.query('SELECT * FROM duckdb_tables()');
      const tables = tablesResult.toArray();
      console.log(`   duckdb_tables() found ${tables.length} tables:`);
      tables.forEach(table => {
        console.log(`   - ${JSON.stringify(table)}`);
      });

      console.log('\n   Trying duckdb_views() again:');
      const viewsResult = await conn.query('SELECT * FROM duckdb_views()');
      const views = viewsResult.toArray();
      console.log(`   duckdb_views() found ${views.length} views`);
    } catch (error) {
      console.log(`   ERROR: ${error.message}`);
    }
    console.log();

    // Test 5: Query the view to ensure it works
    console.log('8. Querying the view to verify it works...');
    try {
      const viewDataResult = await conn.query('SELECT * FROM test_view');
      const viewData = viewDataResult.toArray();
      console.log(`   View returned ${viewData.length} rows:`);
      viewData.forEach(row => {
        console.log(`   - ${JSON.stringify(row)}`);
      });
    } catch (error) {
      console.log(`   ERROR: ${error.message}`);
    }
    console.log();

    // Test 6: Alternative view detection methods
    console.log('9. Testing alternative view detection methods...');
    
    // Try PRAGMA show_tables
    console.log('   a) PRAGMA show_tables:');
    try {
      const pragmaResult = await conn.query('PRAGMA show_tables');
      const pragmaTables = pragmaResult.toArray();
      console.log(`      Found ${pragmaTables.length} objects:`);
      pragmaTables.forEach(obj => {
        console.log(`      - ${JSON.stringify(obj)}`);
      });
    } catch (error) {
      console.log(`      ERROR: ${error.message}`);
    }

    // Try querying system catalogs directly
    console.log('\n   b) Querying duckdb_views directly:');
    try {
      const directResult = await conn.query(`
        SELECT database_name, schema_name, view_name, sql 
        FROM duckdb_views
      `);
      const directViews = directResult.toArray();
      console.log(`      Found ${directViews.length} views:`);
      directViews.forEach(view => {
        console.log(`      - ${JSON.stringify(view)}`);
      });
    } catch (error) {
      console.log(`      ERROR: ${error.message}`);
    }

    // Test 7: Create view in specific schema
    console.log('\n10. Testing view creation in main schema...');
    try {
      await conn.query(`
        CREATE VIEW main.test_view2 AS
        SELECT COUNT(*) as total_count FROM test_table
      `);
      console.log('    ✓ Created view in main schema');
      
      const viewsResult = await conn.query('SELECT * FROM duckdb_views()');
      const views = viewsResult.toArray();
      console.log(`    Found ${views.length} views after creating second view`);
    } catch (error) {
      console.log(`    ERROR: ${error.message}`);
    }

    // Cleanup
    await conn.close();
    await db.terminate();
    await worker.terminate();

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the test
testViewDetection().catch(console.error);