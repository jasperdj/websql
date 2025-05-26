# Data Compare Tool – Minimal Functional Spec

## 🔎 Use Case Context

This tool is designed to support **daily data comparisons** between exported production system data and its migrated counterpart during a system migration project. Typical users are engineers or data analysts responsible for:

- Validating the correctness of data after daily ETL exports
- Comparing production files with staging or new system extracts
- Reusing the same transformation and comparison logic across days, with different file drops
- Detecting mismatches quickly and with full SQL-based control

---

## ✅ Core Requirements

### File Import

- User can drag and drop multiple CSV, Parquet, or XLSX files
- Each file is ingested as a `raw_<filename>` DuckDB table
- File parsing supports:
  - Header detection, delimiter auto-detect, type inference (for CSV/Parquet)
  - For XLSX: allow user to specify sheet, header row, and data range if structure is non-standard

### Canonical Mapping (Project-based)

- Users define SQL `CREATE VIEW` statements to normalize raw tables
- Canonical views are tied to **projects**, saved in `localStorage`
- Projects:
  - Have a user-defined name
  - Store all canonical and comparison SQL
  - Can be created, edited, duplicated, deleted
  - Let users drop new files while keeping logic unchanged

### Comparison Logic (Project-based)

- Users define SQL diff logic (e.g. joins, EXCEPT, value checks) within the project
- When run, the SQL compares the current day's files using the saved logic
- Output is stored as `diff_<runId>` table in DuckDB with metadata

### Result Viewer

- Display diff results in a fast, virtualized grid
- Allow filtering, sorting, and column selection
- Allow export of full or filtered results as CSV

### History

- Log each run with:
  - Timestamp
  - Project name
  - Files used
  - Diff type breakdown and row count
- Allow rerunning or re-exporting past runs

### Persistence

- Use **OPFS** for DuckDB storage (tables, diffs)
- Use **`localStorage`** to persist per-project logic (canonical views, SQL, metadata)
- All data is stored entirely in-browser with no backend or external calls

### UI Design Principles

- Targeted at **power users (engineers, data analysts)** — not casual users
- SQL-first interface:
  - Monaco editor with syntax highlighting and column auto-complete
  - No form-based mappers or UI abstractions
- Focus on **efficiency, repeatability, and scriptability**
- Optional: multiple editable SQL tabs per project
