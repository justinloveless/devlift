#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionType = process.argv[2];

if (!versionType || !['major', 'minor', 'patch'].includes(versionType)) {
    console.error('Usage: npm run version:bump <major|minor|patch>');
    console.error('Example: npm run version:bump patch');
    process.exit(1);
}

// Read current version
const versionFilePath = path.join(__dirname, '..', 'VERSION');
const currentVersion = readFileSync(versionFilePath, 'utf-8').trim();

// Parse version
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Calculate new version
let newVersion;
switch (versionType) {
    case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
    case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
    case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
}

// Write new version
writeFileSync(versionFilePath, newVersion);

console.log(`🔢 Version bumped: ${currentVersion} → ${newVersion}`);
console.log(`📝 Updated VERSION file to ${newVersion}`);
console.log('💡 Run "npm run publish:safe" to publish this version'); 