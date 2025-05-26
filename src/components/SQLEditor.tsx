import { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2, Bookmark, BookmarkCheck } from 'lucide-react';
import { duckdbService } from '@/lib/duckdb';
import type { QueryResult } from '@/lib/duckdb';
import { savedQueriesService } from '@/lib/savedQueries';
import { SQLAutocompleteProvider } from '@/lib/sqlAutocomplete';

interface SQLEditorProps {
  query: string;
  onChange: (query: string) => void;
  onQueryResult?: (result: QueryResult) => void;
  tabTitle: string;
  savedQueryId?: string;
  onSaveQuery?: (savedQueryId: string) => void;
  refreshTrigger?: number;
}

export function SQLEditor({ query, onChange, onQueryResult, tabTitle, savedQueryId, onSaveQuery, refreshTrigger }: SQLEditorProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autocompleteProviderRef = useRef<SQLAutocompleteProvider | null>(null);
  const monacoRef = useRef<any>(null);

  const executeQuery = useCallback(async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    setError(null);

    try {
      const result = await duckdbService.query(query);
      
      if (result.error) {
        setError(result.error);
      } else {
        onQueryResult?.(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setIsExecuting(false);
    }
  }, [query, onQueryResult]);

  const saveQuery = useCallback(async () => {
    if (!query.trim() || !tabTitle.trim()) return;

    setIsSaving(true);
    try {
      if (savedQueryId) {
        // Update existing saved query
        savedQueriesService.update(savedQueryId, { query });
      } else {
        // Create new saved query
        const savedQuery = savedQueriesService.save(tabTitle, query);
        onSaveQuery?.(savedQuery.id);
      }
    } catch (err) {
      console.error('Failed to save query:', err);
    } finally {
      setIsSaving(false);
    }
  }, [query, tabTitle, savedQueryId, onSaveQuery]);

  const isSaved = Boolean(savedQueryId);

  // Initialize autocomplete provider
  useEffect(() => {
    const initAutocomplete = async () => {
      if (!autocompleteProviderRef.current) {
        autocompleteProviderRef.current = new SQLAutocompleteProvider();
        await autocompleteProviderRef.current.refreshSchema();
      }
    };
    initAutocomplete();
  }, []);

  // Refresh schema when component receives focus or tables might have changed
  useEffect(() => {
    const handleFocus = () => {
      autocompleteProviderRef.current?.refreshSchema();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Refresh schema when tables change
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && autocompleteProviderRef.current) {
      autocompleteProviderRef.current.refreshSchema();
    }
  }, [refreshTrigger]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={saveQuery}
            disabled={isSaving || !query.trim() || !tabTitle.trim()}
            className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md transition-colors ${
              isSaved
                ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-600 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Saving...
              </>
            ) : isSaved ? (
              <>
                <BookmarkCheck className="-ml-1 mr-2 h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="-ml-1 mr-2 h-4 w-4" />
                Save Query
              </>
            )}
          </button>
          
          <button
            onClick={executeQuery}
            disabled={isExecuting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Executing...
              </>
            ) : (
              <>
                <Play className="-ml-1 mr-2 h-4 w-4" />
                Run Query (Ctrl+Enter)
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0" style={{ minHeight: '200px' }}>
        <Editor
          height="100%"
          loading={<div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 dark:bg-gray-900">Loading editor...</div>}
          defaultLanguage="sql"
          value={query}
          onChange={(value) => onChange(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
          onMount={async (editor, monaco) => {
            monacoRef.current = monaco;
            
            // Add keyboard shortcut for running query
            editor.addAction({
              id: 'run-query',
              label: 'Run Query',
              keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
              ],
              run: () => executeQuery()
            });

            // Ensure autocomplete provider is ready
            if (!autocompleteProviderRef.current) {
              autocompleteProviderRef.current = new SQLAutocompleteProvider();
              await autocompleteProviderRef.current.refreshSchema();
            }

            // Register SQL autocomplete provider
            monaco.languages.registerCompletionItemProvider('sql', autocompleteProviderRef.current);
            monaco.languages.registerHoverProvider('sql', autocompleteProviderRef.current);
            
            // Configure SQL language defaults
            monaco.languages.setLanguageConfiguration('sql', {
              wordPattern: /[a-zA-Z_]\w*/,
            });
          }}
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}
    </div>
  );
}