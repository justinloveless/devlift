#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Beta promotion script that:
 * 1. Shows available beta versions
 * 2. Allows user to select which beta to promote
 * 3. Removes -beta suffix and updates to stable version
 * 4. Creates stable release tag and publishes
 */

const isDryRun = process.argv.includes('--dry-run');

function runCommand(command, description, options = {}) {
    console.log(chalk.cyan(`🔄 ${description}...`));
    if (isDryRun && (command.includes('git push') || command.includes('git tag') || command.includes('npm publish'))) {
        console.log(chalk.yellow(`[DRY RUN] Would run: ${command}`));
        return { success: true, output: '' };
    }

    try {
        const output = execSync(command, {
            stdio: options.silent ? 'pipe' : 'inherit',
            encoding: 'utf8'
        });
        return { success: true, output };
    } catch (error) {
        console.error(chalk.red(`❌ ${description} failed`));
        if (options.silent) {
            console.error(chalk.red(error.message));
        }
        return { success: false, output: '' };
    }
}

function getCurrentVersion() {
    try {
        return fs.readFileSync('VERSION', 'utf8').trim();
    } catch (error) {
        console.error(chalk.red('❌ Could not read VERSION file'));
        process.exit(1);
    }
}

function getAvailableBetaVersions() {
    const result = runCommand('npm view devlift versions --json', 'Fetching available versions', { silent: true });

    if (!result.success) {
        console.error(chalk.red('❌ Failed to fetch available versions from npm'));
        return [];
    }

    try {
        const versions = JSON.parse(result.output);
        return versions.filter(version => version.includes('-beta.')).reverse(); // Most recent first
    } catch (error) {
        console.error(chalk.red('❌ Failed to parse version data'));
        return [];
    }
}

function getBetaDistTag() {
    const result = runCommand('npm view devlift dist-tags --json', 'Checking current beta tag', { silent: true });

    if (!result.success) {
        return null;
    }

    try {
        const tags = JSON.parse(result.output);
        return tags.beta;
    } catch (error) {
        return null;
    }
}

function getStableVersion(betaVersion) {
    return betaVersion.replace(/-beta\.\d+$/, '');
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
    console.log(chalk.blue.bold(`🚀 DevLift Beta Promotion${isDryRun ? ' (DRY RUN)' : ''}\n`));

    // Get current version
    const currentVersion = getCurrentVersion();
    console.log(chalk.gray(`Current local version: ${currentVersion}`));

    // Get available beta versions
    console.log(chalk.cyan('🔍 Fetching available beta versions...'));
    const betaVersions = getAvailableBetaVersions();

    if (betaVersions.length === 0) {
        console.log(chalk.yellow('⚠️  No beta versions found on npm'));
        console.log(chalk.gray('Make sure you have published beta versions first with: npm run beta:prepare'));
        process.exit(0);
    }

    // Get current beta tag
    const currentBetaTag = getBetaDistTag();
    console.log(chalk.gray(`Current beta tag points to: ${currentBetaTag || 'none'}\n`));

    // Show available beta versions
    const choices = betaVersions.map(version => ({
        name: `${version}${version === currentBetaTag ? ' (current beta)' : ''}`,
        value: version
    }));

    const { selectedBeta } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedBeta',
            message: 'Which beta version would you like to promote to stable?',
            choices: choices
        }
    ]);

    const stableVersion = getStableVersion(selectedBeta);

    // Check if stable version already exists
    const checkResult = runCommand(`npm view devlift@${stableVersion} version`, 'Checking if stable version exists', { silent: true });
    if (checkResult.success) {
        console.log(chalk.red(`❌ Stable version ${stableVersion} already exists on npm`));
        process.exit(1);
    }

    // Confirm promotion
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Promote ${selectedBeta} → ${stableVersion} as the new stable release?`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log(chalk.yellow('📦 Beta promotion cancelled'));
        process.exit(0);
    }

    console.log(chalk.green(`\n✨ Starting ${isDryRun ? 'dry-run ' : ''}beta promotion...\n`));

    // Step 1: Update local version to stable
    updateVersionFile(stableVersion);
    console.log(chalk.green(`✅ Version ${isDryRun ? 'would be ' : ''}updated to ${stableVersion}`));

    // Step 2: Run tests to make sure everything still works
    console.log(chalk.cyan('🧪 Running test suite...'));
    const testsPass = runCommand('npm test', 'Running tests');

    if (!testsPass.success) {
        console.log(chalk.red('\n❌ Tests failed! Aborting promotion.'));
        updateVersionFile(currentVersion); // Revert
        process.exit(1);
    }

    console.log(chalk.green('✅ All tests passed!'));

    // Step 3: Build
    const buildResult = runCommand('npm run build', 'Building project');
    if (!buildResult.success) {
        console.log(chalk.red('\n❌ Build failed! Aborting promotion.'));
        updateVersionFile(currentVersion); // Revert
        process.exit(1);
    }

    console.log(chalk.green('✅ Build completed!'));

    // Step 4: Commit stable version
    if (!isDryRun) {
        runCommand('git add VERSION package.json', 'Staging version changes');
        runCommand(`git commit -m "Promote ${selectedBeta} to stable ${stableVersion}"`, 'Committing stable version');
    }

    // Step 5: Create stable tag
    const stableTag = `v${stableVersion}`;
    runCommand(`git tag ${stableTag}`, `Creating stable tag ${stableTag}`);

    // Step 6: Push changes and tag
    if (!isDryRun) {
        runCommand('git push origin main', 'Pushing version commit');
    }
    runCommand(`git push origin ${stableTag}`, 'Pushing stable tag');

    // Step 7: Publish stable version (GitHub Actions will handle this, but we could also do it here)
    console.log(chalk.cyan('📦 Publishing stable version...'));
    const publishResult = runCommand('npm publish --access public', 'Publishing to npm');

    if (!publishResult.success) {
        console.log(chalk.red('❌ Failed to publish stable version'));
        process.exit(1);
    }

    // Step 8: Update dist-tags
    console.log(chalk.cyan('🏷️  Updating dist-tags...'));
    runCommand(`npm dist-tag add devlift@${stableVersion} latest`, 'Setting as latest');

    // Success!
    console.log(chalk.green.bold(`\n🎉 Successfully promoted ${selectedBeta} to stable ${stableVersion}!`));

    if (!isDryRun) {
        console.log(chalk.cyan('\n📦 Stable version is now available:'));
        console.log(chalk.gray(`   npm install -g devlift@latest`));
        console.log(chalk.gray(`   npm install -g devlift@${stableVersion}`));
        console.log(chalk.cyan('\n🏷️  Current dist-tags:'));
        console.log(chalk.gray(`   latest: ${stableVersion}`));
        console.log(chalk.gray(`   beta: ${currentBetaTag || 'none'}`));
        console.log(chalk.cyan(`\n🔗 GitHub release: https://github.com/justinloveless/devlift/releases/tag/${stableTag}`));
    } else {
        console.log(chalk.yellow(`[DRY RUN] Would have promoted ${selectedBeta} to stable ${stableVersion}`));
    }
}

main().catch(error => {
    console.error(chalk.red('❌ Beta promotion failed:'), error);
    process.exit(1);
}); 