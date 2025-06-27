import { Command } from 'commander';
import { simpleGit } from 'simple-git';
import { getInputType } from '../utils/validation.js';
import { getClonePath } from '../utils/path.js';
import { loadConfig, Config } from '../core/config.js';
import { ExecutionEngine } from '../core/execution-engine.js';
import { DependencyResolver } from '../core/dependency-resolver.js';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';

/**
 * Parse choices string into a Map
 * Format: "choice1=value1,choice2=value2"
 */
function parseChoices(choicesString?: string): Map<string, string> {
    const choices = new Map<string, string>();

    if (!choicesString) {
        return choices;
    }

    const pairs = choicesString.split(',');
    for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
            choices.set(key.trim(), value.trim());
        }
    }

    return choices;
}

const lift = new Command('lift')
    .alias('install')
    .description('Lift a repository into a local development environment')
    .argument('<repo_url_or_path>', 'The URL of the repository to lift or path to local repository')
    .option('-y, --yes', 'Skip all interactive prompts')
    .option('-c, --choices <choices>', 'Pre-specify choice responses (format: "choice1=value1,choice2=value2")')
    .action(async (repoInput: string, options: { yes?: boolean; choices?: string }) => {
        // 1. Determine input type and validate
        const inputType = getInputType(repoInput);
        if (inputType === 'invalid') {
            throw new Error('Invalid input. Please provide either a valid Git repository URL or an existing local directory path.');
        }

        let workingPath: string;

        try {
            if (inputType === 'url') {
                // 2a. Clone remote repository
                workingPath = getClonePath(repoInput);
                console.log(chalk.blue(`Cloning into ${workingPath}...`));
                await simpleGit().clone(repoInput, workingPath);
            } else {
                // 2b. Use existing local repository
                workingPath = path.resolve(repoInput);
                console.log(chalk.blue(`Using local repository at ${workingPath}...`));

                // Check if it's a git repository
                const isGitRepo = fs.pathExistsSync(path.join(workingPath, '.git'));
                if (!isGitRepo) {
                    console.log(chalk.yellow('Warning: This directory is not a Git repository.'));
                }
            }

            // 3. Load and validate config
            console.log(chalk.blue('Looking for dev.yml...'));
            let config: Config | null = loadConfig(workingPath);
            if (!config) {
                console.log(chalk.yellow('No dev.yml configuration found.'));

                if (fs.pathExistsSync(path.join(workingPath, 'package.json'))) {
                    console.log(chalk.blue('Found package.json. Inferring setup steps...'));
                    config = {
                        version: '1',
                        setup_steps: [
                            {
                                name: 'Install npm dependencies',
                                type: 'package-manager',
                                command: 'install'
                            }
                        ]
                    };
                } else {
                    const { proceed } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'proceed',
                            message: 'Would you like to create a new configuration file for this project?',
                            default: true,
                        },
                    ]);

                    if (proceed) {
                        // Future step: call the 'init' command's logic here
                        console.log('Proceeding to create a new config...');
                    } else {
                        console.log('Setup aborted.');
                    }
                    return;
                }
            }

            // 4. Parse choices
            const prespecifiedChoices = parseChoices(options.choices);

            // 5. Resolve dependencies first
            console.log(chalk.blue('Configuration found. Starting setup...'));
            const dependencyResolver = new DependencyResolver();
            const resolvedDependencies = await dependencyResolver.resolveDependencies(config, workingPath);

            // 6. Set up dependencies first
            if (resolvedDependencies.length > 0) {
                console.log(chalk.blue(`🔧 Setting up ${resolvedDependencies.length} dependencies...`));
                for (const dependency of resolvedDependencies) {
                    if (dependency.config) {
                        console.log(chalk.cyan(`⚙️  Setting up dependency: ${dependency.name}`));
                        const depEngine = new ExecutionEngine(dependency.config, dependency.path, prespecifiedChoices, options.yes);
                        await depEngine.run();
                        console.log(chalk.green(`✅ Dependency setup complete: ${dependency.name}`));
                    } else {
                        console.log(chalk.yellow(`⚠️  No dev.yml found for dependency: ${dependency.name}`));
                    }
                }
                console.log(chalk.green('🎉 All dependencies set up successfully!'));
            }

            // 7. Run execution engine for main project
            console.log(chalk.blue('🚀 Setting up main project...'));
            const engine = new ExecutionEngine(config, workingPath, prespecifiedChoices, options.yes);
            await engine.run();

            console.log(chalk.green('✅ Setup complete!'));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`An error occurred: ${errorMessage}`));
            throw error;
        }
    });

export default lift; 