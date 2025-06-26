import inquirer from 'inquirer';
import { execa } from 'execa';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { Config } from './config.js';

interface SetupStep {
    name: string;
    type: 'shell' | 'package-manager' | 'docker-compose' | 'docker' | 'database' | 'service';
    command: string;
    depends_on?: string[];
    manager?: string;
    service?: string;
    file?: string;
}

export class ExecutionEngine {
    private config: Config;
    private directory: string;

    constructor(config: Config, directory: string) {
        this.config = config;
        this.directory = directory;
    }

    async run(): Promise<void> {
        // Handle both 'setup' and 'setup_steps' for backward compatibility
        const steps = (this.config as any).setup || this.config.setup_steps;

        if (!steps) {
            return;
        }

        const sortedSteps = this.#topologicalSort(steps);

        for (const step of sortedSteps) {
            switch (step.type) {
                case 'shell':
                    await this.#handleShellStep(step);
                    break;
                case 'package-manager':
                    await this.#handlePackageManagerStep(step);
                    break;
                case 'docker-compose':
                    await this.#handleDockerComposeStep(step);
                    break;
                case 'docker':
                    await this.#handleDockerStep(step);
                    break;
                case 'database':
                    await this.#handleDatabaseStep(step);
                    break;
                case 'service':
                    await this.#handleServiceStep(step);
                    break;
                default:
                    this.#log(`Unknown step type: ${step.type}`, 'yellow');
            }
        }
    }

    #log(message: string, color: keyof typeof chalk = 'cyan'): void {
        const colorFn = chalk[color] as (text: string) => string;
        console.log(colorFn(message));
    }

    #determinePackageManager(step: SetupStep): string {
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

    async #handlePackageManagerStep(step: SetupStep): Promise<void> {
        const manager = this.#determinePackageManager(step);
        const command = `${manager} ${step.command}`;

        this.#log(`\nRunning command: ${command}`);

        await execa(command, {
            cwd: this.directory,
            stdio: 'inherit',
        });
    }

    #topologicalSort(steps: SetupStep[]): SetupStep[] {
        const graph = new Map<string, string[]>();
        const inDegree = new Map<string, number>();
        const stepMap = new Map(steps.map(step => [step.name, step]));

        for (const step of steps) {
            graph.set(step.name, []);
            inDegree.set(step.name, 0);
        }

        for (const step of steps) {
            if (step.depends_on) {
                for (const depName of step.depends_on) {
                    graph.get(depName)?.push(step.name);
                    inDegree.set(step.name, (inDegree.get(step.name) || 0) + 1);
                }
            }
        }

        const queue: string[] = [];
        for (const [name, degree] of inDegree.entries()) {
            if (degree === 0) {
                queue.push(name);
            }
        }

        const sorted: SetupStep[] = [];
        while (queue.length > 0) {
            const name = queue.shift()!;
            const step = stepMap.get(name);
            if (step) {
                sorted.push(step);
            }

            const neighbors = graph.get(name) || [];
            for (const neighbor of neighbors) {
                inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
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

    async #handleShellStep(step: SetupStep): Promise<void> {
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

    async #handleDockerComposeStep(step: SetupStep): Promise<void> {
        this.#log(`\nRunning Docker Compose: ${step.name}`);

        // Check if docker-compose.yml exists
        const composeFile = step.file || 'docker-compose.yml';
        const composePath = path.join(this.directory, composeFile);

        if (!fs.pathExistsSync(composePath)) {
            this.#log(`Warning: ${composeFile} not found`, 'yellow');
        }

        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Execute Docker Compose command?\n  docker compose ${step.command}`,
                default: true,
            },
        ]);

        if (proceed) {
            await execa('docker', ['compose', ...step.command.split(' ')], {
                cwd: this.directory,
                stdio: 'inherit',
            });
        } else {
            this.#log('Skipped.', 'yellow');
        }
    }

    async #handleDockerStep(step: SetupStep): Promise<void> {
        this.#log(`\nRunning Docker command: ${step.name}`);

        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Execute Docker command?\n  docker ${step.command}`,
                default: true,
            },
        ]);

        if (proceed) {
            await execa('docker', step.command.split(' '), {
                cwd: this.directory,
                stdio: 'inherit',
            });
        } else {
            this.#log('Skipped.', 'yellow');
        }
    }

    async #handleDatabaseStep(step: SetupStep): Promise<void> {
        this.#log(`\nRunning database command: ${step.name}`);

        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Execute database command?\n  ${step.command}`,
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

    async #handleServiceStep(step: SetupStep): Promise<void> {
        this.#log(`\nManaging service: ${step.name}`);

        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Execute service command?\n  ${step.command}`,
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