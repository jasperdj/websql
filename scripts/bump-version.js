#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const version = process.argv[2];
if (!version) {
  console.error('Usage: node bump-version.js <version>');
  console.error('Example: node bump-version.js 1.0.0');
  process.exit(1);
}

// Update package.json
const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = version;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`✅ Updated package.json to version ${version}`);

// Update src-tauri/Cargo.toml
const cargoPath = path.join(__dirname, '../src-tauri/Cargo.toml');
let cargoContent = fs.readFileSync(cargoPath, 'utf8');
cargoContent = cargoContent.replace(/version = ".*"/, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargoContent);
console.log(`✅ Updated Cargo.toml to version ${version}`);

// Update src-tauri/tauri.conf.json
const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log(`✅ Updated tauri.conf.json to version ${version}`);

console.log(`\n🎉 Version bumped to ${version}`);
console.log('\nNext steps:');
console.log('1. git add -A');
console.log('2. git commit -m "chore: bump version to v' + version + '"');
console.log('3. git tag v' + version);
console.log('4. git push && git push --tags');