import inquirer from 'inquirer';
import { execa } from 'execa';
import chalk from 'chalk';

export class ExecutionEngine {
    constructor(config, directory) {
        this.config = config;
        this.directory = directory;
    }

    async run() {
        if (!this.config.setup) {
            return;
        }

        for (const step of this.config.setup) {
            if (step.type === 'shell') {
                await this.#handleShellStep(step);
            }
        }
    }

    async #handleShellStep(step) {
        console.log(chalk.cyan(`\nRunning shell command: ${step.description || step.command}`));

        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Execute the following command?\n  ${step.command}`,
                default: true,
            },
        ]);

        if (proceed) {
            await execa(step.command, {
                cwd: this.directory,
                stdio: 'inherit',
                shell: true,
            });
        } else {
            console.log(chalk.yellow('Skipped.'));
        }
    }
} 