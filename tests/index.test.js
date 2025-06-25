import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf-8'));

describe('CLI Tool', () => {
    it('should return the correct version', (done) => {
        exec('node src/index.js --version', (error, stdout, stderr) => {
            expect(error).toBeNull();
            expect(stdout.trim()).toBe(pkg.version);
            done();
        });
    });
}); 