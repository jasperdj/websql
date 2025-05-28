# TASKS.md - WebSQL Data Compare Tool Tasks

## Current Tasks

### Phase 1: Electron App Foundation ✅
- [x] Set up Electron build pipeline
  - [x] Configure electron-builder with TypeScript
  - [x] Add main process with IPC handlers
  - [x] Set up preload script with contextBridge for security
  - [x] Implement capability detection (web vs electron)
  - [ ] Create auto-updater configuration using GitHub releases
  
- [x] GitHub Actions CI/CD
  - [x] Configure dual build workflow (web + electron)
  - [x] Web build → GitHub Pages
  - [x] Electron builds → GitHub Releases (Win/Mac/Linux)
  - [ ] Auto-generate download links in web app
  - [ ] Version synchronization between builds

### Phase 2: External Data Sources (Electron Only)
- [ ] Local File System Integration
  - Add "Local Folder" option in Import section
  - Implement directory picker dialog
  - File watcher for auto-reload on external changes
  - Write-back on save with file locking
  - Show file icon (📄) in table list
  
- [ ] SFTP/SSH Integration
  - Add "SFTP Server" option in Import section
  - Connection config UI (host, port, auth)
  - Remote file browser dialog
  - Secure credential storage using electron-store
  - Write-back support with conflict detection
  - Show remote icon (🌐) in table list
  
- [ ] PostgreSQL Integration  
  - Add "Database" option in Import section
  - Connection string management UI
  - Schema/table browser dialog
  - Live table import as external tables
  - Transaction support for write-back
  - Show database icon (🗄️) in table list

### Phase 3: UI Enhancements for External Sources
- [ ] Update Import Section
  - Rename "Import Files" → "Import"
  - Add connection type selector (Files/Local/SFTP/Database)
  - Connection manager with saved configs
  - Recent connections quick access
  
- [ ] Table List Updates for External Sources
  - Add source type icons
  - Show sync status indicators
  - Add "Refresh" for external tables
  - Visual feedback for unsaved changes
  - Right-click → "Open in source" option

### Phase 4: Write-Back & Sync Features
- [ ] Implement save triggers
  - Manual save command (Ctrl+S in results)
  - Auto-save after DML operations
  - Configurable auto-save with debounce
  - Save status in status bar
  
- [ ] Conflict Resolution
  - Detect external file/DB changes
  - Three-way merge UI for conflicts
  - Backup before overwrite option
  - Change history tracking

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

### Future Electron Enhancements
- [ ] More database support (MySQL, SQLite, SQL Server)
- [ ] Cloud storage integration (S3, Azure Blob, GCS)
- [ ] REST API as data source
- [ ] Scheduled sync/refresh for external tables
- [ ] Data lineage visualization
- [ ] SSH tunnel support for databases

### Testing & Quality
- [ ] Unit test setup (Vitest)
- [ ] Integration tests for external sources
- [ ] E2E tests for both web and electron
- [ ] Security audit for electron IPC

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