#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Beta release preparation script that:
 * 1. Prompts for beta version type
 * 2. Creates a beta version (e.g., 1.1.0-beta.1)
 * 3. Runs tests locally
 * 4. Creates and pushes git tag with beta- prefix
 * 5. GitHub Actions handles the actual publishing to beta tag
 */

const isDryRun = process.argv.includes('--dry-run');

function getCurrentVersion() {
    try {
        return fs.readFileSync('VERSION', 'utf8').trim();
    } catch (error) {
        console.error(chalk.red('❌ Could not read VERSION file'));
        process.exit(1);
    }
}

function runCommand(command, description) {
    console.log(chalk.cyan(`🔄 ${description}...`));
    if (isDryRun && (command.includes('git push') || command.includes('git tag'))) {
        console.log(chalk.yellow(`[DRY RUN] Would run: ${command}`));
        return true;
    }

    try {
        execSync(command, { stdio: 'inherit' });
        return true;
    } catch (error) {
        console.error(chalk.red(`❌ ${description} failed`));
        return false;
    }
}

function revertVersion(originalVersion) {
    if (isDryRun) {
        console.log(chalk.yellow(`[DRY RUN] Reverting version back to ${originalVersion}`));
        fs.writeFileSync('VERSION', originalVersion);
        execSync('npm run version:sync', { stdio: 'inherit' });
        return;
    }

    console.log(chalk.yellow(`⏪ Reverting version back to ${originalVersion}...`));
    fs.writeFileSync('VERSION', originalVersion);
    runCommand('npm run version:sync', 'Syncing reverted version');
}

function checkGitStatus() {
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        if (status.trim()) {
            console.log(chalk.yellow('⚠️  Warning: You have uncommitted changes:'));
            console.log(status);
            return false;
        }
        return true;
    } catch (error) {
        console.error(chalk.red('❌ Failed to check git status'));
        return false;
    }
}

function getNextBetaVersion(currentVersion, bumpType) {
    const parts = currentVersion.split('.');
    let [major, minor, patch] = parts.map(Number);

    // Check if current version is already a beta
    if (currentVersion.includes('-beta.')) {
        const [baseVersion, betaPart] = currentVersion.split('-beta.');
        const betaNumber = parseInt(betaPart) + 1;
        return `${baseVersion}-beta.${betaNumber}`;
    }

    // Create new beta version based on bump type
    switch (bumpType) {
        case 'patch':
            patch += 1;
            break;
        case 'minor':
            minor += 1;
            patch = 0;
            break;
        case 'major':
            major += 1;
            minor = 0;
            patch = 0;
            break;
    }

    return `${major}.${minor}.${patch}-beta.1`;
}

function updateVersionFile(newVersion) {
    if (isDryRun) {
        console.log(chalk.yellow(`[DRY RUN] Would update VERSION file to ${newVersion}`));
        return;
    }

    fs.writeFileSync('VERSION', newVersion);
    runCommand('npm run version:sync', 'Syncing new version to package.json');
}

