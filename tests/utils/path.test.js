import path from 'path';
import { jest, describe, it, expect } from '@jest/globals';

jest.unstable_mockModule('os', () => ({
    homedir: () => '/mock/home',
}));

describe('Clone Path Generator', () => {
    it('should generate the correct clone path from a Git URL', async () => {
        const { getClonePath } = await import('../../src/utils/path.js');

        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const expectedPath = path.join('/mock/home', 'dev-cli', 'clones', 'github.com', 'test-user', 'test-repo');

        const actualPath = getClonePath(repoUrl);
        expect(actualPath).toBe(expectedPath);
    });
}); 