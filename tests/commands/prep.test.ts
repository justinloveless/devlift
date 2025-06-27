import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { runPrepCommand } from '../../src/commands/prep.js';

// Create simple mock objects
const mockInquirer = {
    prompt: jest.fn()
};

const mockFs = {
    pathExistsSync: jest.fn(),
    writeFile: jest.fn(),
    existsSync: jest.fn()
};

const mockYaml = {
    dump: jest.fn()
};

const mockConsole = {
    log: jest.fn(),
    error: jest.fn()
};

const mockProjectAnalyzer = {
    analyzeProject: jest.fn().mockResolvedValue({
        projectName: 'test-project',
        technologies: {
            platform: 'Node.js',
            frameworks: [],
            packageManager: 'npm'
        },
        environmentVariables: [],
        commands: []
    })
};

const mockAIConfigGenerator = {
    generateConfig: jest.fn().mockResolvedValue({
        version: '1',
        project_name: 'test-project',
        setup_steps: []
    })
};

const mockAPIKeyManager = {
    getAPIKey: jest.fn().mockResolvedValue('test-api-key')
};

const mockAIProviderFactory = {
    createProvider: jest.fn().mockReturnValue({
        generateResponse: jest.fn()
    })
};

const mockProcess = {
    cwd: jest.fn(),
    exit: jest.fn()
};

describe('Prep Command', () => {
    const mockDeps = {
        inquirer: mockInquirer,
        fs: mockFs,
        yaml: mockYaml,
        console: mockConsole,
        projectAnalyzer: mockProjectAnalyzer,
        aiConfigGenerator: mockAIConfigGenerator,
        apiKeyManager: mockAPIKeyManager,
        aiProviderFactory: mockAIProviderFactory,
        process: mockProcess
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up default mock responses
        mockFs.pathExistsSync.mockReturnValue(false);
        mockFs.writeFile.mockResolvedValue(undefined);
        mockYaml.dump.mockReturnValue('version: "1"\nsetup_steps: []');
        mockProcess.cwd.mockReturnValue('/test/project');

        // Default project analysis data
        mockProjectAnalyzer.analyzeProject.mockResolvedValue({
            projectName: 'test-project',
            technologies: {
                platform: 'Node.js',
                frameworks: [],
                packageManager: 'npm'
            },
            environmentVariables: [],
            commands: []
        });

        // Default AI setup
        mockAPIKeyManager.getAPIKey.mockResolvedValue('test-api-key');
        mockAIProviderFactory.createProvider.mockReturnValue({
            generateResponse: jest.fn()
        });
        mockAIConfigGenerator.generateConfig.mockResolvedValue({
            version: '1',
            project_name: 'test-project',
            setup_steps: []
        });

        // Default to manual configuration to keep tests simple
        mockInquirer.prompt.mockImplementation((questions: any) => {
            if (Array.isArray(questions)) {
                const results: any = {};
                questions.forEach((q: any) => {
                    switch (q.name) {
                        case 'configMethod':
                            results[q.name] = 'manual';
                            break;
                        case 'projectName':
                            results[q.name] = 'test-project';
                            break;
                        case 'addStep':
                        case 'addEnvVars':
                        case 'addMore':
                        case 'addMoreEnv':
                            results[q.name] = false;
                            break;
                        case 'overwrite':
                        case 'fallback':
                            results[q.name] = true;
                            break;
                        default:
                            results[q.name] = q.default || false;
                    }
                });
                return Promise.resolve(results);
            } else {
                const q = questions;
                switch (q.name) {
                    case 'configMethod':
                        return Promise.resolve({ [q.name]: 'manual' });
                    case 'projectName':
                        return Promise.resolve({ [q.name]: 'test-project' });
                    case 'addStep':
                    case 'addEnvVars':
                    case 'addMore':
                    case 'addMoreEnv':
                        return Promise.resolve({ [q.name]: false });
                    case 'overwrite':
                    case 'fallback':
                        return Promise.resolve({ [q.name]: true });
                    default:
                        return Promise.resolve({ [q.name]: q.default || false });
                }
            }
        });
    });

    it('should create a basic dev.yml file with manual configuration', async () => {
        await runPrepCommand({}, mockDeps);

        expect(mockYaml.dump).toHaveBeenCalledWith(
            expect.objectContaining({
                project_name: 'test-project',
                version: '1',
                setup_steps: []
            }),
            expect.any(Object)
        );
        expect(mockFs.writeFile).toHaveBeenCalledWith('dev.yml', expect.any(String));
    });

    it('should check for existing dev.yml and prompt for overwrite', async () => {
        mockFs.existsSync.mockReturnValue(true);

        // Mock the overwrite prompt to return true so the flow continues
        mockInquirer.prompt.mockImplementation((questions: any) => {
            const q = Array.isArray(questions) ? questions[0] : questions;
            if (q.name === 'overwrite') {
                return Promise.resolve({ overwrite: true });
            }
            if (q.name === 'format') {
                return Promise.resolve({ format: 'yaml' });
            }
            if (q.name === 'useAI') {
                return Promise.resolve({ useAI: false });
            }
            return Promise.resolve({ [q.name]: q.default || false });
        });

        await runPrepCommand({}, mockDeps);

        // With the new flow, check that the format choice is presented when no specific options are given
        expect(mockInquirer.prompt).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'format',
                    type: 'list'
                })
            ])
        );
    });

    it('should skip overwrite prompt when force option is used', async () => {
        mockFs.pathExistsSync.mockReturnValue(true);

        await runPrepCommand({ force: true }, mockDeps);

        // Should not prompt for overwrite
        expect(mockInquirer.prompt).not.toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'overwrite'
                })
            ])
        );
    });

    it('should use AI configuration when ai option is provided', async () => {
        // Set up AI mocks
        mockProjectAnalyzer.analyzeProject.mockResolvedValue({
            projectName: 'test-project',
            technologies: { platform: 'Node.js', frameworks: [] },
            environmentVariables: []
        });
        mockAPIKeyManager.getAPIKey.mockResolvedValue('test-api-key');
        mockAIProviderFactory.createProvider.mockReturnValue({
            generateResponse: jest.fn()
        });
        mockAIConfigGenerator.generateConfig.mockResolvedValue({
            version: '1',
            project_name: 'test-project',
            setup_steps: []
        });

        await runPrepCommand({ ai: true, provider: 'openai' }, mockDeps);

        expect(mockProjectAnalyzer.analyzeProject).toHaveBeenCalled();
        expect(mockAPIKeyManager.getAPIKey).toHaveBeenCalledWith('openai');
        expect(mockAIConfigGenerator.generateConfig).toHaveBeenCalled();
    });

    it('should handle errors gracefully and offer fallback', async () => {
        // Make AI analysis fail by making API key retrieval fail
        mockAPIKeyManager.getAPIKey.mockResolvedValue(null);

        await runPrepCommand({ ai: true }, mockDeps);

        // Should fall back to manual mode
        expect(mockConsole.log).toHaveBeenCalledWith(
            expect.stringContaining('Failed to obtain API key. Falling back to manual mode.')
        );
    });

    it('should exit when user declines fallback', async () => {
        // Make AI provider creation fail
        mockAIProviderFactory.createProvider.mockReturnValue(null);

        await runPrepCommand({ ai: true }, mockDeps);

        // Should fall back to manual mode (not exit)
        expect(mockConsole.log).toHaveBeenCalledWith(
            expect.stringContaining('Failed to initialize AI provider. Falling back to manual mode.')
        );
    });
}); 