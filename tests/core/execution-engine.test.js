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

    it('should do nothing if no setup steps are provided', async () => {
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');
        const { execa } = await import('execa');
        const config = { version: '1' }; // No setup property
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(execa).not.toHaveBeenCalled();
    });

    it('should skip a shell step if the user declines', async () => {
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');
        const { default: inquirer } = await import('inquirer');
        const { execa } = await import('execa');

        inquirer.prompt.mockResolvedValue({ proceed: false });
        const config = { setup: [{ type: 'shell', command: 'npm test' }] };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(inquirer.prompt).toHaveBeenCalled();
        expect(execa).not.toHaveBeenCalled();
    });
}); 