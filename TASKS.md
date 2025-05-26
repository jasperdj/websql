# TASKS.md - WebSQL Data Compare Tool Tasks

## Current Tasks

### UI/UX Improvements - Priority
- [x] Upgrade Table Viewer with Advanced Grid Library
  - Research and integrate a robust table library (ag-Grid, TanStack Table, or similar) ✓
  - Add grid lines for better visual separation ✓
  - Implement column width resizing (basic support)
  - Add pagination controls for large datasets ✓
  - Support virtualized scrolling ✓
  - Add column sorting and filtering ✓
  
- [x] Enhance Table List Component
  - Add expand/collapse functionality for table columns ✓
  - Show column names and data types ✓
  - Add table row count indicators ✓
  
- [x] Add Table Preview Feature
  - Quick preview button/icon for each table ✓
  - Show first 10-20 rows in a modal/popover ✓
  - Display table statistics (row count, size) ✓
  
- [ ] UI Visual Improvements
  - Refine color scheme and spacing
  - Add subtle animations and transitions
  - Improve button and input styling
  - Add loading skeletons for better UX
  - Enhance dark mode support

### Data Import & Processing
- [ ] CSV parser implementation
  - Auto-detect delimiters and headers
  - Handle different encodings
  - Progress tracking for large files
  
- [ ] Set up OPFS persistence layer
  - Create OPFS utilities
  - Test file storage/retrieval
  - Handle browser compatibility

## Backlog

### Next Priority - Data Import & SQL Features
- [ ] Parquet file support
- [ ] XLSX parser with sheet selection
- [ ] SQL query history with localStorage
- [ ] Project management (save/load configurations)
- [ ] Canonical view definitions

### Comparison Features (Core MVP)
- [ ] Diff query builder UI
- [ ] Side-by-side comparison view
- [ ] Diff highlighting (added/removed/changed rows)
- [ ] Export diff results
- [ ] Diff statistics summary

### Performance & Advanced Features
- [ ] Web Worker for SQL execution
- [ ] Streaming parser for large files
- [ ] Column name auto-completion
- [ ] SQL formatting/beautify
- [ ] Keyboard shortcuts (beyond Ctrl+Enter)
- [ ] Multi-tab SQL editor

### Export & Sharing
- [ ] CSV export with filters
- [ ] JSON export
- [ ] Copy to clipboard functionality
- [ ] Shareable comparison links

### Testing & Quality
- [ ] Unit test setup (Vitest)
- [ ] DuckDB integration tests
- [ ] Component testing
- [ ] E2E test scenarios

## Future Ideas
- Multiple database connection support
- Data visualization charts
- Query templates library
- VS Code extension
- API for automation

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