import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import chalk from 'chalk';
import path from 'path';

// Import our new AI-powered components
import { ProjectAnalyzer } from '../core/project-analyzer.js';
import { AIConfigGenerator } from '../core/ai-config-generator.js';
import { AIProviderFactory, AIProvider } from '../core/ai-providers.js';
import { APIKeyManager, AIProviderType } from '../core/api-key-manager.js';

interface SetupStep {
    type: string;
    name: string;
    command: string;
}

interface PrepOptions {
    ai?: boolean;
    provider?: string;
    force?: boolean;
    interactive?: boolean;
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

    // Check if dev.yml already exists
    if (deps.fs.pathExistsSync('dev.yml') && !options.force) {
        const { overwrite } = await deps.inquirer.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: chalk.yellow('dev.yml already exists. Overwrite?'),
                default: false,
            },
        ]);
        if (!overwrite) {
            deps.console.log(chalk.gray('Configuration generation cancelled.'));
            return;
        }
    }

    try {
        if (options.interactive) {
            // Force manual/interactive mode
            await generateManualConfig(deps);
        } else if (options.ai || options.provider) {
            await generateSmartConfig(options, deps);
        } else {
            // Show the user their options
            const { configMethod } = await deps.inquirer.prompt([
                {
                    type: 'list',
                    name: 'configMethod',
                    message: 'How would you like to create your dev.yml?',
                    choices: [
                        {
                            name: '🤖 Smart AI Generation (Recommended) - Automatically analyze your project',
                            value: 'ai'
                        },
                        {
                            name: '✋ Manual Configuration - Build step by step',
                            value: 'manual'
                        }
                    ]
                }
            ]);

            if (configMethod === 'ai') {
                await generateSmartConfig(options, deps);
            } else {
                await generateManualConfig(deps);
            }
        }
    } catch (error) {
        deps.console.error(chalk.red('❌ Configuration generation failed:'));
        deps.console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));

        // Offer fallback to manual configuration
        const { fallback } = await deps.inquirer.prompt([
            {
                type: 'confirm',
                name: 'fallback',
                message: 'Would you like to create a basic configuration manually instead?',
                default: true
            }
        ]);

        if (fallback) {
            await generateManualConfig(deps);
        } else {
            deps.process.exit(1);
        }
    }
}

const prep = new Command('prep')
    .alias('init')
    .description('Prepare a new dev.yml configuration file for the current project')
    .option('--ai', 'Use AI to automatically generate the configuration (recommended)')
    .option('--provider <provider>', 'AI provider to use: openai, anthropic, google')
    .option('--interactive', 'Force manual/interactive configuration mode')
    .option('--force', 'Overwrite existing dev.yml without confirmation')
    .addHelpText('after', `
Examples:
  $ dev prep                              # Choose between AI or manual mode
  $ dev prep --ai                         # Use AI with provider selection
  $ dev prep --ai --provider openai       # Use specific AI provider
  $ dev prep --interactive                # Force manual configuration
  $ dev prep --force                      # Overwrite existing dev.yml

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
        await runPrepCommand(options);
    });

/**
 * Generate configuration using AI analysis
 */
async function generateSmartConfig(options: PrepOptions, deps: PrepDependencies): Promise<void> {
    deps.console.log(chalk.blue('🧠 Analyzing your project with AI...'));

    // Step 1: Analyze the project
    deps.console.log(chalk.gray('📊 Scanning project files...'));
    const currentDir = deps.process.cwd();
    const projectData = await deps.projectAnalyzer.analyzeProject(currentDir);

    deps.console.log(chalk.green(`✅ Project analyzed: ${projectData.projectName || 'Unknown Project'}`));
    deps.console.log(chalk.gray(`   Platform: ${projectData.technologies.platform}`));
    deps.console.log(chalk.gray(`   Frameworks: ${projectData.technologies.frameworks.join(', ') || 'None detected'}`));
    deps.console.log(chalk.gray(`   Environment variables: ${projectData.environmentVariables.length}`));
    deps.console.log();

    // Step 2: Get AI provider
    let aiProvider: AIProvider | null = null;
    let providerType: AIProviderType;

    if (options.provider) {
        // Validate the provided provider
        const validProviders: AIProviderType[] = ['openai', 'anthropic', 'google'];
        if (!validProviders.includes(options.provider as AIProviderType)) {
            throw new Error(`Invalid provider: ${options.provider}. Valid options: ${validProviders.join(', ')}`);
        }
        providerType = options.provider as AIProviderType;
    } else {
        // Prompt user to select provider
        const { selectedProvider } = await deps.inquirer.prompt([
            {
                type: 'list',
                name: 'selectedProvider',
                message: 'Select AI provider for configuration generation:',
                choices: [
                    {
                        name: '🤖 OpenAI (GPT-4) - Most comprehensive analysis',
                        value: 'openai'
                    },
                    {
                        name: '🧠 Anthropic (Claude) - Excellent for development workflows',
                        value: 'anthropic'
                    },
                    {
                        name: '🔍 Google AI (Gemini) - Good for technical analysis',
                        value: 'google'
                    }
                ]
            }
        ]);
        providerType = selectedProvider;
    }

    // Step 3: Get API key and create provider
    deps.console.log(chalk.gray('🔑 Setting up AI provider...'));
    const apiKey = await deps.apiKeyManager.getAPIKey(providerType);

    if (!apiKey) {
        throw new Error(`Failed to obtain API key for ${providerType}. Please ensure you have a valid API key.`);
    }

    try {
        aiProvider = deps.aiProviderFactory.createProvider(providerType, apiKey);
    } catch (error) {
        throw new Error(`Failed to initialize ${providerType} provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 4: Generate configuration
    deps.console.log(chalk.blue('🎯 Generating intelligent configuration...'));
    const generatedConfig = await deps.aiConfigGenerator.generateConfig(projectData, aiProvider);

    // Step 5: Write the configuration
    const yamlStr = deps.yaml.dump(generatedConfig, {
        indent: 2,
        lineWidth: 100,
        noRefs: true
    });

    await deps.fs.writeFile('dev.yml', yamlStr);

    deps.console.log(chalk.green('\n✅ Smart dev.yml configuration generated successfully!'));
    deps.console.log(chalk.gray(`   AI Provider: ${providerType}`));
    deps.console.log(chalk.gray(`   Configuration steps: ${generatedConfig.setup_steps?.length || 0}`));
    deps.console.log(chalk.gray(`   Environment variables: ${generatedConfig.environment?.variables?.length || 0}`));

    // Show preview of what was generated
    deps.console.log(chalk.blue('\n📋 Generated configuration preview:'));
    deps.console.log(chalk.gray('─'.repeat(50)));
    deps.console.log(deps.yaml.dump(generatedConfig, { indent: 2, lineWidth: 80, noRefs: true }).substring(0, 500) + '...');
    deps.console.log(chalk.gray('─'.repeat(50)));

    deps.console.log(chalk.cyan('\n🚀 Next steps:'));
    deps.console.log(chalk.white('   1. Review the generated dev.yml file'));
    deps.console.log(chalk.white('   2. Run `dev lift` to set up your development environment'));
    deps.console.log(chalk.white('   3. Start coding! 🎉'));
}

