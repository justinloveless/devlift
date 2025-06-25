import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create manual mocks
const mockInquirerPrompt = jest.fn() as jest.MockedFunction<any>;
const mockPathExistsSync = jest.fn() as jest.MockedFunction<any>;
const mockWriteFileSync = jest.fn() as jest.MockedFunction<any>;
const mockYamlDump = jest.fn() as jest.MockedFunction<any>;

// Mock the modules before importing
jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: mockInquirerPrompt
    }
}));

jest.unstable_mockModule('fs-extra', () => ({
    default: {
        pathExistsSync: mockPathExistsSync,
        writeFileSync: mockWriteFileSync
    }
}));

jest.unstable_mockModule('js-yaml', () => ({
    default: {
        dump: mockYamlDump
    }
}));

// Import after mocking
const { default: prepCommand } = await import('../../src/commands/prep.js');

describe('Prep Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console.log to avoid cluttering test output
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    it('should export a Command object', () => {
        expect(prepCommand).toBeDefined();
        expect(prepCommand.name()).toBe('prep');
        expect(prepCommand.description()).toBe('Prepare a new dev.yml configuration file for the current project');
    });

    it('should be a valid commander.js command', () => {
        // Should have required Commander.js methods
        expect(typeof prepCommand.parseAsync).toBe('function');
        expect(typeof prepCommand.action).toBe('function');
    });

    it('should create a dev.yml file with user-provided steps', async () => {
        // No existing dev.yml file
        mockPathExistsSync.mockReturnValue(false);

        // User adds one step and then stops
        mockInquirerPrompt
            .mockResolvedValueOnce({ addStep: true })  // First: wants to add a step
            .mockResolvedValueOnce({
                type: 'shell',
                description: 'Install dependencies',
                command: 'npm install'
            })  // Second: step details
            .mockResolvedValueOnce({ addMore: false }); // Third: doesn't want to add more

        mockYamlDump.mockReturnValue('version: "1"\nsetup:\n  - type: shell\n    description: Install dependencies\n    command: npm install\n');

        // Execute the prep command action
        await prepCommand.parseAsync(['node', 'test']);

        expect(mockYamlDump).toHaveBeenCalledWith({
            version: '1',
            setup: [{
                type: 'shell',
                description: 'Install dependencies',
                command: 'npm install'
            }]
        });
        expect(mockWriteFileSync).toHaveBeenCalledWith('dev.yml', expect.any(String));
    });

    it('should create a config with no steps if user adds none', async () => {
        mockPathExistsSync.mockReturnValue(false);
        mockInquirerPrompt.mockResolvedValueOnce({ addStep: false }); // User doesn't want to add any steps
        mockYamlDump.mockReturnValue('version: "1"\nsetup: []\n');

        await prepCommand.parseAsync(['node', 'test']);

        expect(mockYamlDump).toHaveBeenCalledWith({
            version: '1',
            setup: []
        });
        expect(mockWriteFileSync).toHaveBeenCalledWith('dev.yml', expect.any(String));
    });

    it('should abort if user chooses not to overwrite existing dev.yml', async () => {
        // dev.yml already exists
        mockPathExistsSync.mockReturnValue(true);
        mockInquirerPrompt.mockResolvedValueOnce({ overwrite: false });

        await prepCommand.parseAsync(['node', 'test']);

        expect(mockYamlDump).not.toHaveBeenCalled();
        expect(mockWriteFileSync).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('Aborted.');
    });

    it('should overwrite existing dev.yml if user confirms', async () => {
        mockPathExistsSync.mockReturnValue(true);
        mockInquirerPrompt
            .mockResolvedValueOnce({ overwrite: true })  // User wants to overwrite
            .mockResolvedValueOnce({ addStep: false });  // User doesn't want to add steps
        mockYamlDump.mockReturnValue('version: "1"\nsetup: []\n');

        await prepCommand.parseAsync(['node', 'test']);

        expect(mockYamlDump).toHaveBeenCalled();
        expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it('should handle multiple steps added by user', async () => {
        mockPathExistsSync.mockReturnValue(false);

        mockInquirerPrompt
            .mockResolvedValueOnce({ addStep: true })     // First: wants to add a step
            .mockResolvedValueOnce({
                type: 'shell',
                description: 'Install deps',
                command: 'npm install'
            })                                            // Second: first step details
            .mockResolvedValueOnce({ addMore: true })     // Third: wants to add more
            .mockResolvedValueOnce({ addStep: true })     // Fourth: confirms adding another step
            .mockResolvedValueOnce({
                type: 'shell',
                description: 'Build project',
                command: 'npm run build'
            })                                            // Fifth: second step details
            .mockResolvedValueOnce({ addMore: false });   // Sixth: doesn't want to add more

        mockYamlDump.mockReturnValue('version: "1"\nsetup: [...]\n');

        await prepCommand.parseAsync(['node', 'test']);

        expect(mockYamlDump).toHaveBeenCalledWith({
            version: '1',
            setup: [
                {
                    type: 'shell',
                    description: 'Install deps',
                    command: 'npm install'
                },
                {
                    type: 'shell',
                    description: 'Build project',
                    command: 'npm run build'
                }
            ]
        });
    });
}); 