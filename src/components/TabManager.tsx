import React from 'react';
import { X, Plus, FileText, Bookmark } from 'lucide-react';
import type { Tab } from '@/types/tabs';

interface TabManagerProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onTabRename: (tabId: string, newTitle: string) => void;
}

export function TabManager({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  onTabRename,
}: TabManagerProps) {
  const [editingTab, setEditingTab] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');

  const handleStartEdit = (tabId: string, currentTitle: string) => {
    setEditingTab(tabId);
    setEditTitle(currentTitle);
  };

  const handleEndEdit = (tabId: string) => {
    if (editTitle.trim()) {
      onTabRename(tabId, editTitle.trim());
    }
    setEditingTab(null);
    setEditTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      handleEndEdit(tabId);
    } else if (e.key === 'Escape') {
      setEditingTab(null);
      setEditTitle('');
    }
  };

  return (
    <div className="flex bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex-1 overflow-x-auto">
        <div className="flex w-max">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center group px-3 py-2 border-r border-gray-200 dark:border-gray-700 cursor-pointer flex-shrink-0 min-w-[120px] max-w-[200px] ${
                tab.id === activeTabId
                  ? tab.savedQueryId
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-b-2 border-blue-500'
                    : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                  : tab.savedQueryId
                    ? 'bg-blue-25 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => onTabSelect(tab.id)}
            >
              {tab.savedQueryId ? (
                <Bookmark className="h-3 w-3 mr-2 flex-shrink-0 text-green-500" />
              ) : (
                <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
              )}
            
            {editingTab === tab.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleEndEdit(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab.id)}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-gray-400 dark:border-gray-600 outline-none text-sm max-w-[150px]"
                autoFocus
              />
            ) : (
              <span
                className="text-sm truncate whitespace-nowrap"
                onDoubleClick={() => handleStartEdit(tab.id, tab.title)}
              >
                {tab.title}
                {tab.isDirty && <span className="ml-1 text-gray-400">•</span>}
              </span>
            )}

            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 hover:text-red-500" />
              </button>
            )}
            </div>
          ))}
        </div>
      </div>
      
      <button
        onClick={onNewTab}
        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-l border-gray-200 dark:border-gray-700 flex-shrink-0"
        title="New Query Tab"
      >
        <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  );
}