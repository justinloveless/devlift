import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import chalk from 'chalk';
import path from 'path';

// Import our new AI-powered components
import { ProjectAnalyzer, ProjectAnalysisResult } from '../core/project-analyzer.js';
import { AIConfigGenerator } from '../core/ai-config-generator.js';
import { APIKeyManager, AIProviderType } from '../core/api-key-manager.js';
import { AIProviderFactory } from '../core/ai-providers.js';
import { configExists, getConfigFileInfo } from '../core/config.js';

interface SetupStep {
    type: string;
    name: string;
    command: string;
}

interface PrepOptions {
    ai?: boolean;
    provider?: AIProviderType;
    interactive?: boolean;
    force?: boolean;
    format?: 'yaml' | 'json';
    schema?: boolean;
}

// Dependencies interface for testing
interface PrepDependencies {
    inquirer: typeof inquirer;
    fs: typeof fs;
    yaml: typeof yaml;
    console: typeof console;
    projectAnalyzer: ProjectAnalyzer;
    aiConfigGenerator: AIConfigGenerator;
    apiKeyManager: APIKeyManager;
    aiProviderFactory: typeof AIProviderFactory;
    process: typeof process;
}

// Default dependencies
const defaultDependencies: PrepDependencies = {
    inquirer,
    fs,
    yaml,
    console,
    projectAnalyzer: new ProjectAnalyzer(),
    aiConfigGenerator: new AIConfigGenerator(),
    apiKeyManager: new APIKeyManager(),
    aiProviderFactory: AIProviderFactory,
    process
};

/**
 * Core prep logic - extracted for testability
 */
