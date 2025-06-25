import { exec } from 'child_process';

describe('CLI Integration Test', () => {
    it('should run the dev command and display help output', (done) => {
        exec('node src/index.js --help', (error, stdout, stderr) => {
            expect(error).toBeNull();
            // Check for the presence of the main commands in the help output
            expect(stdout).toContain('lift');
            expect(stdout).toContain('prep');
            expect(stdout).toContain('help');
            done();
        });
    });
}); 