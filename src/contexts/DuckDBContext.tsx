/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { duckdbService } from '@/lib/duckdb';
import { savedTablesService } from '@/lib/savedTables';

interface DuckDBContextType {
  isInitialized: boolean;
  error: string | null;
}

const DuckDBContext = createContext<DuckDBContextType | undefined>(undefined);

export function DuckDBProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Initialize DuckDB first
        await duckdbService.initialize();
        
        // Then restore saved tables
        const result = await savedTablesService.restoreAllTables();
        if (result.restored > 0) {
          console.log(`Restored ${result.restored} saved tables/views`);
        }
        if (result.failed.length > 0) {
          console.warn(`Failed to restore: ${result.failed.join(', ')}`);
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize DuckDB:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
      }
    };

    initializeDatabase();

    return () => {
      duckdbService.close();
    };
  }, []);

  return (
    <DuckDBContext.Provider value={{ isInitialized, error }}>
      {children}
    </DuckDBContext.Provider>
  );
}

export function useDuckDB() {
  const context = useContext(DuckDBContext);
  if (context === undefined) {
    throw new Error('useDuckDB must be used within a DuckDBProvider');
  }
  return context;
}
