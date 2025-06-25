#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * Script to help set up GitHub Actions for automated publishing
 */

async function main() {
    console.log(chalk.blue.bold('🔧 GitHub Actions Setup Helper\n'));

    console.log(chalk.cyan('This script will guide you through setting up GitHub Actions for automated npm publishing.\n'));

    // Step 1: Check if user is logged into npm
    console.log(chalk.yellow('📋 Step 1: npm Authentication Setup'));
    console.log('First, you need to create an npm access token.\n');

    const { hasNpmAccount } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'hasNpmAccount',
            message: 'Do you have an npm account and are you logged in locally?',
            default: true
        }
    ]);

    if (!hasNpmAccount) {
        console.log(chalk.red('\n❌ You need an npm account first!'));
        console.log(chalk.cyan('\n📝 To create an npm account:'));
        console.log('1. Go to https://www.npmjs.com/signup');
        console.log('2. Create your account');
        console.log('3. Run: npm login');
        console.log('4. Then run this script again\n');
        process.exit(1);
    }

    // Step 2: Guide through npm token creation
    console.log(chalk.yellow('\n📋 Step 2: Create npm Access Token'));
    console.log(chalk.cyan('Follow these steps to create an npm token:\n'));

    console.log('1. Go to https://www.npmjs.com/settings/tokens');
    console.log('2. Click "Generate New Token" → "Classic Token"');
    console.log('3. Select "Automation" (for CI/CD use)');
    console.log('4. Copy the generated token (it starts with "npm_")');
    console.log(chalk.red('5. ⚠️  Save it now - you won\'t see it again!\n'));

    const { hasToken } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'hasToken',
            message: 'Have you created and copied your npm token?',
            default: false
        }
    ]);

    if (!hasToken) {
        console.log(chalk.yellow('\n⏸️  Please create your npm token first, then run this script again.'));
        process.exit(0);
    }

    // Step 3: GitHub repository setup
    console.log(chalk.yellow('\n📋 Step 3: Add Secret to GitHub Repository'));
    console.log(chalk.cyan('Now add the token to your GitHub repository:\n'));

    console.log('1. Go to your GitHub repository');
    console.log('2. Click Settings → Secrets and variables → Actions');
    console.log('3. Click "New repository secret"');
    console.log('4. Name: NPM_TOKEN');
    console.log('5. Value: [paste your npm token]');
    console.log('6. Click "Add secret"\n');

    const { hasAddedSecret } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'hasAddedSecret',
            message: 'Have you added the NPM_TOKEN secret to your GitHub repository?',
            default: false
        }
    ]);

    if (!hasAddedSecret) {
        console.log(chalk.yellow('\n⏸️  Please add the NPM_TOKEN secret to GitHub, then you can test publishing.'));
        process.exit(0);
    }

    // Step 4: Optional environment setup
    console.log(chalk.yellow('\n📋 Step 4: Environment Protection (Optional but Recommended)'));
    console.log(chalk.cyan('For extra security, set up environment protection:\n'));

    console.log('1. Go to your GitHub repository');
    console.log('2. Click Settings → Environments');
    console.log('3. Click "New environment"');
    console.log('4. Name it: npm-publish');
    console.log('5. Add protection rules:');
    console.log('   - Required reviewers: Add yourself or team members');
    console.log('   - Deployment branches: main (optional)');
    console.log('6. Save the environment\n');

    const { wantsEnvironment } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'wantsEnvironment',
            message: 'Do you want to set up environment protection now?',
            default: true
        }
    ]);

    if (wantsEnvironment) {
        console.log(chalk.cyan('\n💡 After setting up the environment protection, your workflow will require approval before publishing.'));
        console.log(chalk.gray('This adds an extra safety layer for production releases.\n'));
    } else {
        console.log(chalk.cyan('\n💡 You can set up environment protection later in GitHub repository settings.'));
        console.log(chalk.gray('For now, publishing will happen automatically when you push version tags.\n'));
    }

    // Step 5: Test instructions
    console.log(chalk.green.bold('\n🎉 Setup Complete!'));
    console.log(chalk.cyan('\n🧪 To test your setup:'));
    console.log('1. Run: npm run release:prepare:dry-run');
    console.log('2. If that works, try: npm run release:prepare');
    console.log('3. Monitor GitHub Actions at: https://github.com/[username]/[repo]/actions\n');

    console.log(chalk.yellow('📋 Troubleshooting:'));
    console.log('- If you get authentication errors, check that NPM_TOKEN secret exists');
    console.log('- If publishing fails, verify your npm token has "Automation" scope');
    console.log('- For environment protection issues, check the environment name matches "npm-publish"\n');

    console.log(chalk.green('✅ Your GitHub Actions workflow is ready to automate npm publishing!'));
}

main().catch(error => {
    console.error(chalk.red('\n💥 Setup failed:', error.message));
    process.exit(1);
}); 