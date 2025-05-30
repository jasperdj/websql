import { useState, useCallback, useEffect } from 'react';
import { DuckDBProvider, useDuckDB } from '@/contexts/DuckDBContext';
import { FileImport } from '@/components/FileImport';
import { SQLEditor } from '@/components/SQLEditor';
import { TableViewer } from '@/components/TableViewer';
import { TableList } from '@/components/TableList';
import { TabManager } from '@/components/TabManager';
import { SavedQueries } from '@/components/SavedQueries';
import { UpdateChecker } from '@/components/UpdateChecker';
import { DownloadLinks } from '@/components/DownloadLinks';
import { DataSourceModal } from '@/components/DataSourceModal';
import { DataSourceList } from '@/components/DataSourceList';
import { DevLogs } from '@/components/DevLogs';
import type { QueryResult } from '@/lib/duckdb';
import type { Tab } from '@/types/tabs';
import type { FileNode, DataSource } from '@/types/dataSource';
import { duckdbService } from '@/lib/duckdb';
import { dataSourceManager } from '@/lib/dataSourceManager';
import { savedQueriesService, type SavedQuery } from '@/lib/savedQueries';
import { devLogger, devLog } from '@/lib/devLogger';
import { getShortVersionString } from '@/lib/version';
import { Database, Loader2 } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

