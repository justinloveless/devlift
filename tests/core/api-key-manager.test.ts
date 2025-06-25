import { jest } from '@jest/globals';
import { APIKeyManager } from '../../src/core/api-key-manager.js';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import inquirer from 'inquirer';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('os');
jest.mock('inquirer');

describe('API Key Manager', () => {
    let apiKeyManager: APIKeyManager;
    const mockFs = fs as jest.Mocked<typeof fs>;
    const mockOs = os as jest.Mocked<typeof os>;
    const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;

    beforeEach(() => {
        jest.clearAllMocks();
        apiKeyManager = new APIKeyManager();

        // Mock home directory
        mockOs.homedir.mockReturnValue('/home/user');

        // Mock inquirer
        mockInquirer.prompt = jest.fn();
    });

    describe('getAPIKey', () => {
        test('should get API key from environment variable', async () => {
            // Mock environment variable
            process.env.OPENAI_API_KEY = 'sk-test-openai-key';

            const apiKey = await apiKeyManager.getAPIKey('openai');

            expect(apiKey).toBe('sk-test-openai-key');

            // Clean up
            delete process.env.OPENAI_API_KEY;
        });

        test('should get API key from global config file', async () => {
            // Mock no environment variable
            delete process.env.OPENAI_API_KEY;

            // Mock config file exists and contains API key
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                apiKeys: {
                    openai: 'sk-config-openai-key'
                }
            });

            const apiKey = await apiKeyManager.getAPIKey('openai');

            expect(apiKey).toBe('sk-config-openai-key');
            expect(mockFs.readJSON).toHaveBeenCalledWith('/home/user/.devlift/config.json');
        });

        test('should prompt for API key if not found', async () => {
            // Mock no environment variable
            delete process.env.OPENAI_API_KEY;

            // Mock no config file
            mockFs.pathExists.mockResolvedValue(false);

            // Mock user input
            mockInquirer.prompt.mockResolvedValue({
                apiKey: 'sk-user-input-key',
                saveKey: true
            });

            // Mock successful save
            mockFs.ensureDir.mockResolvedValue();
            mockFs.writeJSON.mockResolvedValue();

            const apiKey = await apiKeyManager.getAPIKey('openai');

            expect(apiKey).toBe('sk-user-input-key');
            expect(mockInquirer.prompt).toHaveBeenCalledWith([
                {
                    type: 'password',
                    name: 'apiKey',
                    message: 'Enter your OpenAI API key:',
                    validate: expect.any(Function)
                },
                {
                    type: 'confirm',
                    name: 'saveKey',
                    message: 'Save this API key for future use?',
                    default: true
                }
            ]);
        });

        test('should handle API key validation during prompt', async () => {
            delete process.env.OPENAI_API_KEY;
            mockFs.pathExists.mockResolvedValue(false);

            // Get the validation function from the prompt call
            mockInquirer.prompt.mockImplementation(async (questions: any) => {
                const validator = questions[0].validate;

                // Test validation
                expect(validator('invalid-key')).toBe('Invalid OpenAI API key format. Expected format: sk-...');
                expect(validator('sk-valid-key-format')).toBe(true);

                return {
                    apiKey: 'sk-valid-key-format',
                    saveKey: false
                };
            });

            const apiKey = await apiKeyManager.getAPIKey('openai');
            expect(apiKey).toBe('sk-valid-key-format');
        });

        test('should return null for unknown provider', async () => {
            const apiKey = await apiKeyManager.getAPIKey('unknown-provider' as any);
            expect(apiKey).toBeNull();
        });
    });

    describe('setAPIKey', () => {
        test('should save API key to global config', async () => {
            // Mock existing config
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                apiKeys: {
                    anthropic: 'sk-ant-existing-key'
                },
                otherSettings: 'value'
            });

            mockFs.writeJSON.mockResolvedValue();

            await apiKeyManager.setAPIKey('openai', 'sk-new-openai-key');

            expect(mockFs.writeJSON).toHaveBeenCalledWith('/home/user/.devlift/config.json', {
                apiKeys: {
                    anthropic: 'sk-ant-existing-key',
                    openai: 'sk-new-openai-key'
                },
                otherSettings: 'value'
            }, { spaces: 2 });
        });

        test('should create new config file if none exists', async () => {
            mockFs.pathExists.mockResolvedValue(false);
            mockFs.ensureDir.mockResolvedValue();
            mockFs.writeJSON.mockResolvedValue();

            await apiKeyManager.setAPIKey('openai', 'sk-new-openai-key');

            expect(mockFs.ensureDir).toHaveBeenCalledWith('/home/user/.devlift');
            expect(mockFs.writeJSON).toHaveBeenCalledWith('/home/user/.devlift/config.json', {
                apiKeys: {
                    openai: 'sk-new-openai-key'
                }
            }, { spaces: 2 });
        });

        test('should handle file system errors gracefully', async () => {
            mockFs.pathExists.mockRejectedValue(new Error('Permission denied'));

            await expect(apiKeyManager.setAPIKey('openai', 'sk-test-key'))
                .rejects.toThrow('Failed to save API key: Permission denied');
        });
    });

    describe('promptForAPIKey', () => {
        test('should prompt for OpenAI API key with correct validation', async () => {
            mockInquirer.prompt.mockResolvedValue({
                apiKey: 'sk-openai-key',
                saveKey: true
            });

            const result = await apiKeyManager.promptForAPIKey('openai');

            expect(result).toEqual({
                apiKey: 'sk-openai-key',
                saveKey: true
            });

            expect(mockInquirer.prompt).toHaveBeenCalledWith([
                {
                    type: 'password',
                    name: 'apiKey',
                    message: 'Enter your OpenAI API key:',
                    validate: expect.any(Function)
                },
                {
                    type: 'confirm',
                    name: 'saveKey',
                    message: 'Save this API key for future use?',
                    default: true
                }
            ]);
        });

        test('should prompt for Anthropic API key', async () => {
            mockInquirer.prompt.mockResolvedValue({
                apiKey: 'sk-ant-anthropic-key',
                saveKey: false
            });

            const result = await apiKeyManager.promptForAPIKey('anthropic');

            expect(result.apiKey).toBe('sk-ant-anthropic-key');
            expect(mockInquirer.prompt).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: 'Enter your Anthropic API key:'
                    })
                ])
            );
        });

        test('should prompt for Google API key', async () => {
            mockInquirer.prompt.mockResolvedValue({
                apiKey: 'AIza-google-key',
                saveKey: true
            });

            const result = await apiKeyManager.promptForAPIKey('google');

            expect(result.apiKey).toBe('AIza-google-key');
            expect(mockInquirer.prompt).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: 'Enter your Google AI API key:'
                    })
                ])
            );
        });

        test('should throw error for unknown provider', async () => {
            await expect(apiKeyManager.promptForAPIKey('unknown' as any))
                .rejects.toThrow('Unknown provider: unknown');
        });
    });

    describe('validateAPIKey', () => {
        test('should validate OpenAI API keys', () => {
            expect(apiKeyManager.validateAPIKey('openai', 'sk-1234567890abcdef')).toBe(true);
            expect(apiKeyManager.validateAPIKey('openai', 'sk-proj-1234567890abcdef')).toBe(true);
            expect(apiKeyManager.validateAPIKey('openai', 'invalid-key')).toBe(false);
            expect(apiKeyManager.validateAPIKey('openai', '')).toBe(false);
            expect(apiKeyManager.validateAPIKey('openai', null as any)).toBe(false);
        });

        test('should validate Anthropic API keys', () => {
            expect(apiKeyManager.validateAPIKey('anthropic', 'sk-ant-1234567890abcdef')).toBe(true);
            expect(apiKeyManager.validateAPIKey('anthropic', 'sk-1234567890abcdef')).toBe(false);
            expect(apiKeyManager.validateAPIKey('anthropic', 'invalid-key')).toBe(false);
        });

        test('should validate Google API keys', () => {
            expect(apiKeyManager.validateAPIKey('google', 'AIza1234567890abcdef')).toBe(true);
            expect(apiKeyManager.validateAPIKey('google', 'sk-1234567890abcdef')).toBe(false);
            expect(apiKeyManager.validateAPIKey('google', 'invalid-key')).toBe(false);
        });

        test('should return false for unknown provider', () => {
            expect(apiKeyManager.validateAPIKey('unknown' as any, 'any-key')).toBe(false);
        });
    });

    describe('removeAPIKey', () => {
        test('should remove API key from config', async () => {
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                apiKeys: {
                    openai: 'sk-openai-key',
                    anthropic: 'sk-ant-key'
                },
                otherSettings: 'value'
            });
            mockFs.writeJSON.mockResolvedValue();

            await apiKeyManager.removeAPIKey('openai');

            expect(mockFs.writeJSON).toHaveBeenCalledWith('/home/user/.devlift/config.json', {
                apiKeys: {
                    anthropic: 'sk-ant-key'
                },
                otherSettings: 'value'
            }, { spaces: 2 });
        });

        test('should handle removing non-existent key gracefully', async () => {
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                apiKeys: {
                    anthropic: 'sk-ant-key'
                }
            });
            mockFs.writeJSON.mockResolvedValue();

            await apiKeyManager.removeAPIKey('openai');

            // Should still write the config even if key wasn't there
            expect(mockFs.writeJSON).toHaveBeenCalled();
        });

        test('should handle missing config file gracefully', async () => {
            mockFs.pathExists.mockResolvedValue(false);

            // Should not throw an error
            await expect(apiKeyManager.removeAPIKey('openai')).resolves.not.toThrow();
        });
    });

    describe('listSavedProviders', () => {
        test('should list providers with saved API keys', async () => {
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                apiKeys: {
                    openai: 'sk-openai-key',
                    anthropic: 'sk-ant-key'
                }
            });

            const providers = await apiKeyManager.listSavedProviders();

            expect(providers).toEqual(['openai', 'anthropic']);
        });

        test('should return empty array if no config file', async () => {
            mockFs.pathExists.mockResolvedValue(false);

            const providers = await apiKeyManager.listSavedProviders();

            expect(providers).toEqual([]);
        });

        test('should return empty array if no API keys section', async () => {
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                otherSettings: 'value'
            });

            const providers = await apiKeyManager.listSavedProviders();

            expect(providers).toEqual([]);
        });
    });

    describe('environment variable detection', () => {
        test('should detect various environment variable formats', async () => {
            // Test all supported environment variable formats
            const testCases = [
                { provider: 'openai', envVars: ['OPENAI_API_KEY', 'OPENAI_KEY'] },
                { provider: 'anthropic', envVars: ['ANTHROPIC_API_KEY', 'ANTHROPIC_KEY'] },
                { provider: 'google', envVars: ['GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY'] }
            ];

            for (const testCase of testCases) {
                for (const envVar of testCase.envVars) {
                    // Set environment variable
                    process.env[envVar] = `test-key-for-${testCase.provider}`;

                    const apiKey = await apiKeyManager.getAPIKey(testCase.provider as any);
                    expect(apiKey).toBe(`test-key-for-${testCase.provider}`);

                    // Clean up
                    delete process.env[envVar];
                }
            }
        });
    });
}); 