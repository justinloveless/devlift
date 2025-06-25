import inquirer from 'inquirer';
import { execa } from 'execa';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { Config } from './config.js';

interface SetupStep {
    name: string;
    type: 'shell' | 'package-manager';
    command: string;
    depends_on?: string[];
    manager?: string;
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
            if (step.type === 'shell') {
                await this.#handleShellStep(step);
            } else if (step.type === 'package-manager') {
                await this.#handlePackageManagerStep(step);
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
} 