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
            setup_steps: [{ type: 'shell', command: 'npm install', name: 'Install dependencies' }],
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
        const config = { setup_steps: [{ type: 'shell', command: 'npm test', name: 'Run tests' }] };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(inquirer.prompt).toHaveBeenCalled();
        expect(execa).not.toHaveBeenCalled();
    });

    it('should execute steps in the correct order based on depends_on', async () => {
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');
        const { default: inquirer } = await import('inquirer');
        const { execa } = await import('execa');

        inquirer.prompt.mockResolvedValue({ proceed: true });
        const config = {
            setup_steps: [
                { name: 'A', type: 'shell', command: 'echo A' },
                { name: 'B', type: 'shell', command: 'echo B', depends_on: ['A'] },
                { name: 'C', type: 'shell', command: 'echo C', depends_on: ['B'] }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        const calls = execa.mock.calls;
        expect(calls[0][0]).toBe('echo A');
        expect(calls[1][0]).toBe('echo B');
        expect(calls[2][0]).toBe('echo C');
    });

    it('should throw an error for a circular dependency', async () => {
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');
        const config = {
            setup_steps: [
                { name: 'A', type: 'shell', command: 'echo A', depends_on: ['C'] },
                { name: 'B', type: 'shell', command: 'echo B', depends_on: ['A'] },
                { name: 'C', type: 'shell', command: 'echo C', depends_on: ['B'] }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await expect(engine.run()).rejects.toThrow('Circular dependency detected in setup steps.');
    });

    it('should auto-detect the package manager if not specified', async () => {
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');
        const { default: fs } = await import('fs-extra');
        const { execa } = await import('execa');

        fs.pathExistsSync.mockImplementation((p) => p.endsWith('pnpm-lock.yaml'));
        const config = {
            setup_steps: [
                { name: 'Install Dependencies', type: 'package-manager', command: 'install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(execa).toHaveBeenCalledWith('pnpm install', { cwd: '/test/dir', stdio: 'inherit' });
    });
}); 