async function main() {
    console.log(chalk.blue.bold(`🧪 DevLift Beta Release Preparation${isDryRun ? ' (DRY RUN)' : ''}\n`));

    // Check git status
    if (!checkGitStatus()) {
        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: 'Continue with uncommitted changes?',
                default: false
            }
        ]);

        if (!proceed) {
            console.log(chalk.yellow('📦 Beta release preparation cancelled'));
            process.exit(0);
        }
    }

    // Get current version
    const currentVersion = getCurrentVersion();
    console.log(chalk.gray(`Current version: ${currentVersion}`));

    // Determine if this is a new beta or increment existing beta
    const isBetaVersion = currentVersion.includes('-beta.');

    let bumpType;
    if (isBetaVersion) {
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Current version is already a beta. What would you like to do?',
                choices: [
                    { name: 'Increment beta number (e.g., 1.1.0-beta.1 → 1.1.0-beta.2)', value: 'increment' },
                    { name: 'Create new beta version', value: 'new' }
                ]
            }
        ]);

        if (action === 'increment') {
            bumpType = 'increment';
        } else {
            const { newBumpType } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'newBumpType',
                    message: 'What type of version bump for new beta?',
                    choices: [
                        { name: 'Patch beta (bug fixes) - e.g., 1.0.0-beta.1 → 1.0.1-beta.1', value: 'patch' },
                        { name: 'Minor beta (new features) - e.g., 1.0.0-beta.1 → 1.1.0-beta.1', value: 'minor' },
                        { name: 'Major beta (breaking changes) - e.g., 1.0.0-beta.1 → 2.0.0-beta.1', value: 'major' }
                    ]
                }
            ]);
            bumpType = newBumpType;
        }
    } else {
        const { newBumpType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'newBumpType',
                message: 'What type of beta version?',
                choices: [
                    { name: 'Patch beta (bug fixes) - e.g., 1.0.0 → 1.0.1-beta.1', value: 'patch' },
                    { name: 'Minor beta (new features) - e.g., 1.0.0 → 1.1.0-beta.1', value: 'minor' },
                    { name: 'Major beta (breaking changes) - e.g., 1.0.0 → 2.0.0-beta.1', value: 'major' }
                ]
            }
        ]);
        bumpType = newBumpType;
    }

    // Calculate new version
    const newVersion = getNextBetaVersion(currentVersion, bumpType);

    // Confirm the beta release preparation
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Ready to prepare beta release ${newVersion}? This will create a git tag and trigger GitHub Actions publishing to beta channel.`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log(chalk.yellow('📦 Beta release preparation cancelled'));
        process.exit(0);
    }

    console.log(chalk.green(`\n✨ Starting ${isDryRun ? 'dry-run ' : ''}beta release preparation...\n`));

    // Step 1: Update version
    updateVersionFile(newVersion);
    console.log(chalk.green(`✅ Version ${isDryRun ? 'would be ' : ''}updated to ${newVersion}\n`));

    // Step 2: Run tests locally
    console.log(chalk.cyan('🧪 Running test suite locally...'));
    const testsPass = runCommand('npm test', 'Running tests');

    if (!testsPass) {
        console.log(chalk.red('\n❌ Tests failed! Aborting beta release and reverting version.'));
        revertVersion(currentVersion);
        console.log(chalk.red('\n💥 Beta release preparation aborted due to test failures.'));
        process.exit(1);
    }

    console.log(chalk.green('✅ All tests passed!\n'));

    // Step 3: Build locally to verify
    if (!runCommand('npm run build', 'Building project locally')) {
        console.log(chalk.red('\n❌ Build failed! Aborting beta release and reverting version.'));
        revertVersion(currentVersion);
        process.exit(1);
    }

    console.log(chalk.green('✅ Build completed!\n'));

    // Step 4: Commit version changes (if not dry run)
    if (!isDryRun) {
        if (!runCommand('git add VERSION package.json', 'Staging version changes')) {
            revertVersion(currentVersion);
            process.exit(1);
        }

        if (!runCommand(`git commit -m "Bump version to ${newVersion}"`, 'Committing version changes')) {
            revertVersion(currentVersion);
            process.exit(1);
        }

        console.log(chalk.green('✅ Version changes committed!\n'));
    }

    // Step 5: Create and push git tag (with beta- prefix)
    const tagName = `beta-v${newVersion}`;
    if (!runCommand(`git tag ${tagName}`, `Creating git tag ${tagName}`)) {
        console.log(chalk.red('\n❌ Failed to create git tag'));
        process.exit(1);
    }

    console.log(chalk.green(`✅ ${isDryRun ? 'Would create' : 'Created'} git tag ${tagName}`));

    // Push changes and tag
    if (!isDryRun) {
        if (!runCommand('git push origin main', 'Pushing version commit')) {
            console.log(chalk.red('\n❌ Failed to push version commit'));
            process.exit(1);
        }
    }

    if (!runCommand(`git push origin ${tagName}`, 'Pushing tag to trigger GitHub Actions')) {
        console.log(chalk.red('\n❌ Failed to push tag'));
        process.exit(1);
    }

    // Success!
    console.log(chalk.green.bold(`\n🧪 Beta release v${newVersion} preparation completed!`));

    if (!isDryRun) {
        console.log(chalk.cyan('🚀 GitHub Actions will now handle the publishing process'));
        console.log(chalk.gray(`📋 Monitor the progress at: https://github.com/justinloveless/devlift/actions`));
        console.log(chalk.gray(`🏷️  Git tag pushed: ${tagName}`));
        console.log(chalk.gray(`📦 Beta will be available as: npm install -g devlift@beta`));
        console.log(chalk.gray(`🔗 Or specific version: npm install -g devlift@${newVersion}`));
    } else {
        console.log(chalk.yellow(`[DRY RUN] Would have created tag ${tagName} and triggered beta publishing`));
    }

    console.log(chalk.blue('\n💡 Tip: After testing, promote to stable with: npm run beta:promote'));
}

main().catch(error => {
    console.error(chalk.red('❌ Beta release preparation failed:'), error);
    process.exit(1);
}); 