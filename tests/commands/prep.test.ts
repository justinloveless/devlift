import { describe, it, expect } from '@jest/globals';

describe('Prep Command', () => {
    it('should export a Command object', async () => {
        const { default: prepCommand } = await import('../../src/commands/prep.js');

        expect(prepCommand).toBeDefined();
        expect(prepCommand.name()).toBe('prep');
        expect(prepCommand.description()).toBe('Prepare a new dev.yml configuration file for the current project');
    });

    it('should be a valid commander.js command', async () => {
        const { default: prepCommand } = await import('../../src/commands/prep.js');

        // Should have required Commander.js methods
        expect(typeof prepCommand.parseAsync).toBe('function');
        expect(typeof prepCommand.action).toBe('function');
    });
}); 