/**
 * Generate configuration manually (original behavior)
 */
async function generateManualConfig(deps: PrepDependencies): Promise<void> {
    deps.console.log(chalk.blue('✋ Manual Configuration Mode'));
    deps.console.log(chalk.gray('Build your dev.yml step by step...\n'));

    // Get project name
    const currentDir = deps.process.cwd();
    const defaultProjectName = path.basename(currentDir);

    const { projectName } = await deps.inquirer.prompt([
        {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            default: defaultProjectName
        }
    ]);

    // Build setup steps
    const steps: SetupStep[] = [];
    let addAnotherStep = true;

    deps.console.log(chalk.gray('\nLet\'s add setup steps for your development environment:'));

    while (addAnotherStep) {
        const { addStep } = await deps.inquirer.prompt([
            {
                type: 'confirm',
                name: 'addStep',
                message: steps.length === 0 ? 'Add your first setup step?' : 'Add another setup step?',
                default: true
            }
        ]);

        if (!addStep) {
            addAnotherStep = false;
            continue;
        }

        const step = await deps.inquirer.prompt([
            {
                type: 'list',
                name: 'type',
                message: 'Step type:',
                choices: [
                    { name: 'Shell Command', value: 'shell' },
                    { name: 'Package Manager', value: 'package-manager' }
                ]
            },
            {
                type: 'input',
                name: 'name',
                message: 'Name for this step:',
                validate: (input: string) => input.trim().length > 0 || 'Step name is required'
            },
            {
                type: 'input',
                name: 'command',
                message: 'Command to run:',
                validate: (input: string) => input.trim().length > 0 || 'Command is required'
            },
        ]);
        steps.push(step);

        if (steps.length >= 10) {
            deps.console.log(chalk.yellow('Maximum of 10 steps reached.'));
            addAnotherStep = false;
        } else {
            const { addMore } = await deps.inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'addMore',
                    message: 'Add another step?',
                    default: false
                }
            ]);
            addAnotherStep = addMore;
        }
    }

    // Ask about environment variables
    const { addEnvVars } = await deps.inquirer.prompt([
        {
            type: 'confirm',
            name: 'addEnvVars',
            message: 'Do you need environment variables?',
            default: false
        }
    ]);

    let environmentVariables: any[] = [];
    if (addEnvVars) {
        let addMore = true;
        while (addMore) {
            const envVar = await deps.inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Environment variable name:',
                    validate: (input: string) => /^[A-Z_][A-Z0-9_]*$/.test(input) || 'Use uppercase letters, numbers, and underscores only'
                },
                {
                    type: 'input',
                    name: 'prompt',
                    message: 'Prompt message for users:',
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
                    message: 'Is this a secret/sensitive value?',
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

    const yamlStr = deps.yaml.dump(config, { indent: 2, lineWidth: 100, noRefs: true });
    await deps.fs.writeFile('dev.yml', yamlStr);

    deps.console.log(chalk.green('\n✅ dev.yml configuration created successfully!'));
    deps.console.log(chalk.gray(`   Setup steps: ${steps.length}`));
    deps.console.log(chalk.gray(`   Environment variables: ${environmentVariables.length}`));

    deps.console.log(chalk.cyan('\n🚀 Next steps:'));
    deps.console.log(chalk.white('   1. Review the generated dev.yml file'));
    deps.console.log(chalk.white('   2. Run `dev lift` to set up your development environment'));
    deps.console.log(chalk.white('   3. Start coding! 🎉'));
}

export default prep; 