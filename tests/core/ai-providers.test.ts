import { jest } from '@jest/globals';
import { AIProvider, OpenAIProvider, AnthropicProvider, GoogleProvider, AIProviderFactory } from '../../src/core/ai-providers.js';

// Mock the AI SDK modules at the top level
jest.mock('openai', () => ({
    default: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn()
            }
        }
    }))
}));

jest.mock('@anthropic-ai/sdk', () => ({
    default: jest.fn().mockImplementation(() => ({
        messages: {
            create: jest.fn()
        }
    }))
}));

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn()
        })
    }))
}));

describe('AI Provider Infrastructure', () => {
    describe('AIProvider (Abstract Base Class)', () => {
        test('should throw error when instantiated directly', () => {
            expect(() => new AIProvider()).toThrow('AIProvider is an abstract class');
        });

        test('should throw error when generateResponse is not implemented', async () => {
            class TestProvider extends AIProvider {
                constructor() { super(); }
                generateResponse(prompt: string): Promise<string> {
                    return super.generateResponse(prompt);
                }
                validateApiKey(apiKey: string): boolean {
                    return super.validateApiKey(apiKey);
                }
            }
            const provider = new TestProvider();
            await expect(provider.generateResponse('test')).rejects.toThrow('generateResponse must be implemented by subclass');
        });

        test('should throw error when validateApiKey is not implemented', () => {
            class TestProvider extends AIProvider {
                constructor() { super(); }
                generateResponse(prompt: string): Promise<string> {
                    return Promise.resolve('test');
                }
                validateApiKey(apiKey: string): boolean {
                    return super.validateApiKey(apiKey);
                }
            }
            const provider = new TestProvider();
            expect(() => provider.validateApiKey('test')).toThrow('validateApiKey must be implemented by subclass');
        });
    });

    describe('OpenAIProvider', () => {
        let provider: OpenAIProvider;

        beforeEach(() => {
            jest.clearAllMocks();
            provider = new OpenAIProvider('test-api-key');
        });

        test('should validate correct OpenAI API key format', () => {
            expect(provider.validateApiKey('sk-1234567890abcdef')).toBe(true);
            expect(provider.validateApiKey('sk-proj-1234567890abcdef')).toBe(true);
        });

        test('should reject invalid OpenAI API key format', () => {
            expect(provider.validateApiKey('invalid-key')).toBe(false);
            expect(provider.validateApiKey('')).toBe(false);
            expect(provider.validateApiKey(null as any)).toBe(false);
        });
    });

    describe('AnthropicProvider', () => {
        let provider: AnthropicProvider;

        beforeEach(() => {
            jest.clearAllMocks();
            provider = new AnthropicProvider('test-api-key');
        });

        test('should validate correct Anthropic API key format', () => {
            expect(provider.validateApiKey('sk-ant-1234567890abcdef')).toBe(true);
        });

        test('should reject invalid Anthropic API key format', () => {
            expect(provider.validateApiKey('invalid-key')).toBe(false);
            expect(provider.validateApiKey('sk-1234567890abcdef')).toBe(false);
        });
    });

    describe('GoogleProvider', () => {
        let provider: GoogleProvider;

        beforeEach(() => {
            jest.clearAllMocks();
            provider = new GoogleProvider('test-api-key');
        });

        test('should validate correct Google API key format', () => {
            expect(provider.validateApiKey('AIza1234567890abcdef')).toBe(true);
        });

        test('should reject invalid Google API key format', () => {
            expect(provider.validateApiKey('invalid-key')).toBe(false);
            expect(provider.validateApiKey('sk-1234567890abcdef')).toBe(false);
        });
    });

    describe('AIProviderFactory', () => {
        test('should create OpenAI provider', () => {
            const provider = AIProviderFactory.createProvider('openai', 'sk-test-key');
            expect(provider).toBeInstanceOf(OpenAIProvider);
        });

        test('should create Anthropic provider', () => {
            const provider = AIProviderFactory.createProvider('anthropic', 'sk-ant-test-key');
            expect(provider).toBeInstanceOf(AnthropicProvider);
        });

        test('should create Google provider', () => {
            const provider = AIProviderFactory.createProvider('google', 'AIza-test-key');
            expect(provider).toBeInstanceOf(GoogleProvider);
        });

        test('should throw error for unknown provider', () => {
            expect(() => AIProviderFactory.createProvider('unknown', 'test-key'))
                .toThrow('Unknown AI provider: unknown');
        });

        test('should return list of supported providers', () => {
            const providers = AIProviderFactory.getSupportedProviders();
            expect(providers).toEqual(['openai', 'anthropic', 'google']);
        });
    });
}); 