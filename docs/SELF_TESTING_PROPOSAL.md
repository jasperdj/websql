# Self-Testing Proposal: Claude Code + Browser MCP + Tauri

## Overview

Enable Claude Code to build, run, and interactively test the WebSQL application:
- **Web version** (via `claude-in-chrome` MCP) - UI testing, visual verification
- **Tauri desktop app** - Native features: file system, data sources, sync

## Testing Scope

| Feature | Web Version | Tauri Desktop |
|---------|-------------|---------------|
| UI/Layout | ✅ Browser MCP | ✅ WebDriver |
| SQL Queries | ✅ | ✅ |
| File Import (drag-drop) | ⚠️ Limited | ✅ |
| Local Directory Data Source | ❌ | ✅ Required |
| File Sync (read/write) | ❌ | ✅ Required |
| PostgreSQL Data Source | ❌ | ✅ Required |
| File Watcher | ❌ | ✅ Required |

## Current Capabilities

I already have access to browser automation via `claude-in-chrome` MCP:
- `navigate` - Go to URLs
- `computer` (screenshot, click, type, scroll)
- `read_page` - Get accessibility tree
- `find` - Find elements by natural language
- `form_input` - Fill form fields
- `javascript_tool` - Execute JS in page context
- `get_page_text` - Extract text content
- `read_console_messages` - Read browser console
- `gif_creator` - Record interactions

## Proposed Workflow

### 1. Build & Run Dev Server

```bash
# Start dev server in background
npm run dev &
# Wait for server to be ready
sleep 5
```

### 2. Open Browser Tab

```
mcp__claude-in-chrome__tabs_create_mcp
mcp__claude-in-chrome__navigate -> http://localhost:5173
```

### 3. Test Scenarios

#### Test: File Import
1. Navigate to app
2. Find file drop zone or import button
3. Use `upload_image` or drag-drop simulation
4. Verify table appears in sidebar
5. Screenshot result

#### Test: Query Execution
1. Find SQL editor (Monaco)
2. Type query: `SELECT * FROM table_name`
3. Click "Run" button or Ctrl+Enter
4. Verify results grid populates
5. Read console for errors

#### Test: Cell Editing
1. Double-click a cell in results grid
2. Type new value
3. Press Enter
4. Check console for `[TableViewer]` logs
5. Verify UPDATE query executed

#### Test: File Sync
1. Edit a cell in a synced table
2. Check console for sync messages
3. Re-open file from tree
4. Verify change persisted

### 4. Validation Methods

| Method | Use Case |
|--------|----------|
| `read_console_messages` | Check for errors, verify logs |
| `screenshot` | Visual verification |
| `javascript_tool` | Query DOM state, check values |
| `get_page_text` | Verify text content |
| `read_page` | Check element structure |

## Challenges & Solutions

### Challenge 1: File Upload
**Problem**: Browser security prevents programmatic file access
**Solutions**:
- Use Tauri's file dialog mock in dev mode
- Pre-load test files via DuckDB directly using JS injection
- Create test endpoint that accepts file paths

### Challenge 2: Test Data
**Problem**: Need consistent test files
**Solution**: Create `test-data/` folder with:
- `test.csv` - Simple CSV
- `test.parquet` - Parquet file
- `test.xlsx` - Multi-sheet Excel

### Challenge 3: Dev Server Management
**Problem**: Need to start/stop server reliably
**Solution**:
```bash
# Start with PID tracking
npm run dev & echo $! > .dev-server.pid

# Stop when done
kill $(cat .dev-server.pid)
```

### Challenge 4: Wait for App Ready
**Problem**: App needs time to initialize DuckDB WASM
**Solution**: Poll for ready state:
```javascript
// Inject and wait
await page.evaluate(() => {
  return new Promise((resolve) => {
    const check = () => {
      if (window.duckdbService?.db) resolve(true);
      else setTimeout(check, 100);
    };
    check();
  });
});
```

## Implementation Steps

### Phase 1: Basic Flow (Now)
1. [ ] Add npm script: `npm run dev:test` (starts server, waits for ready)
2. [ ] Create `test-data/` with sample files
3. [ ] Document manual test checklist

### Phase 2: Browser Automation (Next)
1. [ ] Create test helper that pre-loads test data via JS
2. [ ] Write first automated test: query execution
3. [ ] Add screenshot comparison for UI verification

### Phase 3: Full Integration
1. [ ] Create `/test` slash command or skill
2. [ ] Automated regression suite
3. [ ] GIF recording of test runs for review

## Example Test Session

```
# 1. Start dev server
Bash: npm run dev (background)

# 2. Get browser context
mcp__claude-in-chrome__tabs_context_mcp

# 3. Create new tab
mcp__claude-in-chrome__tabs_create_mcp

# 4. Navigate to app
mcp__claude-in-chrome__navigate -> localhost:5173

# 5. Wait and screenshot
mcp__claude-in-chrome__computer -> wait 3s
mcp__claude-in-chrome__computer -> screenshot

# 6. Inject test data
mcp__claude-in-chrome__javascript_tool ->
  await duckdbService.query("CREATE TABLE test AS SELECT 1 as a, 'hello' as b")

# 7. Run query in UI
mcp__claude-in-chrome__find -> "SQL editor"
mcp__claude-in-chrome__computer -> click
mcp__claude-in-chrome__computer -> type "SELECT * FROM test"
mcp__claude-in-chrome__find -> "Run button"
mcp__claude-in-chrome__computer -> click

# 8. Verify results
mcp__claude-in-chrome__read_console_messages
mcp__claude-in-chrome__computer -> screenshot
```

## Quick Start Command

