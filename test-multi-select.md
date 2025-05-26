# Multi-Select and Table Metadata Test Guide

## Features Implemented

1. **Multi-Select Tables**
   - Ctrl+Click: Toggle selection of individual tables
   - Shift+Click: Select range of tables
   - Visual feedback with blue background for selected tables

2. **Multi-Operation Support**
   - Delete multiple selected tables at once
   - Export multiple selected tables at once

3. **Table Metadata Display**
   - Shows row count in expanded view: "X columns, Y rows"
   - Shows origin: file, paste, or sql
   - Shows original filename for imported files

4. **Original Format Export**
   - New "Original Format" export option at the top of export menu
   - Exports with original filename and delimiter (for CSV files)
   - Falls back to standard CSV if no metadata available

## Test Steps

1. **Import Test Files**
   - Import a CSV file with comma delimiter
   - Import a CSV file with semicolon delimiter  
   - Paste some CSV data
   - Create a table via SQL

2. **Test Multi-Select**
   - Click a table to select it
   - Ctrl+Click another table to add to selection
   - Shift+Click to select a range
   - Right-click on selected tables to see context menu

3. **Test Metadata Display**
   - Expand tables to see row count and origin info
   - Verify origin shows correctly for each import type

4. **Test Original Export**
   - Right-click a table imported from file
   - Choose Export > Original Format
   - Verify it exports with original filename and delimiter

5. **Test Multi-Delete**
   - Select multiple tables with Ctrl+Click
   - Right-click and choose Delete
   - Confirm deletion of multiple tables

## Implementation Details

- Metadata stored in localStorage via `tableMetadataService`
- Persists across app restarts
- Metadata includes: origin, originalFilename, originalDelimiter, createdAt
- Multi-select state managed in TableList component