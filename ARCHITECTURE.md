# ARCHITECTURE.md - WebSQL Data Compare Tool Technical Design

## System Overview

The WebSQL Data Compare Tool is a browser-based application that enables data engineers to compare datasets using SQL queries. All processing happens client-side using WebAssembly and modern browser APIs.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React UI      │────▶│  DuckDB WASM     │────▶│   OPFS Storage  │
│  (Presentation) │     │  (Processing)     │     │  (Persistence)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Monaco Editor   │     │   SQL Engine     │     │ localStorage    │
│ (SQL Editing)   │     │ (Query Execution)│     │ (Project Config)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Core Technologies

### Frontend
- **React 18+** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Monaco Editor** - SQL editing with IntelliSense
- **TanStack Table** - Data grid virtualization

### Data Processing
- **DuckDB WASM** - In-browser SQL engine
- **Apache Arrow** - Columnar data format
- **Web Workers** - Background processing

### Storage
- **OPFS (Origin Private File System)** - Large file storage
- **localStorage** - Project configurations
- **IndexedDB** - Fallback for OPFS

## Key Design Decisions

### 1. Client-Side Only Architecture
**Decision**: No backend server required
**Rationale**: 
- Data privacy - sensitive data never leaves the browser
- Simplified deployment
- Offline capability
- No infrastructure costs

### 2. DuckDB as SQL Engine
**Decision**: Use DuckDB WASM instead of SQLite or custom engine
**Rationale**:
- Excellent performance for analytical queries
- Native Parquet support
- Rich SQL dialect
- Active development and community

### 3. OPFS for Data Storage
**Decision**: Use OPFS for table data, localStorage for configs
**Rationale**:
- OPFS provides file-system-like API
- Better performance than IndexedDB for large files
- localStorage is synchronous and perfect for small configs
- Clear separation of concerns

### 4. Monaco Editor Integration
**Decision**: Use Monaco (VS Code editor) for SQL editing
**Rationale**:
- Professional SQL editing experience
- Built-in syntax highlighting
- Extensible for auto-completion
- Familiar to developers

## Component Architecture

### Core Services

```typescript
// src/lib/services/

interface DuckDBService {
  initialize(): Promise<void>
  executeQuery(sql: string): Promise<QueryResult>
  importFile(file: File, tableName: string): Promise<void>
  getTableSchema(tableName: string): Promise<TableSchema>
}

interface StorageService {
  saveProject(project: Project): Promise<void>
  loadProject(id: string): Promise<Project>
  listProjects(): Promise<ProjectMeta[]>
  deleteProject(id: string): Promise<void>
}

interface FileImportService {
  detectFileType(file: File): FileType
  parseCSV(file: File, options: CSVOptions): Promise<DataFrame>
  parseParquet(file: File): Promise<DataFrame>
  parseExcel(file: File, options: ExcelOptions): Promise<DataFrame>
}
```

### UI Components Structure

```
src/components/
├── layout/
│   ├── AppLayout.tsx
│   ├── Sidebar.tsx
│   └── Header.tsx
├── editor/
│   ├── SQLEditor.tsx
│   ├── EditorTabs.tsx
│   └── AutoComplete.tsx
├── data/
│   ├── DataGrid.tsx
│   ├── FileDropZone.tsx
│   └── ImportProgress.tsx
├── project/
│   ├── ProjectManager.tsx
│   ├── ProjectSelector.tsx
│   └── ProjectSettings.tsx
└── comparison/
    ├── DiffViewer.tsx
    ├── DiffStats.tsx
    └── ComparisonBuilder.tsx
```

## Data Flow

### File Import Flow
1. User drops file onto DropZone
2. FileImportService detects type and parses
3. DuckDBService creates table from parsed data
4. OPFS stores table data
5. UI updates with import success

### Query Execution Flow
1. User writes SQL in Monaco Editor
2. SQL sent to DuckDBService
3. DuckDB executes query in Web Worker
4. Results streamed back to main thread
5. DataGrid renders virtualized results

### Project Save/Load Flow
1. User creates/modifies project
2. Project config serialized to JSON
3. localStorage stores project metadata
4. OPFS stores associated table data
5. Project can be restored on reload

## Security Considerations

### Data Privacy
- All data remains in browser
- No external API calls
- OPFS data isolated per origin
- No tracking or analytics

### Input Validation
- SQL injection prevented by DuckDB
- File size limits enforced
- Memory usage monitoring
- Graceful error handling

## Performance Optimizations

### Large Dataset Handling
- Virtual scrolling in data grid
- Streaming file parsers
- Web Worker processing
- Lazy loading of results

### Memory Management
- Dispose DuckDB resources properly
- Clear unused OPFS files
- Monitor memory usage
- Implement data retention policies

## Browser Compatibility

### Required APIs
- Web Workers
- OPFS (with IndexedDB fallback)
- WebAssembly
- File API
- Drag and Drop API

### Minimum Versions
- Chrome 102+
- Firefox 111+
- Safari 15.2+
- Edge 102+

## Testing Strategy

### Unit Tests
- Service layer logic
- Data parsers
- Utility functions
- React component logic

### Integration Tests
- DuckDB operations
- File import/export
- Project save/load
- SQL execution

### E2E Tests
- Complete user workflows
- File import to comparison
- Project management
- Export operations

## Future Architecture Considerations

### Potential Enhancements
1. **Plugin System** - Custom data sources/exporters
2. **Collaboration** - WebRTC for shared sessions
3. **Cloud Sync** - Optional encrypted backup
4. **API Mode** - Headless operation for automation
5. **Mobile Support** - Responsive design and touch

### Scalability
- Partition large tables
- Implement query caching
- Progressive result loading
- Background index building