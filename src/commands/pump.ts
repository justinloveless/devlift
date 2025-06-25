import { Command } from 'commander';
import { execa } from 'execa';
import chalk from 'chalk';
import inquirer from 'inquirer';

interface PackageInfo {
    version: string;
    name: string;
}

interface NpmViewResult {
    version: string;
    versions: string[];
}

/**
 * Gets the currently installed version of devlift
 */
async function getCurrentVersion(): Promise<string> {
    try {
        const { stdout } = await execa('npm', ['list', '-g', 'devlift', '--depth=0', '--json']);
        const result = JSON.parse(stdout);
        return result.dependencies?.devlift?.version || 'unknown';
    } catch (error) {
        // If not installed globally, try getting version from package.json
        try {
            const { stdout } = await execa('npm', ['view', 'devlift', 'version']);
            return stdout.trim();
        } catch {
            throw new Error('Could not determine current devlift version');
        }
    }
}

/**
 * Gets the latest available version of devlift from npm
 */
async function getLatestVersion(): Promise<string> {
    try {
        const { stdout } = await execa('npm', ['view', 'devlift', 'version']);
        return stdout.trim();
    } catch (error) {
        throw new Error('Could not fetch latest devlift version from npm');
    }
}

/**
 * Compares two semantic version strings
 */
function compareVersions(current: string, latest: string): 'outdated' | 'current' | 'ahead' {
    // Remove 'v' prefix if present
    const cleanCurrent = current.replace(/^v/, '');
    const cleanLatest = latest.replace(/^v/, '');

    if (cleanCurrent === cleanLatest) {
        return 'current';
    }

    const currentParts = cleanCurrent.split('.').map(Number);
    const latestParts = cleanLatest.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const latestPart = latestParts[i] || 0;

        if (currentPart < latestPart) {
            return 'outdated';
        } else if (currentPart > latestPart) {
            return 'ahead';
        }
    }

    return 'current';
}

/**
 * Updates devlift to the latest version
 */
async function updateDevlift(): Promise<void> {
    console.log(chalk.blue('💪 Pumping up devlift to the latest version...'));

    try {
        await execa('npm', ['install', '-g', 'devlift@latest'], {
            stdio: 'inherit'
        });
        console.log(chalk.green('🏋️  Pump complete! DevLift is now at maximum strength! 💪'));
    } catch (error) {
        throw new Error(`Failed to update devlift: ${error instanceof Error ? error.message : String(error)}`);
    }
}

const pump = new Command('pump')
    .description('Pump up devlift to the latest version (auto-update)')
    .option('-f, --force', 'Force update even if already on latest version')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--check-only', 'Only check for updates, don\'t install')
    .action(async (options: { force?: boolean; yes?: boolean; checkOnly?: boolean }) => {
        try {
            console.log(chalk.blue('🔍 Checking devlift muscle mass (current version)...'));

            const currentVersion = await getCurrentVersion();
            console.log(chalk.cyan(`Current version: ${currentVersion}`));

            console.log(chalk.blue('🔍 Scouting the gym for latest gains (checking npm)...'));
            const latestVersion = await getLatestVersion();
            console.log(chalk.cyan(`Latest version: ${latestVersion}`));

            const comparison = compareVersions(currentVersion, latestVersion);

            if (comparison === 'current' && !options.force) {
                console.log(chalk.green('💪 You\'re already pumped up! DevLift is at maximum strength.'));
                console.log(chalk.gray('Use --force to reinstall the current version.'));
                return;
            }

            if (comparison === 'ahead') {
                console.log(chalk.yellow('🚀 Whoa! You\'re ahead of the game! Running a pre-release version.'));
                if (!options.force) {
                    console.log(chalk.gray('Use --force to downgrade to the latest stable version.'));
                    return;
                }
            }

            if (comparison === 'outdated') {
                console.log(chalk.yellow(`📈 Time to level up! A new version is available: ${currentVersion} → ${latestVersion}`));
            }

            if (options.checkOnly) {
                console.log(chalk.blue('👀 Check complete! Use "dev pump" (without --check-only) to update.'));
                return;
            }

            // Confirm update unless --yes flag is used
            if (!options.yes) {
                const { shouldUpdate } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'shouldUpdate',
                        message: options.force
                            ? `Force reinstall devlift@${latestVersion}?`
                            : `Ready to pump up to devlift@${latestVersion}?`,
                        default: true,
                    },
                ]);

                if (!shouldUpdate) {
                    console.log(chalk.yellow('💤 Skipping pump session. Your gains can wait!'));
                    return;
                }
            }

            await updateDevlift();

            // Verify the update
            console.log(chalk.blue('🏅 Flexing new muscles (verifying update)...'));
            const newVersion = await getCurrentVersion();
            console.log(chalk.green(`✅ Successfully pumped up to version ${newVersion}!`));

            if (comparison === 'outdated') {
                console.log(chalk.magenta('\n🎉 Pump session complete! Here\'s what\'s new:'));
                console.log(chalk.cyan(`   Check the changelog: https://github.com/your-username/devlift/releases/tag/v${latestVersion}`));
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`💥 Pump session failed: ${errorMessage}`));
            console.error(chalk.yellow('\n🔧 Troubleshooting tips:'));
            console.error(chalk.gray('• Make sure you have npm installed and configured'));
            console.error(chalk.gray('• Try running with sudo/administrator privileges'));
            console.error(chalk.gray('• Check your internet connection'));
            console.error(chalk.gray('• Ensure devlift was installed globally: npm install -g devlift'));
            throw error;
        }
    });

export default pump; 