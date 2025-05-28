# GitHub Actions Setup for WebSQL

This project uses GitHub Actions for automated builds and releases.

## Workflows

### 1. CI Workflow (`ci.yml`)
- **Triggers**: On push to main and pull requests
- **Actions**:
  - Runs linting and type checking
  - Builds the web app
  - Checks Tauri build configuration
- **Purpose**: Ensures code quality and build integrity

### 2. Release Workflow (`release.yml`)
- **Triggers**: 
  - On pushing tags like `v1.0.0`
  - Manual trigger with version input
- **Actions**:
  - Builds web version
  - Builds Tauri apps for Windows, macOS, and Linux
  - Creates GitHub release with all artifacts
  - Updates GitHub Pages with download links
- **Artifacts**:
  - Windows: `.msi` and `.exe` installers
  - macOS: Universal `.dmg` (Intel + Apple Silicon)
  - Linux: `.AppImage` and `.deb` packages

### 3. Tauri Build Workflow (`tauri-build.yml`)
- **Triggers**: On version tags and manual
- **Purpose**: Dedicated Tauri builds with draft releases

## Creating a Release

1. **Bump the version**:
   ```bash
   npm run version:bump 1.0.0
   ```

2. **Commit and tag**:
   ```bash
   git add -A
   git commit -m "chore: bump version to v1.0.0"
   git tag v1.0.0
   git push && git push --tags
   ```

3. **Monitor the build**:
   - Go to Actions tab on GitHub
   - Watch the release workflow progress
   - Check the Releases page when complete

## Download Links

After a successful release, downloads are available at:
- **Direct links**: `https://github.com/jasperdj/websql/releases/latest/download/[filename]`
- **Download page**: `https://jasperdj.github.io/websql/download.html`
- **Release page**: `https://github.com/jasperdj/websql/releases`

## Troubleshooting

### Build Failures
- Check the Actions tab for error logs
- Common issues:
  - Missing system dependencies (Linux)
  - Code signing (macOS)
  - Version mismatch between configs

### Manual Release
If automated release fails:
1. Download artifacts from Actions
2. Create release manually on GitHub
3. Upload the artifacts

## Security Notes
- The `GITHUB_TOKEN` is automatically provided
- No additional secrets needed for public releases
- Code signing can be added later for production