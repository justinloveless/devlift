#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    // Read version from VERSION file
    const versionFilePath = path.join(__dirname, '..', 'VERSION');
    const version = readFileSync(versionFilePath, 'utf-8').trim();

    console.log(`🚀 Preparing to publish version ${version}...`);

    // 1. Sync version with package.json
    console.log('📝 Syncing version...');
    execSync('node scripts/version-sync.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    // 2. Build the project
    console.log('🔨 Building project...');
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    // 3. Run tests
    console.log('🧪 Running tests...');
    execSync('npm test', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    // 4. Publish
    console.log('📦 Publishing to npm...');
    execSync('npm publish', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    console.log(`✅ Successfully published version ${version}!`);

} catch (error) {
    console.error('❌ Publishing failed:', error.message);
    process.exit(1);
} 