import { Command } from 'commander';
import simpleGit from 'simple-git';
import { isValidGitUrl } from '../utils/validation.js';
import { getClonePath } from '../utils/path.js';
import { loadConfig } from '../core/config.js';
import { ExecutionEngine } from '../core/execution-engine.js';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';

const lift = new Command('lift')
    .description('Lift a repository into a local development environment')
    .argument('<repo_url>', 'The URL of the repository to lift')
    .option('-y, --yes', 'Skip all interactive prompts')
    .action(async (repoUrl, options) => {
        // 1. Validate URL
        if (!isValidGitUrl(repoUrl)) {
            throw new Error('Invalid Git repository URL.');
        }

        try {
            // 2. Determine clone path and clone repo
            const clonePath = getClonePath(repoUrl);
            console.log(chalk.blue(`Cloning into ${clonePath}...`));
            await simpleGit().clone(repoUrl, clonePath);

            // 3. Load and validate config
            console.log(chalk.blue('Looking for dev.yml...'));
            let config = loadConfig(clonePath);
            if (!config) {
                console.log(chalk.yellow('No dev.yml configuration found.'));

                if (fs.pathExistsSync(path.join(clonePath, 'package.json'))) {
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

            // 4. Run execution engine
            console.log(chalk.blue('Configuration found. Starting setup...'));
            const engine = new ExecutionEngine(config, clonePath);
            await engine.run();

            console.log(chalk.green('✅ Setup complete!'));
        } catch (error) {
            console.error(chalk.red(`An error occurred: ${error.message}`));
            throw error;
        }
    });

export default lift; 