#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Comprehensive publishing script that:
 * 1. Prompts for version bump type
 * 2. Bumps the version
 * 3. Runs tests
 * 4. If tests pass, publishes
 * 5. If tests fail, reverts version and aborts
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
    if (isDryRun && (command.includes('publish') || command.includes('git'))) {
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

async function main() {
    console.log(chalk.blue.bold(`🚀 DevLift Publishing Workflow${isDryRun ? ' (DRY RUN)' : ''}\n`));

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

    // Confirm the publishing process
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Ready to bump ${bumpType} version, run tests, and ${isDryRun ? 'simulate publish' : 'publish'}?`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log(chalk.yellow('📦 Publishing cancelled'));
        process.exit(0);
    }

    console.log(chalk.green(`\n✨ Starting ${isDryRun ? 'dry-run ' : ''}publishing workflow...\n`));

    // Step 1: Bump version
    if (!runCommand(`npm run version:bump -- ${bumpType}`, `Bumping ${bumpType} version`)) {
        process.exit(1);
    }

    const newVersion = getCurrentVersion();
    console.log(chalk.green(`✅ Version ${isDryRun ? 'would be ' : ''}bumped to ${newVersion}\n`));

    // Step 2: Run tests
    console.log(chalk.cyan('🧪 Running test suite...'));
    const testsPass = runCommand('npm test', 'Running tests');

    if (!testsPass) {
        console.log(chalk.red('\n❌ Tests failed! Aborting publish and reverting version.'));
        revertVersion(currentVersion);
        console.log(chalk.red('\n💥 Publishing aborted due to test failures.'));
        process.exit(1);
    }

    console.log(chalk.green('✅ All tests passed!\n'));

    // Step 3: Build the project (if needed)
    if (!runCommand('npm run build', 'Building project')) {
        console.log(chalk.red('\n❌ Build failed! Aborting publish and reverting version.'));
        revertVersion(currentVersion);
        process.exit(1);
    }

    console.log(chalk.green('✅ Build completed!\n'));

    // Step 4: Publish
    if (!runCommand('npm run publish:safe', 'Publishing to npm')) {
        console.log(chalk.red('\n❌ Publishing failed! Version has been bumped but not published.'));
        console.log(chalk.yellow('💡 You may want to manually revert the version or try publishing again.'));
        process.exit(1);
    }

    // Step 5: Success!
    console.log(chalk.green.bold(`\n🎉 Successfully ${isDryRun ? 'simulated publishing' : 'published'} version ${newVersion}!`));
    if (!isDryRun) {
        console.log(chalk.gray('📦 Package is now available on npm'));
    }

    // Optional: Create git tag
    const { createTag } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'createTag',
            message: `${isDryRun ? 'Simulate creating' : 'Create'} a git tag for this release?`,
            default: true
        }
    ]);

    if (createTag) {
        if (runCommand(`git tag v${newVersion}`, `Creating git tag v${newVersion}`)) {
            console.log(chalk.green(`✅ ${isDryRun ? 'Would create' : 'Created'} git tag v${newVersion}`));

            const { pushTag } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'pushTag',
                    message: `${isDryRun ? 'Simulate pushing' : 'Push'} the tag to remote?`,
                    default: true
                }
            ]);

            if (pushTag) {
                runCommand(`git push origin v${newVersion}`, 'Pushing tag to remote');
                console.log(chalk.green(`✅ Tag ${isDryRun ? 'would be' : ''} pushed to remote`));
            }
        }
    }

    console.log(chalk.green.bold(`\n🚀 Publishing workflow ${isDryRun ? 'simulation ' : ''}completed successfully!`));

    if (isDryRun) {
        console.log(chalk.yellow('\n💡 This was a dry run. To actually publish, run: npm run release'));
        // Revert version changes made during dry run
        revertVersion(currentVersion);
    }
}

main().catch(error => {
    console.error(chalk.red('💥 Publishing workflow failed:', error.message));
    process.exit(1);
}); 