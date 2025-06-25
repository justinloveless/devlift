import path from 'path';
import { jest, describe, it, expect } from '@jest/globals';

jest.unstable_mockModule('os', () => ({
    homedir: () => '/mock/home',
}));

jest.unstable_mockModule('fs-extra', () => ({
    default: {
        pathExistsSync: jest.fn(),
        readFileSync: jest.fn(),
    },
}));

describe('Clone Path Generator', () => {
    it('should generate the correct clone path from a Git URL', async () => {
        const { getClonePath } = await import('../../src/utils/path.js');

        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const expectedPath = path.join('/mock/home', 'dev-cli', 'clones', 'github.com', 'test-user', 'test-repo');

        const actualPath = getClonePath(repoUrl);
        expect(actualPath).toBe(expectedPath);
    });

    it('should use the base path from the global config if it exists', async () => {
        const { getClonePath } = await import('../../src/utils/path.js');
        const { default: fs } = await import('fs-extra');

        // Mock global config
        const config = { basePath: '/custom/dev/path' };
        fs.pathExistsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(config));

        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const expectedPath = path.join('/custom/dev/path', 'github.com', 'test-user', 'test-repo');

        const actualPath = getClonePath(repoUrl);
        expect(actualPath).toBe(expectedPath);
    });
}); 