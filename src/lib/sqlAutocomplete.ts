import { duckdbService } from './duckdb';
import type { editor, languages, Position } from 'monaco-editor';

interface TableSchema {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
  }>;
  rowCount?: number;
}

export class SQLAutocompleteProvider implements languages.CompletionItemProvider {
  private schemaCache: Map<string, TableSchema> = new Map();
  private tableNames: string[] = [];
  
  async refreshSchema() {
    try {
      // Get all tables
      const tables = await duckdbService.getTablesAndViews();
      this.tableNames = tables.filter(t => !t.isSystem).map(t => t.name);
      
      // Clear old cache
      this.schemaCache.clear();
      
      // Cache schemas for each table
      const schemaPromises = this.tableNames.map(async (table) => {
        try {
          const info = await duckdbService.getTableInfo(table);
          
          // Get row count
          let rowCount: number | undefined = undefined;
          try {
            // Use proper escaping for table names
            const escapedTable = table.includes('.') ? table : `"${table}"`;
            const countResult = await duckdbService.query(`SELECT COUNT(*) FROM ${escapedTable}`);
            rowCount = countResult.rows[0]?.[0] as number || 0;
          } catch {
            // Try without quotes as fallback
            try {
              const countResult = await duckdbService.query(`SELECT COUNT(*) FROM ${table}`);
              rowCount = countResult.rows[0]?.[0] as number || 0;
            } catch {
              // Give up on row count
            }
          }
          
          // Store with lowercase key for case-insensitive lookup
          this.schemaCache.set(table.toLowerCase(), {
            tableName: table,
            columns: info.rows.map(row => ({
              name: row[0] as string,
              type: row[1] as string,
            })),
            rowCount
          });
        } catch (error) {
          console.error(`Failed to load schema for table ${table}:`, error);
        }
      });
      
      // Wait for all schemas to load
      await Promise.all(schemaPromises);
      // console.log(`Loaded schemas for ${this.schemaCache.size} tables`);
    } catch (error) {
      console.error('Failed to refresh schema for autocomplete:', error);
    }
  }

  async provideCompletionItems(
    model: editor.ITextModel,
    position: Position
  ): Promise<languages.CompletionList> {
    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    };

    const suggestions: languages.CompletionItem[] = [];

    // Determine context - look for the last SQL keyword before cursor
    const textBeforeCursor = textUntilPosition.slice(-200); // Look at last 200 chars for context
    
    // Check what keyword we're after
    let sqlContext: string | null = null;
    
    // Check if we're right after a keyword (with more flexible spacing)
    if (/\b(FROM|JOIN|INTO|UPDATE)\s*$/i.test(textBeforeCursor)) {
      sqlContext = 'table';
    } else if (/\b(SELECT|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING)\s*$/i.test(textBeforeCursor)) {
      sqlContext = 'column';
    } else if (/\bSELECT\s+.*,\s*$/i.test(textBeforeCursor)) {
      // After a comma in SELECT
      sqlContext = 'column';
    } else if (/\bSELECT\s+\w*$/i.test(textBeforeCursor)) {
      // Typing after SELECT with partial word
      sqlContext = 'column';
    }
    
    // If triggered manually (Ctrl+Space), try to detect context more broadly
    if (sqlContext === null && word.word === '') {
      // Get current statement
      const lastSemicolon = textUntilPosition.lastIndexOf(';');
      const currentStatement = lastSemicolon >= 0 
        ? textUntilPosition.substring(lastSemicolon + 1)
        : textUntilPosition;
      
      // Check if there's a FROM clause in the current statement
      if (currentStatement.match(/FROM\s+\w+/i)) {
        // Default to column suggestions if we have a table
        sqlContext = 'column';
      } else {
        // Otherwise suggest tables
        sqlContext = 'table';
      }
    }
    
    console.log('Autocomplete context:', { 
      sqlContext, 
      word: word.word,
      textBeforeCursor: textBeforeCursor.slice(-50),
      schemaSize: this.schemaCache.size,
      tableCount: this.tableNames.length
    });
    
