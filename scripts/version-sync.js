#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from VERSION file
const versionFilePath = path.join(__dirname, '..', 'VERSION');
const version = readFileSync(versionFilePath, 'utf-8').trim();

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

// Update version in package.json
packageJson.version = version;

// Write back to package.json
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Version synced: ${version}`);
console.log(`📦 package.json updated to version ${version}`); 