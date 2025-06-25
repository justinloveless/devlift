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

describe('Init Command', () => {
    it('should generate a correct dev.yml from user input', async () => {
        const { default: inquirer } = await import('inquirer');
        const { default: fs } = await import('fs-extra');
        const { default: initCommand } = await import('../../src/commands/init.js');

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
        await initCommand.parseAsync(['node', 'test']);

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
}); 