# GitHub Actions Caching Strategy

## Overview
This document outlines the caching strategy used in our GitHub Actions workflows to optimize build times and reduce redundant work.

## Cache Types

### 1. Node.js/npm Cache
- **Provider**: `actions/setup-node@v4` with `cache: 'npm'`
- **What's cached**: npm dependencies from `node_modules`
- **Key**: Based on `package-lock.json` hash
- **Used in**: All workflows that run npm commands

### 2. Rust/Cargo Cache
- **Provider**: `swatinem/rust-cache@v2`
- **What's cached**:
  - Cargo registry (`~/.cargo/registry`)
  - Cargo index (`~/.cargo/git`)
  - Target directory (`./src-tauri/target`)
  - All downloaded crates
- **Configuration**:
  ```yaml
  - name: Rust cache
    uses: swatinem/rust-cache@v2
    with:
      workspaces: './src-tauri -> target'
      cache-all-crates: true
      cache-on-failure: true
      shared-key: "${{ matrix.platform }}-release"
      key: "${{ matrix.name }}"
  ```
- **Key Strategy**:
  - `shared-key`: Platform-specific (e.g., "windows-release", "linux-ci")
  - `key`: Build-specific (e.g., "Windows-ARM64", "Windows-x64")

### 3. APT Package Cache
- **Provider**: `actions/cache@v4`
- **What's cached**: Downloaded `.deb` packages
- **Path**: `~/apt-cache`
- **Key**: `${{ runner.os }}-apt-${{ hashFiles('.github/workflows/*.yml') }}`
- **Used in**: Ubuntu builds for system dependencies

## Cache Key Strategy

### Hierarchical Keys
We use a hierarchical key system with fallbacks:
```yaml
key: specific-key
restore-keys: |
  less-specific-key
  generic-key
```

### Examples:
1. **Rust caches**:
   - Key: `windows-release-Windows-ARM64` (most specific)
   - Shared: `windows-release` (platform specific)
   - Fallback: Any windows cache

2. **APT caches**:
   - Key: `Linux-apt-release-<hash>`
   - Restore: `Linux-apt-release-`, `Linux-apt-`

## Cache Warming
The `cache-warm.yml` workflow runs daily to pre-populate caches:
- Downloads all Rust dependencies
- Downloads all npm packages
- Downloads all APT packages
- Runs on all platforms (Linux, Windows, macOS)

## Performance Benefits

### Before Optimization:
- Cold Rust build: ~15-20 minutes
- APT package installation: ~2-3 minutes
- Total CI time: ~25-30 minutes

### After Optimization:
- Warm Rust build: ~3-5 minutes
- APT from cache: ~30 seconds
- Total CI time: ~8-10 minutes

## Best Practices

1. **Use `cache-all-crates: true`** for Rust to cache all dependencies
2. **Use `cache-on-failure: true`** to cache even on build failures
3. **Share caches** between similar jobs with `shared-key`
4. **Version cache keys** when dependencies change significantly
5. **Use restore-keys** for graceful fallbacks
6. **Warm caches** periodically to ensure fresh dependencies

## Cache Invalidation

Caches are automatically invalidated when:
- Lock files change (`package-lock.json`, `Cargo.lock`)
- Workflow files change (for APT cache)
- 7 days pass without use (GitHub's cache eviction policy)
- Manual deletion via GitHub UI or API

## Monitoring Cache Usage

Check cache hit rates in the workflow logs:
- "Cache hit" = Using existing cache
- "Cache not found" = Building fresh cache
- Monitor the "Post" steps to see cache save operations