export async function runPrepCommand(options: PrepOptions, deps: PrepDependencies = defaultDependencies): Promise<void> {
    deps.console.log(chalk.cyan("🚀 DevLift Configuration Generator"));
    deps.console.log(chalk.gray("Preparing your development environment setup...\n"));

    // Check if configuration already exists
    if (configExists('.') && !options.force) {
        const configInfo = getConfigFileInfo('.');
        const { overwrite } = await deps.inquirer.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: chalk.yellow(`${configInfo?.path.split('/').pop()} already exists. Overwrite?`),
                default: false,
            },
        ]);
        if (!overwrite) {
            deps.console.log(chalk.gray('Configuration generation cancelled.'));
            return;
        }
    }

    // Determine output format
    let outputFormat = options.format;
    if (!outputFormat) {
        if (!options.ai && !options.interactive) {
            // Ask user to choose format
            const { format } = await deps.inquirer.prompt([
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
            outputFormat = format;
        } else {
            outputFormat = 'yaml'; // Default for AI and interactive modes
        }
    }

    // Determine if schema should be included (for JSON)
    let includeSchema = options.schema ?? true; // Default to true for JSON
    if (outputFormat === 'json' && options.schema === undefined) {
        const { schema } = await deps.inquirer.prompt([
            {
                type: 'confirm',
                name: 'schema',
                message: 'Include JSON schema reference for IntelliSense support?',
                default: true,
            },
        ]);
        includeSchema = schema;
    }

    // Choose between AI and manual mode
    if (!options.ai && !options.interactive) {
        const { useAI } = await deps.inquirer.prompt([
            {
                type: 'confirm',
                name: 'useAI',
                message: 'Use AI to automatically analyze your project and generate configuration?',
                default: true,
            },
        ]);

        if (useAI) {
            await generateSmartConfig({ ...options, ai: true, format: outputFormat, schema: includeSchema }, deps);
        } else {
            await generateManualConfig(deps, outputFormat, includeSchema);
        }
    } else if (options.ai) {
        await generateSmartConfig({ ...options, format: outputFormat, schema: includeSchema }, deps);
    } else {
        await generateManualConfig(deps, outputFormat, includeSchema);
    }
}

const prep = new Command('prep')
    .alias('init')
    .description('Prepare a new dev configuration file for the current project')
    .option('--ai', 'Use AI to automatically generate the configuration (recommended)')
    .option('--provider <provider>', 'AI provider to use: openai, anthropic, google')
    .option('--interactive', 'Force manual/interactive configuration mode')
    .option('--force', 'Overwrite existing configuration without confirmation')
    .option('--format <format>', 'Output format: yaml or json', 'yaml')
    .option('--schema', 'Include JSON schema reference (JSON format only)')
    .option('--no-schema', 'Exclude JSON schema reference (JSON format only)')
    .addHelpText('after', `
Examples:
  $ dev prep                              # Choose between AI or manual mode
  $ dev prep --ai                         # Use AI with provider selection
  $ dev prep --ai --provider openai       # Use specific AI provider
  $ dev prep --interactive                # Force manual configuration
  $ dev prep --force                      # Overwrite existing configuration
  $ dev prep --format json                # Generate JSON configuration
  $ dev prep --format json --schema       # JSON with schema reference
  $ dev prep --format yaml                # Generate YAML configuration

Formats:
  yaml        YAML format (.yml) - Human-readable, easy to edit
  json        JSON format (.json) - Structured, with IntelliSense support

AI Providers:
  openai      OpenAI GPT-4 (recommended)
  anthropic   Anthropic Claude
  google      Google Gemini

Setup AI Provider:
  Set environment variable with your API key:
  $ export OPENAI_API_KEY=your_key_here
  $ export ANTHROPIC_API_KEY=your_key_here  
  $ export GOOGLE_API_KEY=your_key_here`)
    .action(async (options: PrepOptions) => {
        // Validate format option
        if (options.format && !['yaml', 'json'].includes(options.format)) {
            console.error(chalk.red('Error: --format must be either "yaml" or "json"'));
            process.exit(1);
        }

        await runPrepCommand(options);
    });

/**
 * Generate configuration using AI analysis
 */
async function generateSmartConfig(options: PrepOptions, deps: PrepDependencies): Promise<void> {
    deps.console.log(chalk.blue('🤖 Initializing AI-powered configuration generator...\n'));

    // Step 1: Analyze project
    deps.console.log(chalk.blue('🔍 Analyzing project structure and technologies...'));
    const projectData = await deps.projectAnalyzer.analyzeProject('.');

    deps.console.log(chalk.green('✅ Project analysis complete!'));
    deps.console.log(chalk.gray(`   Project: ${projectData.projectName || 'Unknown'}`));
    deps.console.log(chalk.gray(`   Platform: ${projectData.technologies.platform || 'Unknown'}`));
    deps.console.log(chalk.gray(`   Package Manager: ${projectData.technologies.packageManager || 'Not detected'}`));
    deps.console.log(chalk.gray(`   Frameworks: ${projectData.technologies.frameworks.join(', ') || 'None'}`));
    deps.console.log(chalk.gray(`   Environment variables: ${projectData.environmentVariables.length}`));

    // Step 2: Get AI provider
    const providerType = options.provider || 'openai';
    deps.console.log(chalk.blue(`🧠 Setting up AI provider: ${providerType}...`));

    const apiKey = await deps.apiKeyManager.getAPIKey(providerType);

    if (!apiKey) {
        deps.console.log(chalk.red('❌ Failed to obtain API key. Falling back to manual mode.'));
        await generateManualConfig(deps, options.format || 'yaml', options.schema ?? true);
        return;
    }

    const aiProvider = deps.aiProviderFactory.createProvider(providerType, apiKey);

    if (!aiProvider) {
        deps.console.log(chalk.red('❌ Failed to initialize AI provider. Falling back to manual mode.'));
        await generateManualConfig(deps, options.format || 'yaml', options.schema ?? true);
        return;
    }

    deps.console.log(chalk.green('✅ AI provider ready!'));

    // Step 3: Generate configuration
    deps.console.log(chalk.blue('🎯 Generating intelligent configuration...'));
    const generatedConfig = await deps.aiConfigGenerator.generateConfig(projectData, aiProvider);

    // Step 4: Write the configuration
    await writeConfigFile(generatedConfig, options.format || 'yaml', options.schema ?? true, deps);

    deps.console.log(chalk.green('\n✅ Smart configuration generated successfully!'));
    deps.console.log(chalk.gray(`   AI Provider: ${providerType}`));
    deps.console.log(chalk.gray(`   Format: ${options.format || 'yaml'}`));
    deps.console.log(chalk.gray(`   Configuration steps: ${generatedConfig.setup_steps?.length || 0}`));
    deps.console.log(chalk.gray(`   Environment variables: ${generatedConfig.environment?.variables?.length || 0}`));

    // Show preview of what was generated
    const configStr = options.format === 'json'
        ? JSON.stringify(generatedConfig, null, 2)
        : deps.yaml.dump(generatedConfig, { indent: 2, lineWidth: 80, noRefs: true });

    deps.console.log(chalk.blue('\n📋 Generated configuration preview:'));
    deps.console.log(chalk.gray('─'.repeat(50)));
    deps.console.log(configStr.substring(0, 500) + '...');
    deps.console.log(chalk.gray('─'.repeat(50)));

    deps.console.log(chalk.cyan('\n🚀 Next steps:'));
    deps.console.log(chalk.white(`   1. Review the generated ${getConfigFileName(options.format || 'yaml')} file`));
    deps.console.log(chalk.white('   2. Run `dev lift` to set up your development environment'));
    deps.console.log(chalk.white('   3. Start coding! 🎉'));
}

/**
 * Generate configuration manually (original behavior)
 */
async function generateManualConfig(deps: PrepDependencies, format: string = 'yaml', includeSchema: boolean = true): Promise<void> {
    deps.console.log(chalk.blue('📝 Starting interactive configuration wizard...\n'));

    // Get project name
    const { projectName } = await deps.inquirer.prompt([
        {
            type: 'input',
            name: 'projectName',
            message: 'What is the name of your project?',
            default: 'My Project'
        }
    ]);

    // Ask about setup steps
    deps.console.log(chalk.blue('\n⚙️  Let\'s configure your setup steps...'));
    const steps: any[] = [];
    let addMore = true;

    while (addMore) {
        const { stepType } = await deps.inquirer.prompt([
            {
                type: 'list',
                name: 'stepType',
                message: 'What type of setup step would you like to add?',
                choices: [
                    { name: '📦 Package Manager (npm, yarn, pip, etc.)', value: 'package-manager' },
                    { name: '🐚 Shell Command', value: 'shell' },
                    { name: '🐳 Docker Compose', value: 'docker-compose' },
                    { name: '🐋 Docker', value: 'docker' },
                    { name: '🗄️  Database Operation', value: 'database' },
                    { name: '⚙️  Service Management', value: 'service' }
                ]
            }
        ]);

        const { stepName } = await deps.inquirer.prompt([
            {
                type: 'input',
                name: 'stepName',
                message: 'What should this step be called?',
                default: stepType === 'package-manager' ? 'Install Dependencies' : 'Setup Step'
            }
        ]);

        let command = '';
        if (stepType === 'package-manager') {
            const { packageCommand } = await deps.inquirer.prompt([
                {
                    type: 'list',
                    name: 'packageCommand',
                    message: 'What package manager command?',
                    choices: ['install', 'run build', 'run test', 'run dev', 'run start']
                }
            ]);
            command = packageCommand;
        } else {
            const { shellCommand } = await deps.inquirer.prompt([
                {
                    type: 'input',
                    name: 'shellCommand',
                    message: 'What command should be executed?',
                    default: stepType === 'docker-compose' ? 'up -d' : 'echo "Setup step"'
                }
            ]);
            command = shellCommand;
        }

        steps.push({
            name: stepName,
            type: stepType,
            command: command
        });

        const { addMoreSteps } = await deps.inquirer.prompt([
            {
                type: 'confirm',
                name: 'addMoreSteps',
                message: 'Add another setup step?',
                default: false
            }
        ]);
        addMore = addMoreSteps;
    }

    // Ask about environment variables
    deps.console.log(chalk.blue('\n🔧 Environment variable configuration...'));
    const { needsEnvVars } = await deps.inquirer.prompt([
        {
            type: 'confirm',
            name: 'needsEnvVars',
            message: 'Do you need environment variables?',
            default: false
        }
    ]);

    let environmentVariables: any[] = [];
    if (needsEnvVars) {
        addMore = true;
        while (addMore) {
            const envVar = await deps.inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Environment variable name (e.g., DATABASE_URL):',
                    validate: (input) => input.trim() !== '' || 'Name is required'
                },
                {
                    type: 'input',
                    name: 'prompt',
                    message: 'User prompt for this variable:',
                    default: (answers: any) => `Enter value for ${answers.name}:`
                },
                {
                    type: 'input',
                    name: 'default',
                    message: 'Default value (optional):'
                },
                {
                    type: 'confirm',
                    name: 'secret',
                    message: 'Is this a secret value that should be masked?',
                    default: false
                }
            ]);

            const formattedVar: any = {
                name: envVar.name,
                prompt: envVar.prompt
            };

            if (envVar.default) {
                formattedVar.default = envVar.default;
            }

            if (envVar.secret) {
                formattedVar.secret = true;
            }

            environmentVariables.push(formattedVar);

            const { addMoreEnv } = await deps.inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'addMoreEnv',
                    message: 'Add another environment variable?',
                    default: false
                }
            ]);
            addMore = addMoreEnv;
        }
    }

    // Build the final configuration
    const config: any = {
        project_name: projectName,
        version: '1',
        setup_steps: steps.map(step => ({
            name: step.name,
            type: step.type,
            ...(step.type === 'package-manager' ? { manager: 'npm', command: step.command } : { command: step.command })
        }))
    };

    if (environmentVariables.length > 0) {
        config.environment = {
            example_file: '.env.example',
            variables: environmentVariables
        };
    }

    await writeConfigFile(config, format, includeSchema, deps);

    deps.console.log(chalk.green('\n✅ Configuration created successfully!'));
    deps.console.log(chalk.gray(`   Format: ${format}`));
    deps.console.log(chalk.gray(`   Setup steps: ${steps.length}`));
    deps.console.log(chalk.gray(`   Environment variables: ${environmentVariables.length}`));

    deps.console.log(chalk.cyan('\n🚀 Next steps:'));
    deps.console.log(chalk.white(`   1. Review the generated ${getConfigFileName(format)} file`));
    deps.console.log(chalk.white('   2. Run `dev lift` to set up your development environment'));
    deps.console.log(chalk.white('   3. Start coding! 🎉'));
}

/**
 * Write configuration to file in the specified format
 */
async function writeConfigFile(config: any, format: string, includeSchema: boolean, deps: PrepDependencies): Promise<void> {
    const fileName = getConfigFileName(format);

    if (format === 'json') {
        // Add schema reference if requested
        if (includeSchema) {
            config.$schema = 'https://raw.githubusercontent.com/justinloveless/devlift/main/schema/dev-config.schema.json';
        }

        const jsonStr = JSON.stringify(config, null, 2);
        await deps.fs.writeFile(fileName, jsonStr);
    } else {
        // YAML format
        const yamlStr = deps.yaml.dump(config, {
            indent: 2,
            lineWidth: 100,
            noRefs: true
        });

        // Add schema comment for YAML if requested
        let finalContent = yamlStr;
        if (includeSchema) {
            finalContent = `# yaml-language-server: $schema=https://raw.githubusercontent.com/justinloveless/devlift/main/schema/dev-config.schema.json\n${yamlStr}`;
        }

        await deps.fs.writeFile(fileName, finalContent);
    }
}

/**
 * Get the configuration file name based on format
 */
function getConfigFileName(format: string): string {
    return format === 'json' ? 'dev.json' : 'dev.yml';
}

export default prep; 