function AppContent() {
  const { isInitialized, error } = useDuckDB();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize dev logger
  useEffect(() => {
    devLog('WebSQL App initialized', { 
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: window.location.href
    });
  }, []);
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: '1',
      title: 'Query 1',
      query: '-- Write your SQL query here\n-- Import some files first, then try:\n-- SELECT * FROM raw_tablename',
      isDirty: false,
      isActive: true,
      createdAt: Date.now(),
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [queryResults, setQueryResults] = useState<Record<string, QueryResult | null>>({});

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const handleTabSelect = useCallback((tabId: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => ({
        ...tab,
        isActive: tab.id === tabId,
      }))
    );
    setActiveTabId(tabId);
  }, []);

  const handleTabClose = useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const newTabs = prevTabs.filter((tab) => tab.id !== tabId);
      
      // If closing the active tab, activate another one
      if (tabId === activeTabId && newTabs.length > 0) {
        const newActiveTab = newTabs[newTabs.length - 1];
        newActiveTab.isActive = true;
        setActiveTabId(newActiveTab.id);
      }
      
      return newTabs;
    });
    
    // Clean up query results for closed tab
    setQueryResults((prev) => {
      const newResults = { ...prev };
      delete newResults[tabId];
      return newResults;
    });
  }, [activeTabId]);

  const handleNewTab = useCallback(() => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: `Query ${tabs.length + 1}`,
      query: '-- New query\n',
      isDirty: false,
      isActive: true,
      createdAt: Date.now(),
    };
    
    setTabs((prevTabs) => [
      ...prevTabs.map((tab) => ({ ...tab, isActive: false })),
      newTab,
    ]);
    setActiveTabId(newTab.id);
  }, [tabs.length]);

  const handleTabRename = useCallback((tabId: string, newTitle: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id === tabId) {
          // If this is a saved query, update the saved query name too
          if (tab.savedQueryId) {
            savedQueriesService.update(tab.savedQueryId, { name: newTitle });
          }
          return { ...tab, title: newTitle };
        }
        return tab;
      })
    );
  }, []);

  const handleQueryChange = useCallback((query: string) => {
    if (!activeTab) return;
    
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, query, isDirty: true }
          : tab
      )
    );

    // Auto-save if this is a saved query
    if (activeTab.savedQueryId) {
      // Debounce the save operation
      const timeoutId = setTimeout(() => {
        savedQueriesService.update(activeTab.savedQueryId!, { query });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, activeTabId]);

  const handleQueryResult = useCallback((result: QueryResult) => {
    if (!activeTab) return;
    
    setQueryResults((prev) => ({
      ...prev,
      [activeTabId]: result,
    }));
    
    // Mark tab as not dirty after successful execution
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, isDirty: false }
          : tab
      )
    );
  }, [activeTab, activeTabId]);

  const handleInspectTable = useCallback(async (tableName: string) => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: tableName,
      query: `-- Inspecting table: ${tableName}\nSELECT * FROM ${tableName} LIMIT 100;`,
      isDirty: false,
      isActive: true,
      createdAt: Date.now(),
    };
    
    setTabs((prevTabs) => [
      ...prevTabs.map((tab) => ({ ...tab, isActive: false })),
      newTab,
    ]);
    setActiveTabId(newTab.id);
    
    // Auto-execute the query
    try {
      const queryToExecute = `SELECT * FROM ${tableName} LIMIT 100`;
      const result = await duckdbService.query(queryToExecute);
      setQueryResults((prev) => ({
        ...prev,
        [newTab.id]: result,
      }));
    } catch (err) {
      console.error('Failed to execute inspect query:', err);
    }
  }, []);

  const handleImportComplete = useCallback(() => {
    // Trigger table list refresh
    setRefreshTrigger(Date.now());
  }, []);

  const handleEditDataSource = useCallback((dataSource: DataSource) => {
    setEditingDataSource(dataSource);
    setShowDataSourceModal(true);
  }, []);

  const handleFileOpen = useCallback(async (dataSourceId: string, file: FileNode) => {
    if (!file.path) return;
    
    const fileName = file.name;
    let newTab: Tab;
    
    if (file.fileType === 'columnar') {
      // Get the data source first to get shortName
      const dataSource = dataSourceManager.get(dataSourceId);
      if (!dataSource) {
        alert('Data source not found');
        return;
      }
      
      // Use shortName for table naming
      const tableName = `${dataSource.shortName}_${fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_')}`;
      
      try {

        // Read the file
        const fileBuffer = await dataSourceManager.readFile(dataSource, file.path);
        
        // Create a File object for the DuckDB import
        const blob = new Blob([fileBuffer]);
        const fileObj = new File([blob], fileName);
        
        // Import to DuckDB
        await duckdbService.importFile(fileObj, tableName);
        
        // Track this table as a data source table
        dataSourceManager.trackDataSourceTable(tableName, dataSourceId, file.path);
        
        newTab = {
          id: Date.now().toString(),
          title: `${fileName} (synced)`,
          query: `-- Synced from: ${file.path}\nSELECT * FROM ${tableName} LIMIT 100;`,
          isDirty: false,
          isActive: true,
          createdAt: Date.now(),
        };
      } catch (error) {
        console.error('Failed to import file:', error);
        return;
      }
    } else if (file.fileType === 'sql') {
      // For SQL files, open in editor with actual content
      try {
        const dataSource = dataSourceManager.get(dataSourceId);
        if (!dataSource) {
          throw new Error('Data source not found');
        }
        
        const content = await dataSourceManager.readTextFile(dataSource, file.path);
        
        newTab = {
          id: Date.now().toString(),
          title: fileName,
          query: `-- Loaded from: ${file.path}\n${content}`,
          isDirty: false,
          isActive: true,
          createdAt: Date.now(),
        };
      } catch (error) {
        console.error('Failed to read SQL file:', error);
        newTab = {
          id: Date.now().toString(),
          title: fileName,
          query: `-- Error loading from: ${file.path}\n-- ${error instanceof Error ? error.message : 'Unknown error'}`,
          isDirty: false,
          isActive: true,
          createdAt: Date.now(),
        };
      }
    } else if (file.fileType === 'text') {
      // For text files, open in editor with actual content
      try {
        const dataSource = dataSourceManager.get(dataSourceId);
        if (!dataSource) {
          throw new Error('Data source not found');
        }
        
        const content = await dataSourceManager.readTextFile(dataSource, file.path);
        
        newTab = {
          id: Date.now().toString(),
          title: fileName,
          query: `-- Viewing text file: ${file.path}\n/*\n${content}\n*/`,
          isDirty: false,
          isActive: true,
          createdAt: Date.now(),
        };
      } catch (error) {
        console.error('Failed to read text file:', error);
        newTab = {
          id: Date.now().toString(),
          title: fileName,
          query: `-- Error loading from: ${file.path}\n-- ${error instanceof Error ? error.message : 'Unknown error'}`,
          isDirty: false,
          isActive: true,
          createdAt: Date.now(),
        };
      }
    } else {
      // Unsupported file type
      alert(`Cannot open file type: ${file.fileType}`);
      return;
    }
    
    setTabs((prevTabs) => [
      ...prevTabs.map((tab) => ({ ...tab, isActive: false })),
      newTab,
    ]);
    setActiveTabId(newTab.id);
    
    // For columnar files, auto-execute the query
    if (file.fileType === 'columnar') {
      try {
        const dataSource = dataSourceManager.get(dataSourceId);
        if (!dataSource) return;
        
        const tableName = `${dataSource.shortName}_${fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const result = await duckdbService.query(`SELECT * FROM ${tableName} LIMIT 100`);
        setQueryResults((prev) => ({
          ...prev,
          [newTab.id]: result,
        }));
      } catch (err) {
        console.error('Failed to execute query:', err);
      }
    }
  }, []);

  const handleSaveQuery = useCallback((savedQueryId: string) => {
    if (!activeTab) return;
    
    // Update the active tab to reference the saved query
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, savedQueryId, isDirty: false }
          : tab
      )
    );
  }, [activeTab, activeTabId]);

  const handleLoadSavedQuery = useCallback((savedQuery: SavedQuery) => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: savedQuery.name,
      query: savedQuery.query,
      isDirty: false,
      isActive: true,
      createdAt: Date.now(),
      savedQueryId: savedQuery.id,
    };
    
    setTabs((prevTabs) => [
      ...prevTabs.map((tab) => ({ ...tab, isActive: false })),
      newTab,
    ]);
    setActiveTabId(newTab.id);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Database className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Database Initialization Failed
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Initializing Database...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            WebSQL
          </h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {getShortVersionString()}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={25} minSize={15} maxSize={40}>
            <div className="h-full bg-white dark:bg-gray-800 p-6 flex flex-col">
              <FileImport 
                onImportComplete={handleImportComplete} 
                onImportDataSource={() => setShowDataSourceModal(true)}
              />
              <div className="flex-1 overflow-y-auto">
                <DataSourceList 
                  onFileOpen={handleFileOpen} 
                  onEditDataSource={handleEditDataSource}
                />
                <TableList onInspectTable={handleInspectTable} refreshTrigger={refreshTrigger} />
                <SavedQueries onLoadQuery={handleLoadSavedQuery} />
              </div>
            </div>
          </Panel>
          
          <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 transition-colors" />
          
          <Panel defaultSize={75}>
            <div className="h-full flex flex-col">
              <TabManager
                tabs={tabs}
                activeTabId={activeTabId}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
                onNewTab={handleNewTab}
                onTabRename={handleTabRename}
              />
              
              {activeTab && (
                <PanelGroup direction="vertical" className="flex-1">
                  <Panel defaultSize={40} minSize={20}>
                    <div className="h-full bg-white dark:bg-gray-800">
                      <SQLEditor
                        query={activeTab.query}
                        onChange={handleQueryChange}
                        onQueryResult={handleQueryResult}
                        tabTitle={activeTab.title}
                        savedQueryId={activeTab.savedQueryId}
                        onSaveQuery={handleSaveQuery}
                        refreshTrigger={refreshTrigger}
                      />
                    </div>
                  </Panel>
                  
                  <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 transition-colors" />
                  
                  <Panel defaultSize={60}>
                    <div className="h-full">
                      <TableViewer 
                        result={queryResults[activeTabId] || null} 
                        query={activeTab?.query}
                      />
                    </div>
                  </Panel>
                </PanelGroup>
              )}
            </div>
          </Panel>
        </PanelGroup>
      </main>
      <UpdateChecker />
      <DownloadLinks />
      <DataSourceModal 
        isOpen={showDataSourceModal}
        onClose={() => {
          setShowDataSourceModal(false);
          setEditingDataSource(null);
        }}
        onDataSourceAdded={() => {
          setRefreshTrigger(prev => prev + 1);
          setEditingDataSource(null);
        }}
        editingDataSource={editingDataSource}
      />
      <DevLogs />
    </div>
  );
}

function App() {
  return (
    <DuckDBProvider>
      <AppContent />
    </DuckDBProvider>
  );
}

export default App