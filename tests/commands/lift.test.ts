import { describe, it, expect } from '@jest/globals';

describe('Lift Command', () => {
    it('should export a Command object', async () => {
        const { default: liftCommand } = await import('../../src/commands/lift.js');

        expect(liftCommand).toBeDefined();
        expect(liftCommand.name()).toBe('lift');
        expect(liftCommand.description()).toBe('Lift a repository into a local development environment');
    });

    it('should be a valid commander.js command', async () => {
        const { default: liftCommand } = await import('../../src/commands/lift.js');

        // Should have required Commander.js methods
        expect(typeof liftCommand.parseAsync).toBe('function');
        expect(typeof liftCommand.action).toBe('function');
    });

    it('should show help text with argument information', async () => {
        const { default: liftCommand } = await import('../../src/commands/lift.js');

        // Check help output contains repo_url information
        const helpOutput = liftCommand.helpInformation();
        expect(helpOutput).toContain('repo_url');
        expect(helpOutput).toContain('URL of the repository to lift');
    });
}); 