import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Abstract base class for AI providers
 */
export abstract class AIProvider {
    protected apiKey: string;

    constructor(apiKey?: string) {
        if (this.constructor === AIProvider) {
            throw new Error('AIProvider is an abstract class and cannot be instantiated directly');
        }
        this.apiKey = apiKey || '';
    }

    /**
     * Generate a response from the AI provider
     */
    generateResponse(prompt: string): Promise<string> {
        return Promise.reject(new Error('generateResponse must be implemented by subclass'));
    }

    /**
     * Validate the API key format for this provider
     */
    validateApiKey(apiKey: string): boolean {
        throw new Error('validateApiKey must be implemented by subclass');
    }
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends AIProvider {
    private client: OpenAI;

    constructor(apiKey: string) {
        super(apiKey);
        this.client = new OpenAI({ apiKey });
    }

    validateApiKey(apiKey: string): boolean {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        // OpenAI API keys start with 'sk-' or 'sk-proj-'
        return apiKey.startsWith('sk-') && apiKey.length >= 16;
    }

    async generateResponse(prompt: string): Promise<string> {
        try {
            const systemPrompt = `You are an expert DevOps engineer specialized in creating development environment configurations. Your task is to analyze project files and generate a comprehensive dev.yml configuration for the DevLift tool.

You should analyze the provided project information and create a YAML configuration that includes:
1. Project name and version
2. Environment variables and setup
3. Setup steps with proper dependencies
4. Post-setup instructions

Always respond with valid YAML format and include explanatory comments.`;

            const response = await this.client.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 4000
            });

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            throw new Error(`OpenAI API request failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider extends AIProvider {
    private client: Anthropic;

    constructor(apiKey: string) {
        super(apiKey);
        this.client = new Anthropic({ apiKey });
    }

    validateApiKey(apiKey: string): boolean {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        // Anthropic API keys start with 'sk-ant-'
        return apiKey.startsWith('sk-ant-') && apiKey.length >= 16;
    }

    async generateResponse(prompt: string): Promise<string> {
        try {
            const systemPrompt = `You are an expert DevOps engineer specialized in creating development environment configurations. Your task is to analyze project files and generate a comprehensive dev.yml configuration for the DevLift tool.

You should analyze the provided project information and create a YAML configuration that includes:
1. Project name and version
2. Environment variables and setup
3. Setup steps with proper dependencies
4. Post-setup instructions

Always respond with valid YAML format and include explanatory comments.`;

            const response = await this.client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                temperature: 0.1,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });

            const content = response.content[0];
            return (content && 'text' in content) ? content.text : '';
        } catch (error) {
            throw new Error(`Anthropic API request failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Google provider implementation
 */
export class GoogleProvider extends AIProvider {
    private client: GoogleGenerativeAI;

    constructor(apiKey: string) {
        super(apiKey);
        this.client = new GoogleGenerativeAI(apiKey);
    }

    validateApiKey(apiKey: string): boolean {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        // Google API keys start with 'AIza'
        return apiKey.startsWith('AIza') && apiKey.length >= 16;
    }

    async generateResponse(prompt: string): Promise<string> {
        try {
            const systemPrompt = `You are an expert DevOps engineer specialized in creating development environment configurations. Your task is to analyze project files and generate a comprehensive dev.yml configuration for the DevLift tool.`;

            const model = this.client.getGenerativeModel({
                model: 'gemini-1.5-pro',
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 4000
                }
            });

            const result = await model.generateContent([
                systemPrompt,
                prompt
            ]);

            return result.response.text();
        } catch (error) {
            throw new Error(`Google AI API request failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Factory for creating AI provider instances
 */
export class AIProviderFactory {
    private static readonly SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'google'] as const;

    static createProvider(provider: string, apiKey: string): AIProvider {
        switch (provider.toLowerCase()) {
            case 'openai':
                return new OpenAIProvider(apiKey);
            case 'anthropic':
                return new AnthropicProvider(apiKey);
            case 'google':
                return new GoogleProvider(apiKey);
            default:
                throw new Error(`Unknown AI provider: ${provider}`);
        }
    }

    static getSupportedProviders(): string[] {
        return [...this.SUPPORTED_PROVIDERS];
    }
} 