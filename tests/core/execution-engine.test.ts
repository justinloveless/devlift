import { describe, it, expect } from '@jest/globals';

describe('ExecutionEngine', () => {
    it('should create an ExecutionEngine instance', async () => {
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');

        const config = { version: '1', setup_steps: [] };
        const engine = new ExecutionEngine(config, '/test/dir');

        expect(engine).toBeDefined();
        expect(typeof engine.run).toBe('function');
    });

    it('should do nothing if no setup steps are provided', async () => {
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');

        const config = {};
        const engine = new ExecutionEngine(config, '/test/dir');

        // Should not throw when running with empty config
        await expect(engine.run()).resolves.not.toThrow();
    });

    it('should throw an error for a circular dependency', async () => {
        const { ExecutionEngine } = await import('../../src/core/execution-engine.js');

        const config = {
            setup_steps: [
                { name: 'A', type: 'shell' as const, command: 'echo A', depends_on: ['B'] },
                { name: 'B', type: 'shell' as const, command: 'echo B', depends_on: ['A'] }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await expect(engine.run()).rejects.toThrow('Circular dependency detected in setup steps.');
    });
}); 