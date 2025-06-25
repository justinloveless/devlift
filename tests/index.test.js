import { exec } from 'child_process';
import pkg from '../package.json' with { type: 'json' };

describe('CLI Tool', () => {
    it('should return the correct version', (done) => {
        exec('node src/index.js --version', (error, stdout, stderr) => {
            expect(error).toBeNull();
            expect(stdout.trim()).toBe(pkg.version);
            done();
        });
    });
}); 