Add to package.json:
```json
{
  "scripts": {
    "test:e2e": "npm run dev & sleep 5 && echo 'Ready for browser testing at http://localhost:5173'"
  }
}
```

## Tauri Desktop Testing

### Option 1: Tauri WebDriver (Recommended)

Tauri has built-in WebDriver support via `tauri-driver`. This allows standard WebDriver/Selenium-style testing.

**Setup:**
```bash
# Install tauri-driver
cargo install tauri-driver

# Run tests (starts app + WebDriver server)
tauri-driver -- cargo test
```

**Cargo.toml addition:**
```toml
[dev-dependencies]
tauri-driver = "2"
fantoccini = "0.19"  # WebDriver client
tokio = { version = "1", features = ["full"] }
```

**Test example:**
```rust
#[tokio::test]
async fn test_file_sync() {
    let client = fantoccini::ClientBuilder::native()
        .connect("http://localhost:4444")
        .await
        .unwrap();

    // Navigate, interact, verify
    client.goto("tauri://localhost").await.unwrap();
    // ... test logic
}
```

### Option 2: Chrome DevTools Protocol via Tauri

Tauri's WebView2 (Windows) supports remote debugging. We can connect the Chrome MCP to it.

**Enable in tauri.conf.json:**
```json
{
  "build": {
    "devtools": true
  },
  "app": {
    "windows": [{
      "devtools": true
    }]
  }
}
```

**Start Tauri with debug port:**
```bash
# Windows - WebView2 remote debugging
set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222
cargo tauri dev
```

Then Chrome MCP could potentially connect to `localhost:9222`.

### Option 3: File System Verification (Simplest)

For file sync testing, we don't need UI automation - just verify files:

```bash
# 1. Build and run Tauri app
cargo tauri dev &

# 2. Create test file
echo "a,b,c\n1,2,3" > "C:/Users/jjasp/Documents/test data/test.csv"

# 3. User/automation loads file in app, makes edit

# 4. Verify file was modified
cat "C:/Users/jjasp/Documents/test data/test.csv"
# Should show updated content
```

**Claude can:**
- Read/write test files directly via Bash
- Check file modification timestamps
- Compare file contents before/after operations

### Option 4: Hybrid Approach (Practical)

Combine methods for comprehensive testing:

| Test Type | Method |
|-----------|--------|
| UI rendering | Browser MCP on web version |
| Visual regression | Screenshots via Browser MCP |
| File sync | File system checks + Tauri app |
| Data sources | Tauri WebDriver or manual |
| Console/errors | Browser MCP console reading |

## Native Testing Workflow

### Prerequisites
```bash
# Ensure test data directory exists
mkdir -p "C:/Users/jjasp/Documents/test data"

# Create test files
echo "id,name,value" > "C:/Users/jjasp/Documents/test data/test.csv"
echo "1,Alice,100" >> "C:/Users/jjasp/Documents/test data/test.csv"
echo "2,Bob,200" >> "C:/Users/jjasp/Documents/test data/test.csv"
```

### Test: File Sync Verification

```bash
# 1. Record original file hash
md5sum "C:/Users/jjasp/Documents/test data/test.csv" > /tmp/before.md5

# 2. User loads file in Tauri app, edits cell, saves

# 3. Verify file changed
md5sum "C:/Users/jjasp/Documents/test data/test.csv" > /tmp/after.md5
diff /tmp/before.md5 /tmp/after.md5

# 4. Verify content
cat "C:/Users/jjasp/Documents/test data/test.csv"
```

### Test: Data Source Connection

For PostgreSQL testing, we'd need:
1. Local PostgreSQL instance or Docker container
2. Test database with known schema
3. Verify DuckDB can query via postgres_scanner

```bash
# Start test PostgreSQL
docker run -d --name test-pg -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:15

# Create test data
psql -h localhost -U postgres -c "CREATE TABLE test (id int, name text);"
psql -h localhost -U postgres -c "INSERT INTO test VALUES (1, 'Alice');"

# Test in app: connect to localhost:5432, query test table
```

## Proposed npm Scripts

```json
{
  "scripts": {
    "test:web": "npm run dev & sleep 5 && echo 'Web ready at http://localhost:5173'",
    "test:tauri": "cargo tauri dev",
    "test:tauri:debug": "set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222 && cargo tauri dev",
    "test:setup": "node scripts/test/setup-test-data.js",
    "test:verify-sync": "node scripts/test/verify-file-sync.js"
  }
}
```

## Implementation Phases

### Phase 1: Test Infrastructure (1-2 hours)
- [ ] Create `test-data/` with CSV, Parquet, XLSX samples
- [ ] Add `scripts/test/setup-test-data.js`
- [ ] Add `scripts/test/verify-file-sync.js`
- [ ] Document manual test checklist

### Phase 2: Web UI Testing (2-3 hours)
- [ ] Create test helper for Browser MCP
- [ ] Automated: App loads, query executes, results display
- [ ] Screenshot baseline for visual regression

### Phase 3: Tauri Native Testing (3-4 hours)
- [ ] Enable WebView2 remote debugging
- [ ] Test connecting Chrome MCP to Tauri webview
- [ ] OR: Set up tauri-driver + basic test suite
- [ ] File sync verification script

### Phase 4: CI Integration (Future)
- [ ] GitHub Actions workflow for web tests
- [ ] Windows runner for Tauri tests
- [ ] Automated regression on PR

## Next Steps

1. Should I implement Phase 1 now (test data + npm script)?
2. Want me to try a quick test run with the browser MCP on web version?
3. Should we try the WebView2 remote debugging approach for Tauri?
