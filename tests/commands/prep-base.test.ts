import { jest } from '@jest/globals';

// Mock dependencies
const mockInquirer = {
    prompt: jest.fn()
};

const mockFs = {
    writeFileSync: jest.fn(),
    existsSync: jest.fn()
};

const mockYaml = {
    dump: jest.fn()
};

const mockConsole = {
    log: jest.fn(),
    error: jest.fn()
};

// Import the class we'll create
import { PrepBase, PrepMode, PrepOptions } from '../../src/commands/prep-base.js';

describe('PrepBase', () => {
    let prepBase: PrepBase;
    let mockDependencies: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDependencies = {
            inquirer: mockInquirer,
            fs: mockFs,
            yaml: mockYaml,
            console: mockConsole,
            process: { exit: jest.fn() }
        };
    });

    describe('mode selection', () => {
        it('should select interactive mode when interactive flag is set', async () => {
            const options: PrepOptions = { interactive: true };
            prepBase = new PrepBase(options, mockDependencies);

            const mode = await prepBase.selectMode();
            expect(mode).toBe(PrepMode.INTERACTIVE);
        });

        it('should select AI mode when ai flag is set', async () => {
            const options: PrepOptions = { ai: true };
            prepBase = new PrepBase(options, mockDependencies);

            const mode = await prepBase.selectMode();
            expect(mode).toBe(PrepMode.AI);
        });

        it('should select guided mode when guided flag is set', async () => {
            const options: PrepOptions = { guided: true };
            prepBase = new PrepBase(options, mockDependencies);

            const mode = await prepBase.selectMode();
            expect(mode).toBe(PrepMode.GUIDED);
        });

        it('should prompt user to choose mode when no flags are set', async () => {
            const options: PrepOptions = {};
            prepBase = new PrepBase(options, mockDependencies);

            mockInquirer.prompt.mockResolvedValueOnce({ mode: 'guided' });

            const mode = await prepBase.selectMode();

            expect(mockInquirer.prompt).toHaveBeenCalledWith([
                expect.objectContaining({
                    type: 'list',
                    name: 'mode',
                    message: 'How would you like to generate your configuration?',
                    choices: expect.arrayContaining([
                        expect.objectContaining({ value: 'guided' }),
                        expect.objectContaining({ value: 'ai' }),
                        expect.objectContaining({ value: 'interactive' })
                    ])
                })
            ]);
            expect(mode).toBe(PrepMode.GUIDED);
        });
    });

    describe('format selection', () => {
        it('should use provided format option', async () => {
            const options: PrepOptions = { format: 'json' };
            prepBase = new PrepBase(options, mockDependencies);

            const format = await prepBase.selectFormat();
            expect(format).toBe('json');
        });

        it('should prompt for format when not provided', async () => {
            const options: PrepOptions = {};
            prepBase = new PrepBase(options, mockDependencies);

            mockInquirer.prompt.mockResolvedValueOnce({ format: 'yaml' });

            const format = await prepBase.selectFormat();

            expect(mockInquirer.prompt).toHaveBeenCalledWith([
                expect.objectContaining({
                    type: 'list',
                    name: 'format',
                    message: 'Choose configuration file format:',
                    choices: expect.arrayContaining([
                        expect.objectContaining({ value: 'yaml' }),
                        expect.objectContaining({ value: 'json' })
                    ])
                })
            ]);
            expect(format).toBe('yaml');
        });
    });

    describe('existing config handling', () => {
        it('should prompt to overwrite existing config when force is false', async () => {
            const options: PrepOptions = { force: false };
            prepBase = new PrepBase(options, mockDependencies);

            // Mock config exists
            jest.doMock('../../src/core/config.js', () => ({
                configExists: jest.fn().mockReturnValue(true),
                getConfigFileInfo: jest.fn().mockReturnValue({ path: './dev.yml' })
            }));

            mockInquirer.prompt.mockResolvedValueOnce({ overwrite: true });

            const shouldContinue = await prepBase.checkExistingConfig('.');

            expect(mockInquirer.prompt).toHaveBeenCalledWith([
                expect.objectContaining({
                    type: 'confirm',
                    name: 'overwrite',
                    message: expect.stringContaining('already exists. Overwrite?')
                })
            ]);
            expect(shouldContinue).toBe(true);
        });

        it('should skip overwrite prompt when force is true', async () => {
            const options: PrepOptions = { force: true };
            prepBase = new PrepBase(options, mockDependencies);

            const shouldContinue = await prepBase.checkExistingConfig('.');

            expect(mockInquirer.prompt).not.toHaveBeenCalled();
            expect(shouldContinue).toBe(true);
        });
    });

    describe('config file writing', () => {
        it('should write YAML config file correctly', async () => {
            const options: PrepOptions = {};
            prepBase = new PrepBase(options, mockDependencies);

            const config = { version: '1', setup_steps: [] };
            mockYaml.dump.mockReturnValue('version: "1"\nsetup_steps: []\n');

            await prepBase.writeConfigFile(config, 'yaml', false);

            expect(mockYaml.dump).toHaveBeenCalledWith(config, expect.any(Object));
            expect(mockFs.writeFileSync).toHaveBeenCalledWith(
                'dev.yml',
                'version: "1"\nsetup_steps: []\n',
                'utf8'
            );
        });

        it('should write JSON config file with schema when requested', async () => {
            const options: PrepOptions = {};
            prepBase = new PrepBase(options, mockDependencies);

            const config = { version: '1', setup_steps: [] };

            await prepBase.writeConfigFile(config, 'json', true);

            expect(mockFs.writeFileSync).toHaveBeenCalledWith(
                'dev.json',
                expect.stringContaining('"$schema"'),
                'utf8'
            );
        });
    });

    describe('validation', () => {
        it('should validate format option', () => {
            expect(() => {
                new PrepBase({ format: 'invalid' as any }, mockDependencies);
            }).toThrow('Error: --format must be either "yaml" or "json"');
        });

        it('should validate provider option when ai is enabled', () => {
            expect(() => {
                new PrepBase({ ai: true, provider: 'invalid' as any }, mockDependencies);
            }).toThrow('Error: --provider must be one of: openai, anthropic, google');
        });
    });
}); 