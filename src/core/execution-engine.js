import inquirer from 'inquirer';
import { execa } from 'execa';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export class ExecutionEngine {
    constructor(config, directory) {
        this.config = config;
        this.directory = directory;
    }

    async run() {
        if (!this.config.setup_steps) {
            return;
        }

        const sortedSteps = this.#topologicalSort(this.config.setup_steps);

        for (const step of sortedSteps) {
            if (step.type === 'shell') {
                await this.#handleShellStep(step);
            } else if (step.type === 'package-manager') {
                await this.#handlePackageManagerStep(step);
            }
        }
    }

    #log(message, color = 'cyan') {
        console.log(chalk[color](message));
    }

    #determinePackageManager(step) {
        if (step.manager) {
            return step.manager;
        }

        if (fs.pathExistsSync(path.join(this.directory, 'pnpm-lock.yaml'))) {
            return 'pnpm';
        }

        if (fs.pathExistsSync(path.join(this.directory, 'yarn.lock'))) {
            return 'yarn';
        }

        return 'npm';
    }

    async #handlePackageManagerStep(step) {
        const manager = this.#determinePackageManager(step);
        const command = `${manager} ${step.command}`;

        this.#log(`\nRunning command: ${command}`);

        await execa(command, {
            cwd: this.directory,
            stdio: 'inherit',
        });
    }

    #topologicalSort(steps) {
        const graph = new Map();
        const inDegree = new Map();
        const stepMap = new Map(steps.map(step => [step.name, step]));

        for (const step of steps) {
            graph.set(step.name, []);
            inDegree.set(step.name, 0);
        }

        for (const step of steps) {
            if (step.depends_on) {
                for (const depName of step.depends_on) {
                    graph.get(depName).push(step.name);
                    inDegree.set(step.name, inDegree.get(step.name) + 1);
                }
            }
        }

        const queue = [];
        for (const [name, degree] of inDegree.entries()) {
            if (degree === 0) {
                queue.push(name);
            }
        }

        const sorted = [];
        while (queue.length > 0) {
            const name = queue.shift();
            sorted.push(stepMap.get(name));

            for (const neighbor of graph.get(name)) {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        if (sorted.length !== steps.length) {
            throw new Error('Circular dependency detected in setup steps.');
        }

        return sorted;
    }

    async #handleShellStep(step) {
        this.#log(`\nRunning shell command: ${step.name}`);

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
            this.#log('Skipped.', 'yellow');
        }
    }
} 