    if (sqlContext === 'table') {
      // Suggest tables
      for (const tableName of this.tableNames) {
        const schema = this.schemaCache.get(tableName.toLowerCase());
        const rowCount = schema?.rowCount;
        const rowInfo = rowCount !== undefined ? ` (${rowCount.toLocaleString()} rows)` : '';
        
        suggestions.push({
          label: tableName,
          kind: 2, // Class
          insertText: tableName,
          range,
          detail: `Table${rowInfo}`,
          documentation: `Table: ${tableName}${rowInfo}\n${schema?.columns.length || 0} columns`
        });
      }
    } else if (sqlContext === 'column') {
      // Get the full text and cursor position
      const fullText = model.getValue();
      const offset = model.getOffsetAt(position);
      
      // Find statement boundaries
      let statementStart = 0;
      let statementEnd = fullText.length;
      
      // Find the last semicolon before cursor
      for (let i = offset - 1; i >= 0; i--) {
        if (fullText[i] === ';') {
          statementStart = i + 1;
          break;
        }
      }
      
      // Find the first semicolon after cursor (or end of text)
      for (let i = offset; i < fullText.length; i++) {
        if (fullText[i] === ';') {
          statementEnd = i;
          break;
        }
      }
      
      // Get the COMPLETE current statement (before and after cursor)
      const currentStatement = fullText.substring(statementStart, statementEnd);
      
      console.log('Column suggestions - Complete statement:', currentStatement.trim().substring(0, 200));
      
      // Look for FROM clause anywhere in the current statement, but not in comments
      // Remove comments first, then find FROM clause
      const statementWithoutComments = currentStatement.replace(/--.*$/gm, '');
      console.log('Statement without comments:', statementWithoutComments.trim());
      
      // Updated regex to handle table names with numbers, underscores, and special chars
      const fromMatch = statementWithoutComments.match(/FROM\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/i);
      console.log('FROM regex match:', fromMatch);
      
      if (fromMatch) {
        const tableName = fromMatch[1];
        const schema = this.schemaCache.get(tableName.toLowerCase());
        console.log('Found table:', tableName, 'Schema exists:', !!schema, 'Columns:', schema?.columns?.length);
        
        if (schema && schema.columns) {
          for (const column of schema.columns) {
            suggestions.push({
              label: column.name,
              kind: 3, // Field
              insertText: column.name,
              range,
              detail: column.type,
              documentation: `Column: ${column.name} (${column.type})`
            });
          }
        }
      } else {
        console.log('No FROM clause found in complete statement');
      }
      
      // Also suggest common aggregates for SELECT
      if (/SELECT\s+$/i.test(textBeforeCursor)) {
        suggestions.push(
          {
            label: 'COUNT(*)',
            kind: 1, // Function
            insertText: 'COUNT(*)',
            range,
            detail: 'Aggregate function',
            documentation: 'Count all rows'
          },
          {
            label: '*',
            kind: 12, // Value
            insertText: '*',
            range,
            detail: 'All columns',
            documentation: 'Select all columns'
          }
        );
      }
    }
    
    // Always suggest SQL keywords if nothing else matches
    if (suggestions.length === 0) {
      const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 
                       'INNER JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 
                       'OFFSET', 'UNION', 'INSERT INTO', 'UPDATE', 'DELETE FROM', 
                       'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'AS'];
      
      for (const keyword of keywords) {
        if (keyword.toLowerCase().startsWith(word.word.toLowerCase())) {
          suggestions.push({
            label: keyword,
            kind: 14, // Keyword
            insertText: keyword,
            range,
            detail: 'SQL Keyword'
          });
        }
      }
    }

    return { suggestions };
  }

  // Get quick info on hover
  async provideHover(
    model: editor.ITextModel,
    position: Position
  ): Promise<languages.Hover | null> {
    const word = model.getWordAtPosition(position);
    if (!word) return null;

    const wordText = word.word;
    
    // Check if it's a table name (case-insensitive)
    const matchedTable = this.tableNames.find(t => t.toLowerCase() === wordText.toLowerCase());
    if (matchedTable) {
      const schema = this.schemaCache.get(matchedTable.toLowerCase());
      if (schema) {
        const columnList = schema.columns
          .map(c => `- ${c.name} (${c.type})`)
          .join('\n');
        
        const rowInfo = schema.rowCount !== undefined ? ` (${schema.rowCount.toLocaleString()} rows)` : '';
        return {
          contents: [
            { value: `**Table: ${matchedTable}**${rowInfo}` },
            { value: `Columns:\n${columnList}` }
          ],
          range: {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn
          }
        };
      }
    }

    return null;
  }
}