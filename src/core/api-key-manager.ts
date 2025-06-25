import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import inquirer from 'inquirer';

// Supported AI providers
export type AIProviderType = 'openai' | 'anthropic' | 'google';

// Interface for API key prompt results
export interface APIKeyPromptResult {
    apiKey: string;
    saveKey: boolean;
}

// Interface for the global configuration
interface GlobalConfig {
    apiKeys?: Record<string, string>;
    [key: string]: any;
}

/**
 * APIKeyManager handles secure storage and retrieval of AI provider API keys
 */
export class APIKeyManager {
    private configPath: string;

    constructor() {
        this.configPath = path.join(os.homedir(), '.devlift', 'config.json');
    }

    /**
     * Get API key for a provider, checking environment variables, config file, and prompting if needed
     */
    async getAPIKey(provider: AIProviderType): Promise<string | null> {
        // First check environment variables
        const envKey = this.getFromEnvironment(provider);
        if (envKey) {
            return envKey;
        }

        // Then check global config file
        const configKey = await this.getFromConfig(provider);
        if (configKey) {
            return configKey;
        }

        // If not found, prompt user
        try {
            const result = await this.promptForAPIKey(provider);
            if (result.saveKey) {
                await this.setAPIKey(provider, result.apiKey);
            }
            return result.apiKey;
        } catch (error) {
            // If prompting fails or user cancels, return null
            return null;
        }
    }

    /**
     * Save an API key to the global config file
     */
    async setAPIKey(provider: AIProviderType, apiKey: string): Promise<void> {
        try {
            let config: GlobalConfig = {};

            // Read existing config if it exists
            if (await fs.pathExists(this.configPath)) {
                config = await fs.readJSON(this.configPath);
            }

            // Ensure apiKeys object exists
            if (!config.apiKeys) {
                config.apiKeys = {};
            }

            // Set the API key
            config.apiKeys[provider] = apiKey;

            // Ensure directory exists
            await fs.ensureDir(path.dirname(this.configPath));

            // Write the config
            await fs.writeJSON(this.configPath, config, { spaces: 2 });
        } catch (error) {
            throw new Error(`Failed to save API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Remove an API key from the global config file
     */
    async removeAPIKey(provider: AIProviderType): Promise<void> {
        try {
            if (!(await fs.pathExists(this.configPath))) {
                return; // No config file, nothing to remove
            }

            const config: GlobalConfig = await fs.readJSON(this.configPath);

            if (config.apiKeys && config.apiKeys[provider]) {
                delete config.apiKeys[provider];
                await fs.writeJSON(this.configPath, config, { spaces: 2 });
            }
        } catch (error) {
            // Silently handle errors when removing keys
            console.warn(`Warning: Could not remove API key for ${provider}:`, error);
        }
    }

    /**
     * List providers that have saved API keys
     */
    async listSavedProviders(): Promise<AIProviderType[]> {
        try {
            if (!(await fs.pathExists(this.configPath))) {
                return [];
            }

            const config: GlobalConfig = await fs.readJSON(this.configPath);

            if (!config.apiKeys || typeof config.apiKeys !== 'object') {
                return [];
            }

            return Object.keys(config.apiKeys) as AIProviderType[];
        } catch (error) {
            return [];
        }
    }

    /**
     * Prompt user for API key
     */
    async promptForAPIKey(provider: AIProviderType): Promise<APIKeyPromptResult> {
        const providerInfo = this.getProviderInfo(provider);

        if (!providerInfo) {
            throw new Error(`Unknown provider: ${provider}`);
        }

        const questions = [
            {
                type: 'password' as const,
                name: 'apiKey' as const,
                message: `Enter your ${providerInfo.name} API key:`,
                validate: (input: string) => {
                    if (!this.validateAPIKey(provider, input)) {
                        return `Invalid ${providerInfo.name} API key format. Expected format: ${providerInfo.format}`;
                    }
                    return true;
                }
            },
            {
                type: 'confirm' as const,
                name: 'saveKey' as const,
                message: 'Save this API key for future use?',
                default: true
            }
        ];

        return await inquirer.prompt(questions) as APIKeyPromptResult;
    }

    /**
     * Validate API key format for a provider
     */
    validateAPIKey(provider: AIProviderType, apiKey: string): boolean {
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
            return false;
        }

        const trimmedKey = apiKey.trim();

        switch (provider) {
            case 'openai':
                // OpenAI keys start with 'sk-' and can also be 'sk-proj-'
                return /^sk-[a-zA-Z0-9-_]+$/.test(trimmedKey) || /^sk-proj-[a-zA-Z0-9-_]+$/.test(trimmedKey);

            case 'anthropic':
                // Anthropic keys start with 'sk-ant-'
                return /^sk-ant-[a-zA-Z0-9-_]+$/.test(trimmedKey);

            case 'google':
                // Google AI API keys start with 'AIza'
                return /^AIza[a-zA-Z0-9-_]+$/.test(trimmedKey);

            default:
                return false;
        }
    }

    /**
     * Get API key from environment variables
     */
    private getFromEnvironment(provider: AIProviderType): string | null {
        const envVars = this.getEnvironmentVariables(provider);

        for (const envVar of envVars) {
            const value = process.env[envVar];
            if (value && this.validateAPIKey(provider, value)) {
                return value;
            }
        }

        return null;
    }

    /**
     * Get API key from global config file
     */
    private async getFromConfig(provider: AIProviderType): Promise<string | null> {
        try {
            if (!(await fs.pathExists(this.configPath))) {
                return null;
            }

            const config: GlobalConfig = await fs.readJSON(this.configPath);

            if (config.apiKeys && config.apiKeys[provider]) {
                const key = config.apiKeys[provider];
                if (this.validateAPIKey(provider, key)) {
                    return key;
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get environment variable names for a provider
     */
    private getEnvironmentVariables(provider: AIProviderType): string[] {
        switch (provider) {
            case 'openai':
                return ['OPENAI_API_KEY', 'OPENAI_KEY'];
            case 'anthropic':
                return ['ANTHROPIC_API_KEY', 'ANTHROPIC_KEY'];
            case 'google':
                return ['GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY'];
            default:
                return [];
        }
    }

    /**
     * Get provider information for display
     */
    private getProviderInfo(provider: AIProviderType): { name: string; format: string } | null {
        switch (provider) {
            case 'openai':
                return {
                    name: 'OpenAI',
                    format: 'sk-...'
                };
            case 'anthropic':
                return {
                    name: 'Anthropic',
                    format: 'sk-ant-...'
                };
            case 'google':
                return {
                    name: 'Google AI',
                    format: 'AIza...'
                };
            default:
                return null;
        }
    }
} 