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

jest.unstable_mockModule('fs-extra', () => ({
    default: {
        pathExistsSync: jest.fn(),
        readFileSync: jest.fn(),
    },
}));

describe('Lift Command', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        const { default: fs } = await import('fs-extra');
        fs.pathExistsSync.mockReturnValue(false); // Default to no files existing
    });

    it('should clone the repo and run the execution engine when a valid config is found', async () => {
        const { default: simpleGit } = await import('simple-git');
        const { loadConfig, validateConfig } = await import('../../src/core/config.js');
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');
        const { default: liftCommand } = await import('../../src/commands/lift.js');

        // Setup mocks
        const mockConfig = { version: '1', setup: [] };
        loadConfig.mockReturnValue(mockConfig);
        const { default: fs } = await import('fs-extra');
        fs.pathExistsSync.mockImplementation((p) => p.endsWith('package.json'));

        // Execute the command
        const repoUrl = 'https://github.com/test/repo.git';
        await liftCommand.parseAsync(['node', 'test', repoUrl]);

        // Assertions
        expect(cloneMock).toHaveBeenCalledWith(repoUrl, expect.any(String));
        expect(loadConfig).toHaveBeenCalled();
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

    it('should throw an error if an invalid git URL is provided', async () => {
        const { default: liftCommand } = await import('../../src/commands/lift.js');

        await expect(liftCommand.parseAsync(['node', 'test', 'invalid-url'])).rejects.toThrow('Invalid Git repository URL.');
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

    it('should infer setup steps if no config is found and a package.json exists', async () => {
        const { loadConfig } = await import('../../src/core/config.js');
        const { default: liftCommand } = await import('../../src/commands/lift.js');
        const { default: fs } = await import('fs-extra');

        // Setup mocks
        loadConfig.mockReturnValue(null);
        fs.pathExistsSync.mockReturnValue(true);

        // Execute the command
        const repoUrl = 'https://github.com/test/repo.git';
        await liftCommand.parseAsync(['node', 'test', repoUrl]);

        // Assertions
        expect(loadConfig).toHaveBeenCalled();
        expect(executionEngineMock).toHaveBeenCalledWith(
            expect.objectContaining({
                setup_steps: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Install npm dependencies',
                        type: 'package-manager',
                        command: 'install'
                    })
                ])
            }),
            expect.any(String)
        );
    });
}); 