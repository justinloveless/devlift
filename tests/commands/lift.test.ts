import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create manual mocks
const mockSimpleGit = jest.fn() as jest.MockedFunction<any>;
const mockClone = jest.fn() as jest.MockedFunction<any>;
const mockGetInputType = jest.fn() as jest.MockedFunction<any>;
const mockGetClonePath = jest.fn() as jest.MockedFunction<any>;
const mockLoadConfig = jest.fn() as jest.MockedFunction<any>;
const mockInquirerPrompt = jest.fn() as jest.MockedFunction<any>;
const mockPathExistsSync = jest.fn() as jest.MockedFunction<any>;
const mockExecutionEngineRun = jest.fn() as jest.MockedFunction<any>;
const mockExecutionEngine = jest.fn() as jest.MockedFunction<any>;
const mockPathResolve = jest.fn() as jest.MockedFunction<any>;
const mockPathJoin = jest.fn() as jest.MockedFunction<any>;

// Set up simple-git chain
mockSimpleGit.mockReturnValue({
    clone: mockClone
});

// Mock all modules before importing
jest.unstable_mockModule('simple-git', () => ({
    simpleGit: mockSimpleGit
}));

jest.unstable_mockModule('../../src/utils/validation.js', () => ({
    getInputType: mockGetInputType,
    isValidGitUrl: jest.fn().mockReturnValue(true),
    isValidLocalPath: jest.fn().mockReturnValue(true)
}));

jest.unstable_mockModule('path', () => ({
    default: {
        resolve: mockPathResolve,
        join: mockPathJoin
    }
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
        // Check help output contains repo_url_or_path information
        const helpOutput = liftCommand.helpInformation();
        // Remove all line breaks and normalize whitespace to be immune to terminal width differences
        const normalizedOutput = helpOutput.replace(/\s+/g, ' ').trim();

        expect(normalizedOutput).toContain('repo_url_or_path');
        expect(normalizedOutput).toContain('repository');
        expect(normalizedOutput).toContain('local');
        expect(normalizedOutput).toContain('lift');
    });

    it('should have install alias', () => {
        // Check that the command has aliases and includes 'install'
        expect(Array.isArray(liftCommand.aliases())).toBe(true);
        expect(liftCommand.aliases()).toContain('install');
        // Check help shows the alias
        const helpOutput = liftCommand.helpInformation();
        expect(helpOutput).toContain('lift|install');
    });

    it('should throw error for invalid input (neither URL nor path)', async () => {
        mockGetInputType.mockReturnValue('invalid');

        await expect(liftCommand.parseAsync(['node', 'test', 'invalid-input']))
            .rejects.toThrow('Invalid input. Please provide either a valid Git repository URL or an existing local directory path.');
    });

    // URL-based tests
    describe('URL input tests', () => {
        it('should clone repo and run execution engine when valid config is found', async () => {
            const repoUrl = 'https://github.com/test-user/test-repo.git';
            const clonePath = '/mock/path/github.com/test-user/test-repo';
            const mockConfig = {
                version: '1',
                setup_steps: [{ name: 'test', type: 'shell' as const, command: 'echo test' }]
            };

            mockGetInputType.mockReturnValue('url');
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

            mockGetInputType.mockReturnValue('url');
            mockGetClonePath.mockReturnValue(clonePath);
            mockClone.mockResolvedValue(undefined);
            mockLoadConfig.mockReturnValue(null); // No config found
            mockPathJoin.mockReturnValue('/mock/path/package.json');
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

            mockGetInputType.mockReturnValue('url');
            mockGetClonePath.mockReturnValue(clonePath);
            mockClone.mockResolvedValue(undefined);
            mockLoadConfig.mockReturnValue(null); // No config found
            mockPathJoin.mockReturnValue('/mock/path/package.json');
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
    });

    // Local path tests
    describe('Local path input tests', () => {
        it('should use local repo and run execution engine when valid config is found', async () => {
            const localPath = '/existing/local/repo';
            const resolvedPath = '/resolved/local/repo';
            const mockConfig = {
                version: '1',
                setup_steps: [{ name: 'test', type: 'shell' as const, command: 'echo test' }]
            };

            mockGetInputType.mockReturnValue('path');
            mockPathResolve.mockReturnValue(resolvedPath);
            mockPathJoin.mockReturnValue('/resolved/local/repo/.git');
            mockPathExistsSync.mockReturnValue(true); // .git directory exists
            mockLoadConfig.mockReturnValue(mockConfig);

            await liftCommand.parseAsync(['node', 'test', localPath]);

            expect(mockPathResolve).toHaveBeenCalledWith(localPath);
            expect(mockClone).not.toHaveBeenCalled(); // Should not clone
            expect(mockLoadConfig).toHaveBeenCalledWith(resolvedPath);
            expect(mockExecutionEngine).toHaveBeenCalledWith(mockConfig, resolvedPath);
            expect(mockExecutionEngineRun).toHaveBeenCalled();
        });

        it('should show warning when local directory is not a git repository', async () => {
            const localPath = '/existing/local/non-git';
            const resolvedPath = '/resolved/local/non-git';
            const mockConfig = {
                version: '1',
                setup_steps: [{ name: 'test', type: 'shell' as const, command: 'echo test' }]
            };

            mockGetInputType.mockReturnValue('path');
            mockPathResolve.mockReturnValue(resolvedPath);
            mockPathJoin.mockReturnValue('/resolved/local/non-git/.git');
            mockPathExistsSync.mockReturnValue(false); // .git directory doesn't exist
            mockLoadConfig.mockReturnValue(mockConfig);

            await liftCommand.parseAsync(['node', 'test', localPath]);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Warning: This directory is not a Git repository.')
            );
            expect(mockExecutionEngine).toHaveBeenCalledWith(mockConfig, resolvedPath);
            expect(mockExecutionEngineRun).toHaveBeenCalled();
        });

        it('should infer setup steps for local repo when no config found but package.json exists', async () => {
            const localPath = '/existing/local/repo';
            const resolvedPath = '/resolved/local/repo';

            mockGetInputType.mockReturnValue('path');
            mockPathResolve.mockReturnValue(resolvedPath);
            mockPathJoin.mockReturnValueOnce('/resolved/local/repo/.git'); // For git check
            mockPathJoin.mockReturnValueOnce('/resolved/local/repo/package.json'); // For package.json check
            mockPathExistsSync.mockReturnValueOnce(true); // .git exists
            mockPathExistsSync.mockReturnValueOnce(true); // package.json exists
            mockLoadConfig.mockReturnValue(null); // No config found

            await liftCommand.parseAsync(['node', 'test', localPath]);

            expect(mockExecutionEngine).toHaveBeenCalledWith({
                version: '1',
                setup_steps: [{
                    name: 'Install npm dependencies',
                    type: 'package-manager',
                    command: 'install'
                }]
            }, resolvedPath);
            expect(mockExecutionEngineRun).toHaveBeenCalled();
        });
    });

    // Error handling tests
    describe('Error handling', () => {
        it('should handle errors gracefully and re-throw them', async () => {
            const repoUrl = 'https://github.com/test-user/test-repo.git';
            const errorMessage = 'Git clone failed';

            mockGetInputType.mockReturnValue('url');
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

            mockGetInputType.mockReturnValue('url');
            mockGetClonePath.mockReturnValue('/mock/path');
            mockClone.mockRejectedValue(errorValue);

            await expect(liftCommand.parseAsync(['node', 'test', repoUrl]))
                .rejects.toBe(errorValue);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining(`An error occurred: ${errorValue}`)
            );
        });
    });
}); 