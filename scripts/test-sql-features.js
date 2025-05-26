// Since we can't import TypeScript directly, let's test via the running application
console.log('Testing DuckDB SQL Features...\n');
console.log('To test HAVING and WITH clauses in the WebSQL application:');
console.log('\n1. Start the application with: npm run dev');
console.log('2. Import some sample data (CSV or create tables)');
console.log('\n3. Test WITH clause (CTE):');
console.log(`
WITH category_totals AS (
  SELECT 
    category,
    COUNT(*) as product_count,
    SUM(amount) as total_amount
  FROM your_table
  GROUP BY category
)
SELECT * FROM category_totals
WHERE total_amount > 1000;
`);

console.log('\n4. Test HAVING clause:');
console.log(`
SELECT 
  category,
  COUNT(*) as count,
  AVG(price) as avg_price
FROM your_table
GROUP BY category
HAVING COUNT(*) > 5
  AND AVG(price) > 100;
`);

console.log('\n5. Test Recursive CTE:');
console.log(`
WITH RECURSIVE numbers(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 10
)
SELECT * FROM numbers;
`);

console.log('\n6. Test Multiple CTEs:');
console.log(`
WITH 
high_value AS (
  SELECT * FROM products WHERE price > 100
),
low_stock AS (
  SELECT * FROM products WHERE quantity < 10
)
SELECT * FROM high_value
INTERSECT
SELECT * FROM low_stock;
`);

async function testSQLFeatures() {
    
    // Create test data
    console.log('Creating test data...');
    await duckdbService.query(`
      CREATE TABLE test_sales (
        product VARCHAR,
        category VARCHAR,
        quantity INTEGER,
        price DECIMAL(10,2)
      )
    `);
    
    await duckdbService.query(`
      INSERT INTO test_sales VALUES
      ('Laptop', 'Electronics', 5, 999.99),
      ('Mouse', 'Electronics', 20, 29.99),
      ('Desk', 'Furniture', 3, 299.99),
      ('Chair', 'Furniture', 8, 199.99),
      ('Monitor', 'Electronics', 7, 399.99),
      ('Keyboard', 'Electronics', 15, 79.99)
    `);
    
    // Test WITH clause (CTE)
    console.log('\n1. Testing WITH clause (Common Table Expression):');
    const withResult = await duckdbService.query(`
      WITH category_totals AS (
        SELECT 
          category,
          SUM(quantity * price) as total_value
        FROM test_sales
        GROUP BY category
      )
      SELECT * FROM category_totals
      ORDER BY total_value DESC
    `);
    
    if (withResult.error) {
      console.log('❌ WITH clause failed:', withResult.error);
    } else {
      console.log('✅ WITH clause supported!');
      console.log('Results:', withResult.rows);
    }
    
    // Test HAVING clause
    console.log('\n2. Testing HAVING clause:');
    const havingResult = await duckdbService.query(`
      SELECT 
        category,
        COUNT(*) as product_count,
        SUM(quantity) as total_quantity
      FROM test_sales
      GROUP BY category
      HAVING SUM(quantity) > 10
    `);
    
    if (havingResult.error) {
      console.log('❌ HAVING clause failed:', havingResult.error);
    } else {
      console.log('✅ HAVING clause supported!');
      console.log('Results:', havingResult.rows);
    }
    
    // Test recursive CTE
    console.log('\n3. Testing Recursive WITH clause:');
    const recursiveResult = await duckdbService.query(`
      WITH RECURSIVE numbers(n) AS (
        SELECT 1
        UNION ALL
        SELECT n + 1 FROM numbers WHERE n < 5
      )
      SELECT * FROM numbers
    `);
    
    if (recursiveResult.error) {
      console.log('❌ Recursive WITH failed:', recursiveResult.error);
    } else {
      console.log('✅ Recursive WITH supported!');
      console.log('Results:', recursiveResult.rows);
    }
    
    // Test multiple CTEs
    console.log('\n4. Testing Multiple CTEs:');
    const multipleCTEResult = await duckdbService.query(`
      WITH 
      electronics AS (
        SELECT * FROM test_sales WHERE category = 'Electronics'
      ),
      furniture AS (
        SELECT * FROM test_sales WHERE category = 'Furniture'
      )
      SELECT 
        'Electronics' as category, COUNT(*) as count FROM electronics
      UNION ALL
      SELECT 
        'Furniture' as category, COUNT(*) as count FROM furniture
    `);
    
    if (multipleCTEResult.error) {
      console.log('❌ Multiple CTEs failed:', multipleCTEResult.error);
    } else {
      console.log('✅ Multiple CTEs supported!');
      console.log('Results:', multipleCTEResult.rows);
    }
    
    // Clean up
    await duckdbService.query('DROP TABLE test_sales');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await duckdbService.close();
  }
}

testSQLFeatures();