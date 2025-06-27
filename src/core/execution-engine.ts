import inquirer from 'inquirer';
import { execa } from 'execa';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { Config } from './config.js';

interface Choice {
    name: string;
    value: string;
    actions: SetupStep[];
}

interface SetupStep {
    name: string;
    type: 'shell' | 'package-manager' | 'docker-compose' | 'docker' | 'database' | 'service' | 'choice';
    command?: string;
    depends_on?: string[];
    manager?: string;
    service?: string;
    file?: string;
    prompt?: string;
    choices?: Choice[];
}

export class ExecutionEngine {
    private config: Config;
    private directory: string;
    private prespecifiedChoices: Map<string, string>;
    private skipConfirmations: boolean;

    constructor(config: Config, directory: string, prespecifiedChoices?: Map<string, string>, skipConfirmations: boolean = false) {
        this.config = config;
        this.directory = directory;
        this.prespecifiedChoices = prespecifiedChoices || new Map();
        this.skipConfirmations = skipConfirmations;
    }

    #validatePrespecifiedChoices(): void {
        // Validate setup step choices
        const steps = (this.config as any).setup || this.config.setup_steps;
        if (steps) {
            this.#validateStepChoices(steps);
        }

        // Validate post-setup choices
        if (this.config.post_setup) {
            this.#validatePostSetupChoices(this.config.post_setup);
        }
    }

    #validateStepChoices(steps: SetupStep[]): void {
        for (const step of steps) {
            if (step.type === 'choice' && this.prespecifiedChoices.has(step.name)) {
                const prespecifiedChoice = this.prespecifiedChoices.get(step.name)!;
                const validChoice = step.choices?.find(c => c.value === prespecifiedChoice);

                if (!validChoice) {
                    const validChoices = step.choices?.map(c => c.value).join(', ') || '';
                    throw new Error(`Invalid pre-specified choice "${prespecifiedChoice}" for step "${step.name}". Valid choices are: ${validChoices}`);
                }

                // Recursively validate choices within this choice's actions
                if (validChoice.actions) {
                    this.#validateStepChoices(validChoice.actions);
                }
            }
        }
    }

    #validatePostSetupChoices(postSetupActions: any[]): void {
        for (const action of postSetupActions) {
            if (action.type === 'choice') {
                // Extract action name for post-setup choices (use a default if not available)
                const actionName = action.name || 'post-setup';

                if (this.prespecifiedChoices.has(actionName)) {
                    const prespecifiedChoice = this.prespecifiedChoices.get(actionName)!;
                    const validChoice = action.choices?.find((c: any) => c.value === prespecifiedChoice);

                    if (!validChoice) {
                        const validChoices = action.choices?.map((c: any) => c.value).join(', ') || '';
                        throw new Error(`Invalid pre-specified choice "${prespecifiedChoice}" for post-setup action "${actionName}". Valid choices are: ${validChoices}`);
                    }

                    // Recursively validate choices within this choice's actions
                    if (validChoice.actions) {
                        this.#validatePostSetupChoices(validChoice.actions);
                    }
                }
            }
        }
    }

    async run(): Promise<void> {
        // Validate all pre-specified choices upfront before executing any steps
        this.#validatePrespecifiedChoices();

        // Handle both 'setup' and 'setup_steps' for backward compatibility
        const steps = (this.config as any).setup || this.config.setup_steps;

        if (steps) {
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
                    case 'choice':
                        await this.#handleChoiceStep(step);
                        break;
                    default:
                        this.#log(`Unknown step type: ${step.type}`, 'yellow');
                }
            }
        }

        // Handle post-setup actions
        if (this.config.post_setup) {
            this.#log('\n🎉 Running post-setup actions...', 'green');
            for (const action of this.config.post_setup) {
                await this.#handlePostSetupAction(action);
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
        if (!step.command) {
            throw new Error(`Shell step "${step.name}" is missing a command`);
        }

        this.#log(`\nRunning shell command: ${step.name}`);

        let proceed = true;

        if (!this.skipConfirmations) {
            const result = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: `Execute the following command?\n  ${step.command}`,
                    default: true,
                },
            ]);
            proceed = result.proceed;
        }

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
        if (!step.command) {
            throw new Error(`Docker Compose step "${step.name}" is missing a command`);
        }

        this.#log(`\nRunning Docker Compose: ${step.name}`);

        // Check if docker-compose.yml exists
        const composeFile = step.file || 'docker-compose.yml';
        const composePath = path.join(this.directory, composeFile);

        if (!fs.pathExistsSync(composePath)) {
            this.#log(`Warning: ${composeFile} not found`, 'yellow');
        }

        let proceed = true;

        if (!this.skipConfirmations) {
            const result = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: `Execute Docker Compose command?\n  docker compose ${step.command}`,
                    default: true,
                },
            ]);
            proceed = result.proceed;
        }

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
        if (!step.command) {
            throw new Error(`Docker step "${step.name}" is missing a command`);
        }

        this.#log(`\nRunning Docker command: ${step.name}`);

        let proceed = true;

        if (!this.skipConfirmations) {
            const result = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: `Execute Docker command?\n  docker ${step.command}`,
                    default: true,
                },
            ]);
            proceed = result.proceed;
        }

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
        if (!step.command) {
            throw new Error(`Database step "${step.name}" is missing a command`);
        }

        this.#log(`\nRunning database command: ${step.name}`);

        let proceed = true;

        if (!this.skipConfirmations) {
            const result = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: `Execute database command?\n  ${step.command}`,
                    default: true,
                },
            ]);
            proceed = result.proceed;
        }

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
        if (!step.command) {
            throw new Error(`Service step "${step.name}" is missing a command`);
        }

        this.#log(`\nManaging service: ${step.name}`);

        let proceed = true;

        if (!this.skipConfirmations) {
            const result = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: `Execute service command?\n  ${step.command}`,
                    default: true,
                },
            ]);
            proceed = result.proceed;
        }

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

    async #handlePostSetupAction(action: any): Promise<void> {
        switch (action.type) {
            case 'message':
                if (action.content) {
                    this.#log(`\n📝 ${action.content}`, 'green');
                }
                break;
            case 'open':
                if (action.target === 'editor') {
                    const targetPath = action.path || '.';
                    const fullPath = path.resolve(this.directory, targetPath);
                    this.#log(`\n📂 Opening ${fullPath} in editor...`, 'blue');

                    try {
                        // Try to open with common editors
                        await execa('code', [fullPath], { cwd: this.directory });
                    } catch {
                        try {
                            await execa('subl', [fullPath], { cwd: this.directory });
                        } catch {
                            this.#log('Could not open editor automatically. Please open the project manually.', 'yellow');
                        }
                    }
                } else if (action.target === 'browser') {
                    const url = action.path || 'http://localhost:3000';
                    this.#log(`\n🌐 Opening ${url} in browser...`, 'blue');

                    try {
                        const command = process.platform === 'win32' ? 'start' :
                            process.platform === 'darwin' ? 'open' : 'xdg-open';
                        await execa(command, [url], { cwd: this.directory, shell: true });
                    } catch {
                        this.#log(`Could not open browser automatically. Please visit ${url} manually.`, 'yellow');
                    }
                }
                break;
            case 'choice':
                await this.#handlePostSetupChoice(action);
                break;
            default:
                this.#log(`Unknown post-setup action type: ${action.type}`, 'yellow');
        }
    }

    async #handlePostSetupChoice(action: any): Promise<void> {
        if (!action.prompt) {
            throw new Error(`Post-setup choice action is missing a prompt`);
        }

        if (!action.choices || action.choices.length === 0) {
            throw new Error(`Post-setup choice action is missing choices or has empty choices array`);
        }

        this.#log(`\n🤔 Post-setup choice`, 'cyan');

        let choice: string;

        // Check if a choice was pre-specified for this post-setup action
        // Use action.name if available, otherwise use "post-setup" as fallback
        const actionName = action.name || 'post-setup';
        const prespecifiedChoice = this.prespecifiedChoices.get(actionName);

        if (prespecifiedChoice) {
            // Choice is already validated in validatePrespecifiedChoices, so we can use it directly
            const validChoice = action.choices.find((c: any) => c.value === prespecifiedChoice)!;
            choice = prespecifiedChoice;
            this.#log(`\n🎯 Using pre-specified choice: ${validChoice.name}`, 'green');
        } else {
            // No pre-specified choice, prompt user interactively
            const result = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: action.prompt,
                    choices: action.choices.map((c: any) => ({ name: c.name, value: c.value }))
                }
            ]);
            choice = result.choice;
        }

        // Find the selected choice and execute its actions
        const selectedChoice = action.choices.find((c: any) => c.value === choice);
        if (selectedChoice && selectedChoice.actions.length > 0) {
            this.#log(`\n✨ Executing post-setup actions for: ${selectedChoice.name}`, 'green');

            // Execute all actions for the selected choice
            for (const subAction of selectedChoice.actions) {
                await this.#handlePostSetupAction(subAction);
            }
        } else if (selectedChoice) {
            this.#log(`\n⏭️  Skipping (no actions for: ${selectedChoice.name})`, 'yellow');
        }
    }

    async #handleChoiceStep(step: SetupStep): Promise<void> {
        if (!step.prompt) {
            throw new Error(`Choice step "${step.name}" is missing a prompt`);
        }

        if (!step.choices || step.choices.length === 0) {
            throw new Error(`Choice step "${step.name}" is missing choices or has empty choices array`);
        }

        this.#log(`\n🤔 ${step.name}`, 'cyan');

        let choice: string;

        // Check if a choice was pre-specified for this step
        const prespecifiedChoice = this.prespecifiedChoices.get(step.name);
        if (prespecifiedChoice) {
            // Choice is already validated in validatePrespecifiedChoices, so we can use it directly
            const validChoice = step.choices.find(c => c.value === prespecifiedChoice)!;
            choice = prespecifiedChoice;
            this.#log(`\n🎯 Using pre-specified choice: ${validChoice.name}`, 'green');
        } else {
            // No pre-specified choice, prompt user interactively
            const result = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: step.prompt,
                    choices: step.choices.map(c => ({ name: c.name, value: c.value }))
                }
            ]);
            choice = result.choice;
        }

        // Find the selected choice and execute its actions
        const selectedChoice = step.choices.find(c => c.value === choice);
        if (selectedChoice && selectedChoice.actions.length > 0) {
            this.#log(`\n✨ Executing actions for: ${selectedChoice.name}`, 'green');

            // Execute all actions for the selected choice
            for (const action of selectedChoice.actions) {
                // Recursively handle each action as if it's a regular step
                switch (action.type) {
                    case 'shell':
                        await this.#handleShellStep(action);
                        break;
                    case 'package-manager':
                        await this.#handlePackageManagerStep(action);
                        break;
                    case 'docker-compose':
                        await this.#handleDockerComposeStep(action);
                        break;
                    case 'docker':
                        await this.#handleDockerStep(action);
                        break;
                    case 'database':
                        await this.#handleDatabaseStep(action);
                        break;
                    case 'service':
                        await this.#handleServiceStep(action);
                        break;
                    case 'choice':
                        await this.#handleChoiceStep(action);
                        break;
                    default:
                        this.#log(`Unknown action type in choice: ${action.type}`, 'yellow');
                }
            }
        } else if (selectedChoice) {
            this.#log(`\n⏭️  Skipping (no actions for: ${selectedChoice.name})`, 'yellow');
        }
    }
} 