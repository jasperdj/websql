#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function syncVersion(newVersion) {
  // Read package.json
  const packageJsonPath = join(rootDir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  // Read tauri.conf.json
  const tauriConfPath = join(rootDir, 'src-tauri', 'tauri.conf.json');
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
  
  // Read Cargo.toml
  const cargoTomlPath = join(rootDir, 'src-tauri', 'Cargo.toml');
  let cargoToml = readFileSync(cargoTomlPath, 'utf8');
  
  // Use provided version or get from package.json
  const normalizedVersion = newVersion ? newVersion.replace(/^v/i, '') : newVersion;
  const version = normalizedVersion || packageJson.version;
  
  console.log(`Synchronizing version to: ${version}`);
  
  // Update package.json
  packageJson.version = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✓ Updated package.json');
  
  // Update tauri.conf.json
  tauriConf.version = version;
  writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log('✓ Updated tauri.conf.json');
  
  // Update Cargo.toml
  cargoToml = cargoToml.replace(
    /^version = ".*"$/m,
    `version = "${version}"`
  );
  writeFileSync(cargoTomlPath, cargoToml);
  console.log('✓ Updated Cargo.toml');
  
  console.log('\n✅ Version synchronized successfully!');
}

// Check if version argument is provided
const args = process.argv.slice(2);
if (args.length > 0 && args[0]) {
  syncVersion(args[0]);
} else {
  // Sync using current package.json version
  syncVersion();
}
