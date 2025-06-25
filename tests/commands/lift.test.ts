import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create manual mocks
const mockSimpleGit = jest.fn() as jest.MockedFunction<any>;
const mockClone = jest.fn() as jest.MockedFunction<any>;
const mockIsValidGitUrl = jest.fn() as jest.MockedFunction<any>;
const mockGetClonePath = jest.fn() as jest.MockedFunction<any>;
const mockLoadConfig = jest.fn() as jest.MockedFunction<any>;
const mockInquirerPrompt = jest.fn() as jest.MockedFunction<any>;
const mockPathExistsSync = jest.fn() as jest.MockedFunction<any>;
const mockExecutionEngineRun = jest.fn() as jest.MockedFunction<any>;
const mockExecutionEngine = jest.fn() as jest.MockedFunction<any>;

// Set up simple-git chain
mockSimpleGit.mockReturnValue({
    clone: mockClone
});

// Mock all modules before importing
jest.unstable_mockModule('simple-git', () => ({
    simpleGit: mockSimpleGit
}));

jest.unstable_mockModule('../../src/utils/validation.js', () => ({
    isValidGitUrl: mockIsValidGitUrl
}));

jest.unstable_mockModule('../../src/utils/path.js', () => ({
    getClonePath: mockGetClonePath
}));

jest.unstable_mockModule('../../src/core/config.js', () => ({
    loadConfig: mockLoadConfig
}));

jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: mockInquirerPrompt
    }
}));

jest.unstable_mockModule('fs-extra', () => ({
    default: {
        pathExistsSync: mockPathExistsSync
    }
}));

jest.unstable_mockModule('../../src/core/execution-engine.js', () => ({
    ExecutionEngine: mockExecutionEngine
}));

// Import after mocking
const { default: liftCommand } = await import('../../src/commands/lift.js');

describe('Lift Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console methods to avoid cluttering test output
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });

        // Set up execution engine mock
        mockExecutionEngine.mockImplementation(() => ({
            run: mockExecutionEngineRun
        }));
        mockExecutionEngineRun.mockResolvedValue(undefined);
    });

    it('should export a Command object', () => {
        expect(liftCommand).toBeDefined();
        expect(liftCommand.name()).toBe('lift');
        expect(liftCommand.description()).toBe('Lift a repository into a local development environment');
    });

    it('should be a valid commander.js command', () => {
        // Should have required Commander.js methods
        expect(typeof liftCommand.parseAsync).toBe('function');
        expect(typeof liftCommand.action).toBe('function');
    });

    it('should show help text with argument information', () => {
        // Check help output contains repo_url information
        const helpOutput = liftCommand.helpInformation();
        expect(helpOutput).toContain('repo_url');
        expect(helpOutput).toContain('URL of the repository to lift');
    });

    it('should throw error for invalid Git URL', async () => {
        mockIsValidGitUrl.mockReturnValue(false);

        await expect(liftCommand.parseAsync(['node', 'test', 'invalid-url']))
            .rejects.toThrow('Invalid Git repository URL.');
    });

    it('should clone repo and run execution engine when valid config is found', async () => {
        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const clonePath = '/mock/path/github.com/test-user/test-repo';
        const mockConfig = {
            version: '1',
            setup_steps: [{ name: 'test', type: 'shell' as const, command: 'echo test' }]
        };

        mockIsValidGitUrl.mockReturnValue(true);
        mockGetClonePath.mockReturnValue(clonePath);
        mockClone.mockResolvedValue(undefined);
        mockLoadConfig.mockReturnValue(mockConfig);

        await liftCommand.parseAsync(['node', 'test', repoUrl]);

        expect(mockClone).toHaveBeenCalledWith(repoUrl, clonePath);
        expect(mockLoadConfig).toHaveBeenCalledWith(clonePath);
        expect(mockExecutionEngine).toHaveBeenCalledWith(mockConfig, clonePath);
        expect(mockExecutionEngineRun).toHaveBeenCalled();
    });

    it('should infer setup steps when no config found but package.json exists', async () => {
        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const clonePath = '/mock/path/github.com/test-user/test-repo';

        mockIsValidGitUrl.mockReturnValue(true);
        mockGetClonePath.mockReturnValue(clonePath);
        mockClone.mockResolvedValue(undefined);
        mockLoadConfig.mockReturnValue(null); // No config found
        mockPathExistsSync.mockReturnValue(true); // package.json exists

        await liftCommand.parseAsync(['node', 'test', repoUrl]);

        // Should create inferred config and run execution engine
        expect(mockExecutionEngine).toHaveBeenCalledWith({
            version: '1',
            setup_steps: [{
                name: 'Install npm dependencies',
                type: 'package-manager',
                command: 'install'
            }]
        }, clonePath);
        expect(mockExecutionEngineRun).toHaveBeenCalled();
    });

    it('should prompt user when no config found and no package.json', async () => {
        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const clonePath = '/mock/path/github.com/test-user/test-repo';

        mockIsValidGitUrl.mockReturnValue(true);
        mockGetClonePath.mockReturnValue(clonePath);
        mockClone.mockResolvedValue(undefined);
        mockLoadConfig.mockReturnValue(null); // No config found
        mockPathExistsSync.mockReturnValue(false); // No package.json
        mockInquirerPrompt.mockResolvedValue({ proceed: true });

        await liftCommand.parseAsync(['node', 'test', repoUrl]);

        expect(mockInquirerPrompt).toHaveBeenCalledWith([{
            type: 'confirm',
            name: 'proceed',
            message: 'Would you like to create a new configuration file for this project?',
            default: true
        }]);
        expect(mockExecutionEngine).not.toHaveBeenCalled();
    });

    it('should abort when user declines to create new config', async () => {
        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const clonePath = '/mock/path/github.com/test-user/test-repo';

        mockIsValidGitUrl.mockReturnValue(true);
        mockGetClonePath.mockReturnValue(clonePath);
        mockClone.mockResolvedValue(undefined);
        mockLoadConfig.mockReturnValue(null);
        mockPathExistsSync.mockReturnValue(false);
        mockInquirerPrompt.mockResolvedValue({ proceed: false });

        await liftCommand.parseAsync(['node', 'test', repoUrl]);

        expect(console.log).toHaveBeenCalledWith('Setup aborted.');
        expect(mockExecutionEngine).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and re-throw them', async () => {
        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const errorMessage = 'Git clone failed';

        mockIsValidGitUrl.mockReturnValue(true);
        mockGetClonePath.mockReturnValue('/mock/path');
        mockClone.mockRejectedValue(new Error(errorMessage));

        await expect(liftCommand.parseAsync(['node', 'test', repoUrl]))
            .rejects.toThrow(errorMessage);

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining(`An error occurred: ${errorMessage}`)
        );
    });

    it('should handle non-Error exceptions', async () => {
        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const errorValue = 'String error';

        mockIsValidGitUrl.mockReturnValue(true);
        mockGetClonePath.mockReturnValue('/mock/path');
        mockClone.mockRejectedValue(errorValue);

        await expect(liftCommand.parseAsync(['node', 'test', repoUrl]))
            .rejects.toBe(errorValue);

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining(`An error occurred: ${errorValue}`)
        );
    });
}); 