// Developer logging system that captures console output

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: any[];
}

class DevLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();
  private originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  constructor() {
    this.interceptConsole();
  }

  private interceptConsole() {
    // Intercept console methods
    console.log = (...args) => {
      this.addLog('log', args);
      this.originalConsole.log(...args);
    };

    console.info = (...args) => {
      this.addLog('info', args);
      this.originalConsole.info(...args);
    };

    console.warn = (...args) => {
      this.addLog('warn', args);
      this.originalConsole.warn(...args);
    };

    console.error = (...args) => {
      this.addLog('error', args);
      this.originalConsole.error(...args);
    };

    console.debug = (...args) => {
      this.addLog('debug', args);
      this.originalConsole.debug(...args);
    };
  }

  private addLog(level: LogEntry['level'], args: any[]) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message: this.formatMessage(args),
      details: args.length > 1 ? args.slice(1) : undefined,
    };

    this.logs.unshift(entry); // Add to beginning
    
    // Keep only maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.notifyListeners();
  }

  private formatMessage(args: any[]): string {
    if (args.length === 0) return '';
    
    const first = args[0];
    if (typeof first === 'string') {
      return first;
    } else if (first instanceof Error) {
      return `${first.name}: ${first.message}`;
    } else {
      try {
        return JSON.stringify(first, null, 2);
      } catch {
        return String(first);
      }
    }
  }

  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.logs); // Send current logs
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.logs));
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }

  exportLogs(): string {
    return this.logs
      .map(log => {
        const time = log.timestamp.toISOString();
        const details = log.details ? ' ' + JSON.stringify(log.details) : '';
        return `[${time}] [${log.level.toUpperCase()}] ${log.message}${details}`;
      })
      .join('\n');
  }
}

// Create singleton instance
export const devLogger = new DevLogger();

// Also export a manual log function for important dev messages
export function devLog(message: string, ...details: any[]) {
  console.log(`[DEV] ${message}`, ...details);
}