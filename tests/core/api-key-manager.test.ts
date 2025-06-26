import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { APIKeyManager, APIKeyManagerDependencies, AIProviderType } from '../../src/core/api-key-manager.js';

// Create simple mock objects
const mockFs = {
    pathExists: jest.fn(),
    readJSON: jest.fn(),
    writeJSON: jest.fn(),
    ensureDir: jest.fn()
};

const mockOs = {
    homedir: jest.fn()
};

const mockPath = {
    join: jest.fn(),
    dirname: jest.fn()
};

const mockInquirer = {
    prompt: jest.fn()
};

const mockProcess = {
    env: {}
};

const mockConsole = {
    warn: jest.fn()
};

describe('API Key Manager', () => {
    let apiKeyManager: APIKeyManager;

    const mockDeps: APIKeyManagerDependencies = {
        fs: mockFs as any,
        os: mockOs as any,
        path: mockPath as any,
        inquirer: mockInquirer as any,
        process: mockProcess as any,
        console: mockConsole as any
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up default mock responses
        mockOs.homedir.mockReturnValue('/home/user');
        mockPath.join.mockReturnValue('/home/user/.devlift/config.json');
        mockPath.dirname.mockReturnValue('/home/user/.devlift');
        mockFs.pathExists.mockResolvedValue(false);
        mockFs.readJSON.mockResolvedValue({});
        mockFs.writeJSON.mockResolvedValue(undefined);
        mockFs.ensureDir.mockResolvedValue(undefined);
        mockProcess.env = {}; // Reset environment variables

        apiKeyManager = new APIKeyManager(mockDeps);
    });

    describe('constructor', () => {
        it('should create config path correctly', () => {
            expect(mockOs.homedir).toHaveBeenCalled();
            expect(mockPath.join).toHaveBeenCalledWith('/home/user', '.devlift', 'config.json');
        });
    });

    describe('validateAPIKey', () => {
        it('should validate OpenAI API keys correctly', () => {
            expect(apiKeyManager.validateAPIKey('openai', 'sk-1234567890abcdef')).toBe(true);
            expect(apiKeyManager.validateAPIKey('openai', 'sk-proj-1234567890abcdef')).toBe(true);
            expect(apiKeyManager.validateAPIKey('openai', 'invalid-key')).toBe(false);
            expect(apiKeyManager.validateAPIKey('openai', '')).toBe(false);
        });

        it('should validate Anthropic API keys correctly', () => {
            expect(apiKeyManager.validateAPIKey('anthropic', 'sk-ant-1234567890abcdef')).toBe(true);
            expect(apiKeyManager.validateAPIKey('anthropic', 'sk-1234567890abcdef')).toBe(false);
            expect(apiKeyManager.validateAPIKey('anthropic', 'invalid-key')).toBe(false);
        });

        it('should validate Google API keys correctly', () => {
            expect(apiKeyManager.validateAPIKey('google', 'AIza1234567890abcdef')).toBe(true);
            expect(apiKeyManager.validateAPIKey('google', 'sk-1234567890abcdef')).toBe(false);
            expect(apiKeyManager.validateAPIKey('google', 'invalid-key')).toBe(false);
        });
    });

    describe('getAPIKey', () => {
        it('should return API key from environment variables', async () => {
            mockProcess.env = { OPENAI_API_KEY: 'sk-env-key-123' };

            const result = await apiKeyManager.getAPIKey('openai');

            expect(result).toBe('sk-env-key-123');
        });

        it('should return API key from config file when not in environment', async () => {
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                apiKeys: {
                    openai: 'sk-config-key-123'
                }
            });

            const result = await apiKeyManager.getAPIKey('openai');

            expect(result).toBe('sk-config-key-123');
        });

        it('should prompt user when no key is found', async () => {
            mockInquirer.prompt.mockResolvedValue({
                apiKey: 'sk-user-key-123',
                saveKey: false
            });

            const result = await apiKeyManager.getAPIKey('openai');

            expect(result).toBe('sk-user-key-123');
            expect(mockInquirer.prompt).toHaveBeenCalled();
        });

        it('should save key when user chooses to save', async () => {
            mockInquirer.prompt.mockResolvedValue({
                apiKey: 'sk-user-key-123',
                saveKey: true
            });

            const result = await apiKeyManager.getAPIKey('openai');

            expect(result).toBe('sk-user-key-123');
            expect(mockFs.writeJSON).toHaveBeenCalledWith(
                '/home/user/.devlift/config.json',
                expect.objectContaining({
                    apiKeys: expect.objectContaining({
                        openai: 'sk-user-key-123'
                    })
                }),
                { spaces: 2 }
            );
        });
    });

    describe('setAPIKey', () => {
        it('should save API key to new config file', async () => {
            await apiKeyManager.setAPIKey('openai', 'sk-test-key-123');

            expect(mockFs.ensureDir).toHaveBeenCalledWith('/home/user/.devlift');
            expect(mockFs.writeJSON).toHaveBeenCalledWith(
                '/home/user/.devlift/config.json',
                {
                    apiKeys: {
                        openai: 'sk-test-key-123'
                    }
                },
                { spaces: 2 }
            );
        });

        it('should update existing config file', async () => {
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                apiKeys: {
                    anthropic: 'sk-ant-existing-key'
                },
                otherSettings: 'value'
            });

            await apiKeyManager.setAPIKey('openai', 'sk-test-key-123');

            expect(mockFs.writeJSON).toHaveBeenCalledWith(
                '/home/user/.devlift/config.json',
                {
                    apiKeys: {
                        anthropic: 'sk-ant-existing-key',
                        openai: 'sk-test-key-123'
                    },
                    otherSettings: 'value'
                },
                { spaces: 2 }
            );
        });
    });

    describe('removeAPIKey', () => {
        it('should remove API key from config file', async () => {
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                apiKeys: {
                    openai: 'sk-test-key-123',
                    anthropic: 'sk-ant-test-key'
                }
            });

            await apiKeyManager.removeAPIKey('openai');

            expect(mockFs.writeJSON).toHaveBeenCalledWith(
                '/home/user/.devlift/config.json',
                {
                    apiKeys: {
                        anthropic: 'sk-ant-test-key'
                    }
                },
                { spaces: 2 }
            );
        });

        it('should handle missing config file gracefully', async () => {
            mockFs.pathExists.mockResolvedValue(false);

            await apiKeyManager.removeAPIKey('openai');

            expect(mockFs.writeJSON).not.toHaveBeenCalled();
        });
    });

    describe('listSavedProviders', () => {
        it('should return list of saved providers', async () => {
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                apiKeys: {
                    openai: 'sk-test-key-123',
                    anthropic: 'sk-ant-test-key'
                }
            });

            const result = await apiKeyManager.listSavedProviders();

            expect(result).toEqual(['openai', 'anthropic']);
        });

        it('should return empty array when no config file exists', async () => {
            mockFs.pathExists.mockResolvedValue(false);

            const result = await apiKeyManager.listSavedProviders();

            expect(result).toEqual([]);
        });

        it('should return empty array when no apiKeys in config', async () => {
            mockFs.pathExists.mockResolvedValue(true);
            mockFs.readJSON.mockResolvedValue({
                otherSettings: 'value'
            });

            const result = await apiKeyManager.listSavedProviders();

            expect(result).toEqual([]);
        });
    });

    describe('promptForAPIKey', () => {
        it('should prompt with correct validation for OpenAI', async () => {
            mockInquirer.prompt.mockResolvedValue({
                apiKey: 'sk-test-key-123',
                saveKey: true
            });

            const result = await apiKeyManager.promptForAPIKey('openai');

            expect(result).toEqual({
                apiKey: 'sk-test-key-123',
                saveKey: true
            });

            expect(mockInquirer.prompt).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'password',
                        name: 'apiKey',
                        message: 'Enter your OpenAI API key:'
                    })
                ])
            );
        });
    });
}); 