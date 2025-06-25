import { getClonePath } from '../../src/utils/path.js';
import { describe, it, expect } from '@jest/globals';
import path from 'path';

describe('getClonePath', () => {
    it('should generate a clone path for HTTPS URLs', () => {
        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const actualPath = getClonePath(repoUrl);

        // Should contain the normalized repo path (using path.join for cross-platform)
        expect(actualPath).toContain(path.join('github.com', 'test-user', 'test-repo'));
        expect(actualPath).toContain(path.join('devlift', 'clones'));
    });

    it('should handle URLs without .git extension', () => {
        const repoUrl = 'https://github.com/test-user/test-repo';
        const actualPath = getClonePath(repoUrl);

        expect(actualPath).toContain(path.join('github.com', 'test-user', 'test-repo'));
    });

    it('should handle SSH URLs', () => {
        const repoUrl = 'git@github.com:test-user/test-repo.git';
        const actualPath = getClonePath(repoUrl);

        expect(actualPath).toContain(path.join('github.com', 'test-user', 'test-repo'));
    });
}); 