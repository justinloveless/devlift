#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Release preparation script that:
 * 1. Prompts for version bump type
 * 2. Bumps the version
 * 3. Runs tests locally
 * 4. Creates and pushes git tag
 * 5. GitHub Actions handles the actual publishing
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

async function main() {
    console.log(chalk.blue.bold(`🚀 DevLift Release Preparation${isDryRun ? ' (DRY RUN)' : ''}\n`));

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
            console.log(chalk.yellow('📦 Release preparation cancelled'));
            process.exit(0);
        }
    }

    // Get current version
    const currentVersion = getCurrentVersion();
    console.log(chalk.gray(`Current version: ${currentVersion}`));

    // Prompt for version bump type
    const { bumpType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'bumpType',
            message: 'What type of version bump?',
            choices: [
                { name: 'Patch (bug fixes) - e.g., 1.0.0 → 1.0.1', value: 'patch' },
                { name: 'Minor (new features) - e.g., 1.0.0 → 1.1.0', value: 'minor' },
                { name: 'Major (breaking changes) - e.g., 1.0.0 → 2.0.0', value: 'major' }
            ]
        }
    ]);

    // Confirm the release preparation
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Ready to prepare ${bumpType} release? This will create a git tag and trigger GitHub Actions publishing.`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log(chalk.yellow('📦 Release preparation cancelled'));
        process.exit(0);
    }

    console.log(chalk.green(`\n✨ Starting ${isDryRun ? 'dry-run ' : ''}release preparation...\n`));

    // Step 1: Bump version
    if (!runCommand(`npm run version:bump -- ${bumpType}`, `Bumping ${bumpType} version`)) {
        process.exit(1);
    }

    const newVersion = getCurrentVersion();
    console.log(chalk.green(`✅ Version ${isDryRun ? 'would be ' : ''}bumped to ${newVersion}\n`));

    // Step 2: Run tests locally
    console.log(chalk.cyan('🧪 Running test suite locally...'));
    const testsPass = runCommand('npm test', 'Running tests');

    if (!testsPass) {
        console.log(chalk.red('\n❌ Tests failed! Aborting release and reverting version.'));
        revertVersion(currentVersion);
        console.log(chalk.red('\n💥 Release preparation aborted due to test failures.'));
        process.exit(1);
    }

    console.log(chalk.green('✅ All tests passed!\n'));

    // Step 3: Build locally to verify
    if (!runCommand('npm run build', 'Building project locally')) {
        console.log(chalk.red('\n❌ Build failed! Aborting release and reverting version.'));
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

    // Step 5: Create and push git tag
    if (!runCommand(`git tag v${newVersion}`, `Creating git tag v${newVersion}`)) {
        console.log(chalk.red('\n❌ Failed to create git tag'));
        process.exit(1);
    }

    console.log(chalk.green(`✅ ${isDryRun ? 'Would create' : 'Created'} git tag v${newVersion}`));

    // Push changes and tag
    if (!isDryRun) {
        if (!runCommand('git push origin main', 'Pushing version commit')) {
            console.log(chalk.red('\n❌ Failed to push version commit'));
            process.exit(1);
        }
    }

    if (!runCommand(`git push origin v${newVersion}`, 'Pushing tag to trigger GitHub Actions')) {
        console.log(chalk.red('\n❌ Failed to push tag'));
        process.exit(1);
    }

    // Success!
    console.log(chalk.green.bold(`\n🎉 Release v${newVersion} preparation completed!`));

    if (!isDryRun) {
        console.log(chalk.cyan('🚀 GitHub Actions will now handle the publishing process'));
        console.log(chalk.gray(`📋 Monitor the progress at: https://github.com/[your-username]/dev-cli/actions`));
        console.log(chalk.gray(`🏷️  Git tag pushed: v${newVersion}`));
    } else {
        console.log(chalk.yellow('\n💡 This was a dry run. To actually prepare the release, run: npm run release:prepare'));
        // Revert version changes made during dry run
        revertVersion(currentVersion);
    }
}

main().catch(error => {
    console.error(chalk.red('💥 Release preparation failed:', error.message));
    process.exit(1);
}); 