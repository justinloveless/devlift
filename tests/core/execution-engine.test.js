import { jest, describe, it, expect } from '@jest/globals';

// Mocks
jest.unstable_mockModule('fs-extra', () => ({
    default: {
        copy: jest.fn(),
        pathExistsSync: jest.fn(),
    },
}));

jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: jest.fn(),
    },
}));

jest.unstable_mockModule('execa', () => ({
    execa: jest.fn(),
}));

describe('ExecutionEngine', () => {
    it('should execute a shell command step', async () => {
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');
        const { default: inquirer } = await import('inquirer');
        const { execa } = await import('execa');

        // Setup
        inquirer.prompt.mockResolvedValue({ proceed: true });
        const config = {
            setup: [{ type: 'shell', command: 'npm install', description: 'Install dependencies' }],
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        // Execute
        await engine.run();

        // Assert
        expect(inquirer.prompt).toHaveBeenCalled();
        expect(execa).toHaveBeenCalledWith('npm install', { cwd: '/test/dir', stdio: 'inherit', shell: true });
    });
}); 