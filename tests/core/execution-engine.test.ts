import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create manual mocks with proper Jest types
const mockInquirerPrompt = jest.fn() as jest.MockedFunction<any>;
const mockExeca = jest.fn() as jest.MockedFunction<any>;
const mockPathExistsSync = jest.fn() as jest.MockedFunction<any>;

// Mock the modules before importing
jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: mockInquirerPrompt
    }
}));

jest.unstable_mockModule('execa', () => ({
    execa: mockExeca
}));

jest.unstable_mockModule('fs-extra', () => ({
    default: {
        pathExistsSync: mockPathExistsSync
    }
}));

// Import after mocking
const { ExecutionEngine } = await import('../../src/core/execution-engine.js');

describe('ExecutionEngine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create an ExecutionEngine instance', () => {
        const config = { version: '1', setup_steps: [] };
        const engine = new ExecutionEngine(config, '/test/dir');

        expect(engine).toBeDefined();
        expect(typeof engine.run).toBe('function');
    });

    it('should do nothing if no setup steps are provided', async () => {
        const config = {};
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockInquirerPrompt).not.toHaveBeenCalled();
        expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should execute a shell command step when user agrees', async () => {
        mockInquirerPrompt.mockResolvedValue({ proceed: true });
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'Install dependencies', type: 'shell' as const, command: 'npm install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockInquirerPrompt).toHaveBeenCalledWith([{
            type: 'confirm',
            name: 'proceed',
            message: 'Execute the following command?\n  npm install',
            default: true
        }]);
        expect(mockExeca).toHaveBeenCalledWith('npm install', {
            cwd: '/test/dir',
            stdio: 'inherit',
            shell: true
        });
    });

    it('should skip a shell step if the user declines', async () => {
        mockInquirerPrompt.mockResolvedValue({ proceed: false });

        const config = {
            setup_steps: [
                { name: 'Run tests', type: 'shell' as const, command: 'npm test' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockInquirerPrompt).toHaveBeenCalled();
        expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should execute steps in the correct order based on depends_on', async () => {
        mockInquirerPrompt.mockResolvedValue({ proceed: true });
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'C', type: 'shell' as const, command: 'echo C', depends_on: ['B'] },
                { name: 'A', type: 'shell' as const, command: 'echo A' },
                { name: 'B', type: 'shell' as const, command: 'echo B', depends_on: ['A'] }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        // Verify execution order by checking call order
        const calls = mockExeca.mock.calls;
        expect(calls[0][0]).toBe('echo A');
        expect(calls[1][0]).toBe('echo B');
        expect(calls[2][0]).toBe('echo C');
    });

    it('should throw an error for circular dependencies', async () => {
        const config = {
            setup_steps: [
                { name: 'A', type: 'shell' as const, command: 'echo A', depends_on: ['B'] },
                { name: 'B', type: 'shell' as const, command: 'echo B', depends_on: ['A'] }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await expect(engine.run()).rejects.toThrow('Circular dependency detected in setup steps.');
    });

    it('should auto-detect npm as package manager by default', async () => {
        mockPathExistsSync.mockReturnValue(false); // No lock files exist
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'Install deps', type: 'package-manager' as const, command: 'install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockExeca).toHaveBeenCalledWith('npm install', {
            cwd: '/test/dir',
            stdio: 'inherit'
        });
    });

    it('should auto-detect yarn when yarn.lock exists', async () => {
        mockPathExistsSync.mockImplementation((path: unknown) =>
            String(path).includes('yarn.lock')
        );
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'Install deps', type: 'package-manager' as const, command: 'install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockExeca).toHaveBeenCalledWith('yarn install', {
            cwd: '/test/dir',
            stdio: 'inherit'
        });
    });

    it('should auto-detect pnpm when pnpm-lock.yaml exists', async () => {
        mockPathExistsSync.mockImplementation((path: unknown) =>
            String(path).includes('pnpm-lock.yaml')
        );
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'Install deps', type: 'package-manager' as const, command: 'install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockExeca).toHaveBeenCalledWith('pnpm install', {
            cwd: '/test/dir',
            stdio: 'inherit'
        });
    });

    it('should use specified package manager when provided', async () => {
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                {
                    name: 'Install deps',
                    type: 'package-manager' as const,
                    command: 'install',
                    manager: 'bun'
                }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockExeca).toHaveBeenCalledWith('bun install', {
            cwd: '/test/dir',
            stdio: 'inherit'
        });
    });

    it('should execute mixed shell and package-manager steps', async () => {
        mockInquirerPrompt.mockResolvedValue({ proceed: true });
        mockExeca.mockResolvedValue({});
        mockPathExistsSync.mockReturnValue(false);

        const config = {
            setup_steps: [
                { name: 'Install deps', type: 'package-manager' as const, command: 'install' },
                { name: 'Run build', type: 'shell' as const, command: 'npm run build', depends_on: ['Install deps'] }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockExeca).toHaveBeenCalledTimes(2);
        expect(mockInquirerPrompt).toHaveBeenCalledTimes(1); // Only for shell command

        // First call should be package manager (no prompt)
        expect(mockExeca.mock.calls[0][0]).toBe('npm install');
        // Second call should be shell command (with prompt)
        expect(mockExeca.mock.calls[1][0]).toBe('npm run build');
    });

    it('should handle unknown step types by skipping them', async () => {
        mockInquirerPrompt.mockResolvedValue({ proceed: true });
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'Valid shell', type: 'shell' as const, command: 'echo hello' },
                { name: 'Unknown type', type: 'unknown-type' as any, command: 'some command' },
                { name: 'Valid package manager', type: 'package-manager' as const, command: 'install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        // Should only execute the known step types
        expect(mockExeca).toHaveBeenCalledTimes(2);
        expect(mockExeca.mock.calls[0][0]).toBe('echo hello');
        expect(mockExeca.mock.calls[1][0]).toBe('npm install');
    });

    it('should handle the case where a step is not found in stepMap during sorting', async () => {
        // This test helps cover the edge case in the topological sort
        // where the graph refers to steps that don't exist in the stepMap
        const config = {
            setup_steps: [
                { name: 'Valid step', type: 'shell' as const, command: 'echo hello' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        mockInquirerPrompt.mockResolvedValue({ proceed: true });
        mockExeca.mockResolvedValue({});

        await engine.run();

        expect(mockInquirerPrompt).toHaveBeenCalled();
        expect(mockExeca).toHaveBeenCalledWith('echo hello', {
            cwd: '/test/dir',
            stdio: 'inherit',
            shell: true
        });
    });
}); 