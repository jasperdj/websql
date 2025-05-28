# CLAUDE.md - WebSQL Data Compare Tool Development Guide

## Project Overview
This is a browser-based data comparison tool for engineers and data analysts to validate data migrations by comparing production exports with migrated data using SQL queries.

## Development Workflow

### 1. Project Documentation Structure
- `CLAUDE.md` - This file, contains workflow and conventions
- `TASKS.md` - Current sprint tasks and backlog
- `ARCHITECTURE.md` - Technical design decisions
- `prd.md` - Product requirements document

### 2. Code Organization
```
websql/
├── src/
│   ├── components/     # React/UI components
│   ├── lib/           # Core business logic
│   ├── utils/         # Helper functions
│   └── types/         # TypeScript types
├── public/            # Static assets
├── tests/             # Test files
└── docs/              # Additional documentation
```

### 3. Development Guidelines

#### When Adding Features:
1. Check TASKS.md for the current task
2. Review ARCHITECTURE.md for relevant design patterns
3. Implement following existing code patterns
4. Update tests
5. Update TASKS.md with progress

#### Code Conventions:
- TypeScript for all new code
- Functional components for React
- SQL stored as template literals
- DuckDB for in-browser SQL engine
- OPFS for persistence, localStorage for settings

#### Testing:
- Unit tests for utilities and business logic
- Integration tests for SQL operations
- Manual testing checklist in TASKS.md
- Visual regression testing with Puppeteer (when appropriate)

### 4. Key Technical Decisions
- **No Backend**: All processing happens in-browser
- **DuckDB WASM**: For SQL processing
- **OPFS**: For table storage
- **localStorage**: For project configurations
- **Monaco Editor**: For SQL editing with syntax highlighting

### 5. Development Commands
```bash
npm install          # Install dependencies
npm run dev         # Start development server
npm run build       # Build for production
npm run test        # Run tests
npm run lint        # Run linter
npm run typecheck   # Run TypeScript type checking

# Visual Testing (Optional - use when UI changes need verification)
node scripts/screenshot.js         # Take UI screenshot with Puppeteer
node scripts/virtual-screenshot.js # Text-based UI verification (ARM64 fallback)
```

### 6. Task Management
Tasks are managed in TASKS.md with this format:
```markdown
## Current Tasks
- [ ] Task description
  - Implementation notes
  - Acceptance criteria

## Backlog
- Feature ideas grouped by category
```

### 7. Common Patterns

#### File Import Flow:
1. Drag & drop triggers file handler
2. Parse file based on type (CSV/Parquet/XLSX)
3. Create `raw_<filename>` table in DuckDB
4. Update UI with import status

#### SQL Execution:
1. Get SQL from Monaco editor
2. Execute against DuckDB instance
3. Handle errors with clear messages
4. Display results in virtualized grid

#### Project Management:
1. Projects stored in localStorage as JSON
2. Each project contains:
   - Canonical view definitions
   - Comparison SQL queries
   - Metadata (name, created, modified)

### 8. Error Handling
- User-friendly error messages for SQL errors
- File parsing errors shown inline
- Network errors not applicable (all local)
- Graceful OPFS fallbacks

### 9. Performance Considerations
- Virtualized grids for large datasets
- Lazy loading for file parsing
- Web Workers for heavy processing
- Incremental view updates

## 10. Task Refinement Process
- When starting a new batch of tasks:
  1. Review backlog in TASKS.md
  2. Break down high-level tasks into detailed sub-tasks
  3. Prioritize tasks based on project goals
  4. Move refined tasks from backlog to Current Tasks section
  5. Add implementation notes and acceptance criteria
  6. Update status and track progress

## Getting Started
1. Review the PRD in prd.md
2. Check current tasks in TASKS.md
3. Follow the development workflow above
4. Ask questions when design decisions needed

## Testing Approach

### When to Use Visual Testing
Use Puppeteer screenshot testing when:
- Making significant UI/layout changes
- Adding new visual components
- Fixing visual bugs
- Before major releases
- Verifying responsive design changes

### Visual Testing Commands
```bash
# Prerequisites: Ensure dev server is running (npm run dev)

# Take a screenshot of the current UI
node scripts/screenshot.js

# Alternative methods:
node scripts/screenshot-playwright.js  # Uses Playwright instead of Puppeteer
node scripts/virtual-screenshot.js     # Text-based UI structure (no browser needed)
```

### ARM64/WSL Considerations
If Puppeteer fails on ARM64 systems:
1. Install required libraries: `sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2`
2. Use Docker solution: `docker build -f scripts/puppeteer-arm64-fix/Dockerfile -t websql-puppeteer .`
3. Fallback to virtual screenshot: `node scripts/virtual-screenshot.js`

## Known Issues

### Puppeteer on ARM64 Systems
Puppeteer may fail on ARM64/aarch64 systems due to architecture incompatibility and missing system libraries. See PUPPETEER_ARM64_FIX.md for detailed solutions. As a workaround, use:
- `node scripts/virtual-screenshot.js` for UI verification
- Manual browser testing at http://localhost:5173
- Docker-based solution in scripts/puppeteer-arm64-fix/

## Memories
- Always echo -e "\a" as the LAST SEPARATE command before finishing a task (cannot be appended with &). This ensures the audio alert is played after task completion.
- Do not mention Claude in git commits or anywhere in the source code