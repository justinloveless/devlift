#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionType = process.argv[2];
const isBeta = process.argv.includes('--beta');

if (!versionType || !['major', 'minor', 'patch'].includes(versionType)) {
    console.error('Usage: npm run version:bump <major|minor|patch> [--beta]');
    console.error('Example: npm run version:bump patch');
    console.error('Example: npm run version:bump minor --beta');
    process.exit(1);
}

// Read current version
const versionFilePath = path.join(__dirname, '..', 'VERSION');
const currentVersion = readFileSync(versionFilePath, 'utf-8').trim();

// Parse version (handle beta versions)
let major, minor, patch, betaNumber = 0;
let isBetaVersion = currentVersion.includes('-beta.');

if (isBetaVersion) {
    const [baseVersion, betaPart] = currentVersion.split('-beta.');
    [major, minor, patch] = baseVersion.split('.').map(Number);
    betaNumber = parseInt(betaPart);
} else {
    [major, minor, patch] = currentVersion.split('.').map(Number);
}

// Calculate new version
let newVersion;
if (isBeta) {
    // Creating or incrementing beta version
    if (isBetaVersion) {
        // Current is beta, increment beta number
        newVersion = `${major}.${minor}.${patch}-beta.${betaNumber + 1}`;
    } else {
        // Current is stable, create new beta version
        switch (versionType) {
            case 'major':
                newVersion = `${major + 1}.0.0-beta.1`;
                break;
            case 'minor':
                newVersion = `${major}.${minor + 1}.0-beta.1`;
                break;
            case 'patch':
                newVersion = `${major}.${minor}.${patch + 1}-beta.1`;
                break;
        }
    }
} else {
    // Creating stable version
    if (isBetaVersion) {
        // Promoting beta to stable (remove beta suffix)
        newVersion = `${major}.${minor}.${patch}`;
    } else {
        // Standard version bump
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
    }
}

// Write new version
writeFileSync(versionFilePath, newVersion);

console.log(`🔢 Version bumped: ${currentVersion} → ${newVersion}`);
console.log(`📝 Updated VERSION file to ${newVersion}`);

if (isBeta) {
    console.log('💡 Run "npm run beta:prepare" to prepare beta release');
} else {
    console.log('💡 Run "npm run publish:safe" to publish this version');
} 