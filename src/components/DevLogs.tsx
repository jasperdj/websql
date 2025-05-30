import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal, Download, Trash2, Bug } from 'lucide-react';
import { devLogger, type LogEntry } from '@/lib/devLogger';
import { cn } from '@/utils/cn';

export function DevLogs() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogEntry['level'] | 'all'>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = devLogger.subscribe(setLogs);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Keyboard shortcut: Ctrl+Shift+L
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const exportLogs = () => {
    const content = devLogger.exportLogs();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `websql-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      case 'debug': return 'text-gray-500';
      default: return 'text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 p-3 rounded-full shadow-lg z-40",
          "bg-gray-800 dark:bg-gray-700 text-white",
          "hover:bg-gray-700 dark:hover:bg-gray-600",
          "transition-all duration-200",
          isOpen && "hidden"
        )}
        title="Developer Logs (Ctrl+Shift+L)"
      >
        <Bug className="h-5 w-5" />
      </button>

      {/* Logs panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
          <div className={cn(
            "w-full max-w-2xl h-[600px] max-h-[80vh]",
            "bg-white dark:bg-gray-800 rounded-lg shadow-2xl",
            "flex flex-col pointer-events-auto",
            "border border-gray-200 dark:border-gray-700"
          )}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Developer Logs</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (Ctrl+Shift+L)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportLogs}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Export logs"
                >
                  <Download className="h-4 w-4 text-gray-500" />
                </button>
                <button
                  onClick={() => devLogger.clear()}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Clear logs"
                >
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {(['all', 'log', 'info', 'warn', 'error', 'debug'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setFilter(level)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium transition-colors",
                    filter === level
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  {level === 'all' ? 'All' : level.toUpperCase()}
                  {level !== 'all' && (
                    <span className="ml-1 text-gray-500">
                      ({logs.filter(l => l.level === level).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No logs to display
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLogs.map(log => (
                    <div
                      key={log.id}
                      className="p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex gap-2">
                        <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span className={cn("font-semibold uppercase", getLevelColor(log.level))}>
                          [{log.level}]
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 break-all flex-1">
                          {log.message}
                        </span>
                      </div>
                      {log.details && (
                        <details className="mt-1 ml-20">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs">
                            Details ({log.details.length} items)
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto whitespace-pre-wrap break-words">
{JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}