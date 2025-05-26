import React, { useState, useEffect } from 'react';
import { savedQueriesService, type SavedQuery } from '@/lib/savedQueries';
import { FileText, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface SavedQueriesProps {
  onLoadQuery: (savedQuery: SavedQuery) => void;
}

export function SavedQueries({ onLoadQuery }: SavedQueriesProps) {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const loadQueries = () => {
      setSavedQueries(savedQueriesService.getAll());
    };

    // Load initial queries
    loadQueries();

    // Subscribe to changes
    const unsubscribe = savedQueriesService.subscribe(loadQueries);

    return unsubscribe;
  }, []);

  const handleDelete = (e: React.MouseEvent, queryId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this saved query?')) {
      savedQueriesService.delete(queryId);
    }
  };

  const getQueryPreview = (query: string) => {
    return query.trim().split('\n')[0].substring(0, 50) + (query.length > 50 ? '...' : '');
  };

  if (savedQueries.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Saved Queries
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          No saved queries yet
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-white mb-2 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <span>Saved Queries ({savedQueries.length})</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-1">
          {savedQueries.map((query) => (
            <div
              key={query.id}
              onClick={() => onLoadQuery(query)}
              className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              title={getQueryPreview(query.query)}
            >
              <div className="flex items-center min-w-0 flex-1">
                <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mr-2" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {query.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {getQueryPreview(query.query)}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(e, query.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                title="Delete query"
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}