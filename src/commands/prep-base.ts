import inquirer from 'inquirer';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import chalk from 'chalk';
import path from 'path';
import { configExists, getConfigFileInfo } from '../core/config.js';

export enum PrepMode {
    INTERACTIVE = 'interactive',
    AI = 'ai',
    GUIDED = 'guided'
}

export interface PrepOptions {
    ai?: boolean;
    guided?: boolean;
    provider?: 'openai' | 'anthropic' | 'google';
    interactive?: boolean;
    force?: boolean;
    format?: 'yaml' | 'json';
    schema?: boolean;
    template?: string;
    review?: boolean;
}

export interface PrepDependencies {
    inquirer: typeof inquirer;
    fs: typeof fs;
    yaml: typeof yaml;
    console: typeof console;
    process: typeof process;
}

export abstract class PrepBase {
    protected options: PrepOptions;
    protected deps: PrepDependencies;

    constructor(options: PrepOptions, deps: PrepDependencies) {
        this.options = options;
        this.deps = deps;
        this.validateOptions();
    }

    /**
     * Main entry point for prep command execution
     */
    async run(): Promise<void> {
        this.deps.console.log(chalk.cyan("🚀 DevLift Configuration Generator"));
        this.deps.console.log(chalk.gray("Preparing your development environment setup...\n"));

        // Check if configuration already exists
        const shouldContinue = await this.checkExistingConfig('.');
        if (!shouldContinue) {
            return;
        }

        // Select mode, format, and schema options
        const mode = await this.selectMode();
        const format = await this.selectFormat();
        const includeSchema = await this.selectSchemaOption(format);

        // Execute the selected mode
        await this.executeMode(mode, format, includeSchema);
    }

    /**
     * Select the prep mode (interactive, AI, or guided)
     */
    async selectMode(): Promise<PrepMode> {
        // Priority: explicit flags first
        if (this.options.interactive) {
            return PrepMode.INTERACTIVE;
        }
        if (this.options.ai) {
            return PrepMode.AI;
        }
        if (this.options.guided) {
            return PrepMode.GUIDED;
        }

        // If no flags are set, prompt the user
        const { mode } = await this.deps.inquirer.prompt([
            {
                type: 'list',
                name: 'mode',
                message: 'How would you like to generate your configuration?',
                choices: [
                    {
                        name: '🎯 Guided Setup - Smart detection with interactive customization (recommended)',
                        value: PrepMode.GUIDED,
                        short: 'Guided'
                    },
                    {
                        name: '🤖 AI-Powered - Automatic analysis using artificial intelligence',
                        value: PrepMode.AI,
                        short: 'AI'
                    },
                    {
                        name: '📝 Manual Setup - Step-by-step interactive configuration',
                        value: PrepMode.INTERACTIVE,
                        short: 'Manual'
                    }
                ],
                default: PrepMode.GUIDED
            }
        ]);

        return mode as PrepMode;
    }

    /**
     * Select the output format (YAML or JSON)
     */
    async selectFormat(): Promise<'yaml' | 'json'> {
        if (this.options.format) {
            return this.options.format;
        }

        const { format } = await this.deps.inquirer.prompt([
            {
                type: 'list',
                name: 'format',
                message: 'Choose configuration file format:',
                choices: [
                    { name: 'YAML (.yml) - Human-readable, easy to edit', value: 'yaml' },
                    { name: 'JSON (.json) - Structured, with IntelliSense support', value: 'json' }
                ],
                default: 'yaml'
            }
        ]);

        return format as 'yaml' | 'json';
    }

    /**
     * Select whether to include JSON schema reference
     */
    async selectSchemaOption(format: 'yaml' | 'json'): Promise<boolean> {
        // Only relevant for JSON format
        if (format !== 'json') {
            return false;
        }

        // Use explicit option if provided
        if (this.options.schema !== undefined) {
            return this.options.schema;
        }

        const { schema } = await this.deps.inquirer.prompt([
            {
                type: 'confirm',
                name: 'schema',
                message: 'Include JSON schema reference for IntelliSense support?',
                default: true,
            },
        ]);

        return schema as boolean;
    }

    /**
     * Check if config already exists and handle overwrite logic
     */
    async checkExistingConfig(directory: string): Promise<boolean> {
        if (!configExists(directory)) {
            return true;
        }

        if (this.options.force) {
            return true;
        }

        const configInfo = getConfigFileInfo(directory);
        const { overwrite } = await this.deps.inquirer.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: chalk.yellow(`${configInfo?.path.split('/').pop()} already exists. Overwrite?`),
                default: false,
            },
        ]);

        if (!overwrite) {
            this.deps.console.log(chalk.gray('Configuration generation cancelled.'));
            return false;
        }

        return true;
    }

    /**
     * Write configuration to file
     */
    async writeConfigFile(config: any, format: 'yaml' | 'json', includeSchema: boolean): Promise<void> {
        const fileName = this.getConfigFileName(format);
        let content: string;

        if (format === 'json') {
            const configWithSchema = includeSchema
                ? { $schema: './schema/dev-config.schema.json', ...config }
                : config;
            content = JSON.stringify(configWithSchema, null, 2);
        } else {
            content = this.deps.yaml.dump(config, {
                indent: 2,
                lineWidth: 80,
                noRefs: true
            });
        }

        this.deps.fs.writeFileSync(fileName, content, 'utf8');

        this.deps.console.log(chalk.green(`\n✅ Configuration saved to ${fileName}`));
    }

    /**
     * Get the appropriate config file name based on format
     */
    protected getConfigFileName(format: 'yaml' | 'json'): string {
        return format === 'json' ? 'dev.json' : 'dev.yml';
    }

    /**
     * Validate the provided options
     */
    private validateOptions(): void {
        // Validate format
        if (this.options.format && !['yaml', 'json'].includes(this.options.format)) {
            throw new Error('Error: --format must be either "yaml" or "json"');
        }

        // Validate provider when AI is enabled
        if (this.options.ai && this.options.provider &&
            !['openai', 'anthropic', 'google'].includes(this.options.provider)) {
            throw new Error('Error: --provider must be one of: openai, anthropic, google');
        }
    }

    /**
     * Abstract method to be implemented by specific mode handlers
     */
    protected abstract executeMode(mode: PrepMode, format: 'yaml' | 'json', includeSchema: boolean): Promise<void>;
} 