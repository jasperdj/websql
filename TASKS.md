# TASKS.md - WebSQL Data Compare Tool Tasks

## Current Sprint: Data Source Integration

### Phase 1: UI Refactoring
- [ ] Rename "Tables/views" to "Local database" in TableList component
- [ ] Rename "Import files" button to "Import/connect"
- [ ] Add "Import datasource" option to import dropdown menu
- [ ] Create DataSourceModal component with:
  - Platform detection (Tauri vs web)
  - Web variant message about desktop-only functionality
  - Desktop variant with datasource dropdown

### Phase 2: Data Source Infrastructure
- [ ] Create DataSource types and interfaces:
  ```typescript
  interface DataSource {
    id: string
    type: 'local_directory' | 'postgres'
    name: string
    config: LocalDirConfig | PostgresConfig
    status: 'connected' | 'disconnected' | 'error'
  }
  ```
- [ ] Implement DataSourceManager for connection handling
- [ ] Add localStorage/OPFS persistence for datasource configs
- [ ] Create connection testing functionality

### Phase 3: Local Directory Integration
- [ ] Create FileTreeView component for sidebar
  - Collapsible folder structure
  - File type detection and icons
  - Click handlers for different file types
- [ ] Implement file watching using Tauri fs events
- [ ] Create sync mechanism for columnar files:
  - Auto-import CSV/Parquet/XLSX to DuckDB on open
  - Watch for changes and re-import
  - Handle write-back to original files
- [ ] Add file type handlers:
  - Columnar → TableViewer with sync
  - Text files → CodeMirror editor tab
  - SQL files → SQLEditor tab

### Phase 4: PostgreSQL Integration
- [ ] Add postgres scanner extension to DuckDB
- [ ] Create PostgreSQL connection form
- [ ] Implement schema browsing UI
- [ ] Enable cross-database queries in SQL editor
- [ ] Add connection pooling and error handling

### Phase 5: Tab System Enhancement
- [ ] Extend tab types to include:
  - 'file_table' (synced columnar file)
  - 'file_text' (text editor)
  - 'file_sql' (SQL file)
- [ ] Add file path indicator in tabs
- [ ] Implement save/sync status indicators

### Phase 6: State Management
- [ ] Create DataSourceContext for managing connections
- [ ] Add Redux/Zustand slice for datasource state
- [ ] Handle connection lifecycle (connect/disconnect/reconnect)
- [ ] Implement error boundaries for connection failures

## Completed Tasks

### Tauri App Foundation ✅
- [x] Set up Tauri build pipeline
  - [x] Configure Tauri with TypeScript
  - [x] Add main process with plugin support
  - [x] Set up capabilities for security
  - [x] Implement capability detection (web vs Tauri)
  - [x] Create auto-updater configuration using GitHub releases
  
- [x] GitHub Actions CI/CD
  - [x] Configure dual build workflow (web + Tauri)
  - [x] Web build → GitHub Pages
  - [x] Tauri builds → GitHub Releases (Win/Mac/Linux)
  - [x] Auto-generate download links in web app
  - [x] Version synchronization between builds

## Backlog

### Core Features Already Implemented
- [x] CSV/Parquet import and export
- [x] Multi-tab SQL editor
- [x] SQL query saving and project management
- [x] Combine files functionality
- [x] Table persistence across sessions
- [x] Context menus and keyboard shortcuts
- [x] Dark mode support

### Nice-to-Have Enhancements
- [ ] XLSX export functionality (currently shows "not implemented")
- [ ] JSON export option
- [ ] Row-level color coding based on SQL conditions
- [ ] SQL formatting/beautify
- [ ] More keyboard shortcuts
- [ ] Column statistics in results

### Future Tauri Enhancements
- [ ] More database support (MySQL, SQLite, SQL Server)
- [ ] Cloud storage integration (S3, Azure Blob, GCS)
- [ ] REST API as data source
- [ ] Scheduled sync/refresh for external tables
- [ ] Data lineage visualization
- [ ] SSH tunnel support for databases

### Testing & Quality
- [ ] Unit test setup (Vitest)
- [ ] Integration tests for external sources
- [ ] E2E tests for both web and Tauri
- [ ] Security audit for Tauri IPC

## Completed Tasks Archive
### Setup & Foundation
- [x] Create project documentation structure
- [x] Set up React + TypeScript + Vite
  - Initialize with modern React setup
  - Configure TypeScript for strict mode
  - Set up path aliases
  
- [x] Integrate DuckDB WASM
  - Install @duckdb/duckdb-wasm
  - Create DuckDB service wrapper
  - Test basic SQL operations

### Core Features - Phase 1
- [x] File Import Component
  - Drag & drop zone
  - File type detection
  - Progress indicators
  - Error handling
  
- [x] SQL Editor Integration
  - Monaco editor setup
  - SQL syntax highlighting
  - Theme support

- [x] Basic Table Viewer
  - Display query results
  - Basic functionality

---

## Task Guidelines
- Check off tasks as completed
- Add implementation notes below tasks
- Move completed tasks to archive
- Keep current tasks focused (5-7 tasks)
- Add discovered tasks to backlog