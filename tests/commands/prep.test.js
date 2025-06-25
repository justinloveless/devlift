import { jest, describe, it, expect } from '@jest/globals';
import yaml from 'js-yaml';

// Mocks
jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: jest.fn(),
    },
}));
jest.unstable_mockModule('fs-extra', () => ({
    default: {
        writeFileSync: jest.fn(),
        pathExistsSync: jest.fn().mockReturnValue(false),
    },
}));

describe('Prep Command', () => {
    it('should generate a correct dev.yml from user input', async () => {
        const { default: inquirer } = await import('inquirer');
        const { default: fs } = await import('fs-extra');
        const { default: prepCommand } = await import('../../src/commands/prep.js');

        // Simulate user input
        inquirer.prompt
            .mockResolvedValueOnce({ addStep: true })
            .mockResolvedValueOnce({
                type: 'shell',
                description: 'Install dependencies',
                command: 'npm install',
            })
            .mockResolvedValueOnce({ addMore: false });

        // Run the command
        await prepCommand.parseAsync(['node', 'test']);

        // Expected YAML output
        const expectedConfig = {
            version: '1',
            setup: [
                {
                    type: 'shell',
                    description: 'Install dependencies',
                    command: 'npm install',
                },
            ],
        };
        const expectedYaml = yaml.dump(expectedConfig);

        // Assert
        expect(fs.writeFileSync).toHaveBeenCalledWith('dev.yml', expectedYaml);
    });

    it('should abort if user chooses not to overwrite existing file', async () => {
        const { default: inquirer } = await import('inquirer');
        const { default: fs } = await import('fs-extra');
        const { default: prepCommand } = await import('../../src/commands/prep.js');

        fs.pathExistsSync.mockReturnValue(true);
        inquirer.prompt.mockResolvedValue({ overwrite: false });

        await prepCommand.parseAsync(['node', 'test']);

        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should create a config with no steps if user adds none', async () => {
        const { default: inquirer } = await import('inquirer');
        const { default: fs } = await import('fs-extra');
        const { default: prepCommand } = await import('../../src/commands/prep.js');

        fs.pathExistsSync.mockReturnValue(false);
        inquirer.prompt.mockResolvedValue({ addStep: false });

        await prepCommand.parseAsync(['node', 'test']);

        const expectedConfig = { version: '1', setup: [] };
        const expectedYaml = yaml.dump(expectedConfig);

        expect(fs.writeFileSync).toHaveBeenCalledWith('dev.yml', expectedYaml);
    });
}); 