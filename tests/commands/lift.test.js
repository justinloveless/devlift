import { jest, describe, it, expect } from '@jest/globals';

// Mock dependencies
const cloneMock = jest.fn().mockResolvedValue();
jest.unstable_mockModule('simple-git', () => ({
    default: jest.fn(() => ({
        clone: cloneMock,
    })),
}));

jest.unstable_mockModule('../../src/core/config.js', () => ({
    loadConfig: jest.fn(),
    validateConfig: jest.fn(),
}));

jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: jest.fn().mockResolvedValue({ proceed: true }),
    },
}));

const runMock = jest.fn().mockResolvedValue();
const executionEngineMock = jest.fn(() => ({
    run: runMock,
}));

jest.unstable_mockModule('../../src/core/execution-engine.js', () => ({
    ExecutionEngine: executionEngineMock,
}));

describe('Lift Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should clone the repo and run the execution engine when a valid config is found', async () => {
        const { default: simpleGit } = await import('simple-git');
        const { loadConfig, validateConfig } = await import('../../src/core/config.js');
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');
        const { default: liftCommand } = await import('../../src/commands/lift.js');

        // Setup mocks
        const mockConfig = { version: '1', setup: [] };
        loadConfig.mockReturnValue(mockConfig);

        // Execute the command
        const repoUrl = 'https://github.com/test/repo.git';
        await liftCommand.parseAsync(['node', 'test', repoUrl]);

        // Assertions
        expect(cloneMock).toHaveBeenCalledWith(repoUrl, expect.any(String));
        expect(loadConfig).toHaveBeenCalled();
        expect(validateConfig).toHaveBeenCalledWith(mockConfig);
        expect(executionEngineMock).toHaveBeenCalledWith(mockConfig, expect.any(String));
        expect(runMock).toHaveBeenCalled();
    });

    it('should prompt the user if no config is found', async () => {
        const { default: inquirer } = await import('inquirer');
        const { loadConfig } = await import('../../src/core/config.js');
        const { default: liftCommand } = await import('../../src/commands/lift.js');

        // Setup mocks
        loadConfig.mockReturnValue(null);

        // Execute the command
        const repoUrl = 'https://github.com/test/repo.git';
        await liftCommand.parseAsync(['node', 'test', repoUrl]);

        // Assertions
        expect(loadConfig).toHaveBeenCalled();
        expect(inquirer.prompt).toHaveBeenCalled();
    });

    it('should exit if an invalid git URL is provided', async () => {
        const { default: liftCommand } = await import('../../src/commands/lift.js');
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { });
        const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

        await liftCommand.parseAsync(['node', 'test', 'invalid-url']);

        expect(mockExit).toHaveBeenCalledWith(1);
        mockExit.mockRestore();
        mockConsoleError.mockRestore();
    });

    it('should abort if user declines to create a new config', async () => {
        const { default: inquirer } = await import('inquirer');
        const { loadConfig } = await import('../../src/core/config.js');
        const { default: liftCommand } = await import('../../src/commands/lift.js');

        loadConfig.mockReturnValue(null);
        inquirer.prompt.mockResolvedValue({ proceed: false });

        await liftCommand.parseAsync(['node', 'test', 'https://github.com/test/repo.git']);

        expect(inquirer.prompt).toHaveBeenCalled();
    });
}); 